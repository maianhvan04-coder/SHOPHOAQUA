const mongoose = require("mongoose")
const ApiError = require("../../../../core/ApiError")
const httpStatus = require("../../../../core/httpStatus")
const rbacRepo = require("./rbac.repo")


exports.buildAuthz = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;

    const user = await rbacRepo.findUserAuthMeta(userId);
    if (!user || user.isDeleted || user.isActive === false) return null;

    // =====================
    // 1️⃣ LOAD ROLES
    // =====================
    const urLinks = await rbacRepo.findUserRoleLinks(userId);
    const roleIds = urLinks.map((x) => x.roleId);

    const roles = roleIds.length
        ? await rbacRepo.findRolesByIds(roleIds)
        : [];

    const activeRoles = roles.filter((r) => r?.isActive !== false);
    const roleCodes = activeRoles.map((r) => r.code);

    // =====================
    // 2️⃣ ROLE → ROLE_PERMISSION
    // =====================
    const rpLinks = activeRoles.length
        ? await rbacRepo.findRolePermissionLinksByRoleIds(
            activeRoles.map((r) => r._id)
        )
        : [];

    // =====================
    // 3️⃣ BUILD PERMISSION MAP
    // =====================
    // permissions: { [permissionKey]: { scope, field } }
    const permissions = {};

    for (const rp of rpLinks) {
        const key = rp.permissionKey;
        if (!key) continue;

        const incoming = {
            scope: rp.scope || "all",
            field: rp.scope === "own" ? rp.field || "createdBy" : null,
        };

        const existing = permissions[key];

        if (!existing) {
            permissions[key] = incoming;
            continue;
        }

        // nâng quyền: own + all => all
        if (existing.scope === "own" && incoming.scope === "all") {
            permissions[key] = { scope: "all", field: null };
        }
    }

    // =====================
    // 4️⃣ ADMIN FULL ACCESS
    // =====================
    if (roleCodes.includes("ADMIN")) {
        const allPermKeys = await rbacRepo.findAllPermissions();
        for (const key of allPermKeys) {
            permissions[key] = { scope: "all", field: null };
        }
    }

    // =====================
    // 5️⃣ USER OVERRIDES
    // =====================
    const overrides = await rbacRepo.findOverridesByUserId(userId);

    for (const ov of overrides) {
        const key = ov.permissionKey;
        if (!key) continue;

        if (ov.effect === "DENY") {
            delete permissions[key];
            continue;
        }

        if (ov.effect === "ALLOW") {
            const incoming = {
                scope: ov.scope || "all",
                field: ov.scope === "own" ? ov.field || "createdBy" : null,
            };

            const existing = permissions[key];

            if (!existing) {
                permissions[key] = incoming;
                continue;
            }

            if (existing.scope === "own" && incoming.scope === "all") {
                permissions[key] = { scope: "all", field: null };
            }
        }
    }

    // =====================
    // 6️⃣ PRIMARY ROLE (UI)
    // =====================
    const primaryRole = activeRoles.reduce((best, r) => {
        if (!best) return r;
        return (r.priority || 0) > (best.priority || 0) ? r : best;
    }, null);

    return {
        userId: user._id.toString(),
        authzVersion: user.authzVersion || 0,

        roles: roleCodes,

        // 🔥 QUAN TRỌNG
        permissions, // { product:update: { scope, field } }

        userType: user.type, // internal | client

        primaryRole: primaryRole
            ? { code: primaryRole.code, type: primaryRole.type }
            : null,
    };
};





// ===== Admin RBAC APIs =====

exports.listRoles = () => rbacRepo.findAllRoles();
exports.listPermissions = () => rbacRepo.findAllPermissions();

exports.syncAdminAllPermissions = async () => {
    const role = await rbacRepo.findRoleByCode("ADMIN");
    if (!role) throw new ApiError(httpStatus.NOT_FOUND, "Role ADMIN không tồn tại");

    const permDocs = await rbacRepo.findAllActivePermissionIds();
    const permIds = permDocs.map((p) => p._id);

    await rbacRepo.replaceRolePermissions(role._id, permIds);

    // bump authzVersion cho tất cả user đang có ADMIN role
    const ur = await rbacRepo.findUserRoleLinksByRoleId(role._id);
    const userIds = ur.map((x) => x.userId);
    await rbacRepo.bumpUsersAuthzVersion(userIds);

    return { role: "ADMIN", permissions: permIds.length };
};

exports.getRolePermissions = async (roleCode) => {
    if (!roleCode) throw new ApiError(httpStatus.BAD_REQUEST, "Thiếu roleCode");

    const role = await rbacRepo.findRoleByCode(roleCode);
    if (!role) throw new ApiError(httpStatus.NOT_FOUND, "Role không tồn tại");

    const RolePerms = await rbacRepo.findRolePermissionIdsByRoleId(role._id);




    const usersCount = await rbacRepo.countUsersByRoleId(role._id)
    return {
        role: role.code,
        usersCount,
        permissionKeys: RolePerms.map((p) => ({
            key: p.permissionKey,
            scope: p.scope || "all",
            field: p.field || null,
        })),
    };
};


exports.setRolePermissions = async (roleCode, permissions = []) => {
    if (!roleCode) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Thiếu roleCode");
    }

    // 🔒 khóa ADMIN
    // if (roleCode.trim().toUpperCase() === "ADMIN") {
    //     throw new ApiError(
    //         httpStatus.FORBIDDEN,
    //         "Không được chỉnh quyền của ADMIN"
    //     );
    // }

    if (!Array.isArray(permissions)) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "permissions phải là mảng"
        );
    }

    const role = await rbacRepo.findRoleByCode(roleCode);
    if (!role) {
        throw new ApiError(httpStatus.NOT_FOUND, "Role không tồn tại");
    }

    // =========================
    // 1️⃣ Validate permissionKey
    // =========================
    const keys = permissions
        .map(p => p?.key)
        .filter(
            k =>
                typeof k === 'string' &&
                k.trim() !== '' &&
                k !== 'null' &&
                k !== 'undefined'
        );



    const permDocs = await rbacRepo.findPermissionsByKeys(keys);
    console.log("Keys", keys)
    console.log("Keys", permDocs)
    if (permDocs.length !== keys.length) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Có permissionKey không hợp lệ"
        );
    }

    // =========================
    // 2️⃣ Chuẩn hoá permissions
    // =========================
    const docs = permissions.map(p => {
        const scope = p.scope || "all";

        if (scope === "own" && !p.field) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Permission ${p.key} scope=own cần field`
            );
        }

        return {
            roleId: role._id,
            permissionKey: p.key,
            scope,
            field: scope === "own" ? (p.field || "createdBy") : null,
        };
    });

    // =========================
    // 3️⃣ Replace role permissions
    // =========================
    await rbacRepo.replaceRolePermissions(role._id, docs);

    // =========================
    // 4️⃣ Bump authzVersion
    // =========================
    const ur = await rbacRepo.findUserRoleLinksByRoleId(role._id);
    const userIds = ur.map(x => x.userId).filter(Boolean);

    if (userIds.length) {
        await rbacRepo.bumpUsersAuthzVersion(userIds);
    }

    return {
        role: role.code,
        permissions: docs.map(d => ({
            key: d.permissionKey,
            scope: d.scope,
            field: d.field,
        })),
    };
};



exports.setUserRoles = async (userId, roleCodes) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "userId không hợp lệ");
    }

    const user = await rbacRepo.findUserAuthMeta(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User không tồn tại");

    const codes = roleCodes || [];
    const roles = await rbacRepo.findRolesByCodes(codes);

    if (codes.length !== roles.length) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Có roleCode không hợp lệ");
    }

    await rbacRepo.replaceUserRoles(userId, roles.map((r) => r._id));

    const INTERNAL_ROLE_TYPES = ["owner", "manager", "staff", "shipper"];

    const hasInternalRole = roles.some((r) =>
        INTERNAL_ROLE_TYPES.includes(r.type)
    );

    if (hasInternalRole && user.type !== "internal") {
        await rbacRepo.updateUserType(userId, "internal");
    }

    if (!hasInternalRole && user.type === "internal") {
        await rbacRepo.updateUserType(userId, "client");
    }

    await rbacRepo.bumpUserAuthzVersion(userId);

    return { userId: userId.toString(), roles: roles.map((r) => r.code) };
};

exports.setUserPermissionOverride = async (userId, permissionKey, effect) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "userId không hợp lệ");
    }

    const user = await rbacRepo.findUserAuthMeta(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User không tồn tại");

    const perm = await rbacRepo.findPermissionByKey(permissionKey);
    if (!perm) throw new ApiError(httpStatus.BAD_REQUEST, "permissionKey không hợp lệ");

    if (!["ALLOW", "DENY"].includes(effect)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "effect phải là ALLOW hoặc DENY");
    }

    await rbacRepo.upsertUserOverride(userId, perm._id, effect);
    await rbacRepo.bumpUserAuthzVersion(userId);

    return { userId: userId.toString(), permission: perm.key, effect };
};

exports.removeUserPermissionOverride = async (userId, permissionKey) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "userId không hợp lệ");
    }

    const perm = await rbacRepo.findPermissionByKey(permissionKey);
    if (!perm) throw new ApiError(httpStatus.BAD_REQUEST, "permissionKey không hợp lệ");

    await rbacRepo.deleteUserOverride(userId, perm._id);
    await rbacRepo.bumpUserAuthzVersion(userId);

    return { ok: true };
};
