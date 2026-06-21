const userRepo = require("./user.repo")
const ApiError = require("../../../../core/ApiError");
const httpStatus = require("../../../../core/httpStatus");
const { uploadAvatarBuffer, destroyByPublicId } = require("../../../../helpers/cloudinary.helper")
const { ROLES } = require("../../../../constants/roles");
const { mongoose } = require("mongoose");
const Role = require("../rbac/model/role.model")
const UserRole = require("../rbac/model/UserRole.model");
const { hashPassword, comparePassword } = require("../../../../helpers/password.auth")
const authRepo = require("../auth/auth.repo");
const roleRepo = require("../rbac/repo/role.repo");
const userRoleRepo = require("../rbac/repo/userRole.repo");
const AuthProvider = require("./authProvider.model")


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^0\d{9}$/;
function normalizeIds(ids) {
  const unique = Array.from(new Set(ids || []))
  const valid = unique.filter((id) => mongoose.Types.ObjectId.isValid(id))
  return { unique, valid }
}
function normalizePhone(v) {
  let digits = String(v || "").replace(/\D/g, "");
  if (!digits) return "";

  // 84xxxxxxxxx -> 0xxxxxxxxx
  if (digits.startsWith("84")) digits = "0" + digits.slice(2);

  // chỉ nhận 0xxxxxxxxx (10 số)
  if (!PHONE_REGEX.test(digits)) return "";
  return digits;
}

function normalizeEmail(v) {
  const s = String(v || "").trim().toLowerCase();
  return s;
}

exports.getUsers = async (query) => {
  let { page = 1, limit = 5, search, role, isActive, isDeleted } = query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1 || limit > 100) limit = 10;

  // isActive là string từ query => convert
  if (isActive === "true") isActive = true;
  else if (isActive === "false") isActive = false;
  else isActive = undefined;

  // role nên ép đúng enum schema
  if (role) {
    role = role.toUpperCase();
    if (!Object.values(ROLES).includes(role)) {
      role = undefined; // hoặc throw lỗi nếu muốn chặt
    }
  } // USER/ADMIN

  const { users, total } = await userRepo.findUsers({
    page,
    limit,
    search,
    role,
    isActive,
    isDeleted
  });

  return {
    items: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}



exports.getAssignableRoles = async () => {
  // chỉ trả role active, và thường không cho UI gán ADMIN
  const roles = await Role.find({ isActive: true, code: { $ne: "ADMIN" } })
    .select("_id code name type priority")
    .sort({ priority: -1 })
    .lean();

  return roles;
};


exports.setUserRoles = async (userId, roleCodes, actorId = null) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "UserId không hợp lệ");
  }

  const clean = Array.from(new Set((roleCodes || []).map((x) => String(x).trim().toUpperCase())));
  if (!clean.length) throw new ApiError(httpStatus.BAD_REQUEST, "roleCodes không được rỗng");
  if (clean.includes("ADMIN")) throw new ApiError(httpStatus.FORBIDDEN, "Không cho gán ADMIN qua API");

  const user = await userRepo.findById(userId);
  if (!user || user.isDeleted) throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user");

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const roles = await userRepo.replaceUserRolesByCodes(
      { userId, roleCodes: clean },
      { session }
    );


    await userRepo.bumpAuthzVersion(userId, { session });

    await session.commitTransaction();

    return {
      userId,
      roleCodes: roles.map((r) => r.code),
      roles: roles.map((r) => ({
        _id: r._id,
        code: r.code,
        name: r.name,
        type: r.type,
        priority: r.priority,
      })),
    };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};

exports.deleteUser = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "UserId không hợp lệ");
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const userId = new mongoose.Types.ObjectId(id);

      // 1) Check user tồn tại
      const user = await userRepo.findById(userId, { session });
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user");
      }

      // 2) Chặn ADMIN (theo Role/UserRole)
      const adminRole = await Role.findOne({ code: "ADMIN", isDeleted: false })
        .select("_id")
        .lean()
        .session(session);

      if (adminRole?._id) {
        const isAdmin = await UserRole.exists({
          userId,
          roleId: adminRole._id,
          isDeleted: false,
        }).session(session);

        if (isAdmin) {
          throw new ApiError(httpStatus.FORBIDDEN, "Không thể xoá tài khoản ADMIN");
        }
      }

      // 3) Soft delete user
      await userRepo.softDeleteById(userId, { session });

      // 4) Soft delete userRole mappings
      await UserRole.updateMany(
        { userId, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { session }
      );

      return true;
    });
  } finally {
    session.endSession();
  }
};


exports.changeStatusMany = async (ids, isActive, actorId = null) => {

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "ids phải là mảng và không được rỗng");
  }
  if (typeof isActive !== "boolean") {
    throw new ApiError(httpStatus.BAD_REQUEST, "isActive phải là boolean");
  }

  const { unique, valid } = normalizeIds(ids)
  if (valid.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Không có userId hợp lệ");
  }


  const validWithoutSelf =
    actorId && mongoose.Types.ObjectId.isValid(actorId)
      ? valid.filter((id) => id !== actorId.toString())
      : valid;

  const metas = await userRepo.getAdminUserIdsInList(validWithoutSelf)

  const foundIds = new Set(metas.map((u) => u._id.toString()));
  const adminIds = metas.filter((u) => u.role === ROLES.ADMIN).map((u) => u._id.toString());
  const deletedIds = metas.filter((u) => u.isDeleted).map((u) => u._id.toString());

  // mục tiêu: tồn tại, chưa deleted, không admin
  const targetIds = metas
    .filter((u) => !u.isDeleted && u.role !== ROLES.ADMIN)
    .map((u) => u._id.toString());

  const updateRes =
    targetIds.length > 0 ? await userRepo.setActiveMany(targetIds, isActive) : { matchedCount: 0, modifiedCount: 0 };


  const notFoundCount = validWithoutSelf.filter((id) => !foundIds.has(id)).length;
  const selfSkipped = actorId ? valid.length - validWithoutSelf.length : 0;

  return {
    action: "SET_STATUS",
    requested: ids.length,
    unique: unique.length,
    valid: valid.length,
    found: metas.length,
    notFound: notFoundCount,
    skipped: {
      self: selfSkipped,
      admin: adminIds.length,
      deleted: deletedIds.length,
    },
    matchedCount: updateRes.matchedCount ?? updateRes.n ?? 0,
    modifiedCount: updateRes.modifiedCount ?? updateRes.nModified ?? 0,
  };
}

exports.softDeleteManyUsers = async (ids, actorId = null) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "ids phải là mảng và không được rỗng");
  }

  const { unique, valid } = normalizeIds(ids);
  if (valid.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Không có userId hợp lệ");
  }
  // (tuỳ chọn) tránh tự xoá mình
  const validWithoutSelf =
    actorId && mongoose.Types.ObjectId.isValid(actorId)
      ? valid.filter((id) => id !== actorId.toString())
      : valid;

  const metas = await userRepo.getAdminUserIdsInList(validWithoutSelf);
  const foundIds = new Set(metas.map((u) => u._id.toString()));

  const adminIds = metas.filter((u) => u.role === ROLES.ADMIN).map((u) => u._id.toString());
  const alreadyDeletedIds = metas.filter((u) => u.isDeleted).map((u) => u._id.toString());

  // mục tiêu: tồn tại, chưa deleted, không admin
  const targetIds = metas
    .filter((u) => !u.isDeleted && u.role !== ROLES.ADMIN)
    .map((u) => u._id.toString());

  const updateRes =
    targetIds.length > 0 ? await userRepo.softDeleteMany(targetIds) : { matchedCount: 0, modifiedCount: 0 };

  const notFoundCount = validWithoutSelf.filter((id) => !foundIds.has(id)).length;
  const selfSkipped = actorId ? valid.length - validWithoutSelf.length : 0;

  return {
    action: "SOFT_DELETE",
    requested: ids.length,
    unique: unique.length,
    valid: valid.length,
    found: metas.length,
    notFound: notFoundCount,
    skipped: {
      self: selfSkipped,
      admin: adminIds.length,
      alreadyDeleted: alreadyDeletedIds.length,
    },
    matchedCount: updateRes.matchedCount ?? updateRes.n ?? 0,
    modifiedCount: updateRes.modifiedCount ?? updateRes.nModified ?? 0,
  };
}

exports.updateMyAvatar = async (userId, file) => {
  if (!file?.buffer) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Thiếu file ảnh");
  }

  const user = await userRepo.findById(userId);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User không tồn tại");

  // Xoá ảnh cũ (nếu có) - fail thì bỏ qua để không làm hỏng request
  if (user.image?.publicId) {
    await destroyByPublicId(user.image.publicId).catch(() => { });
  }

  const uploaded = await uploadAvatarBuffer(file.buffer, userId);

  const updated = await userRepo.updateById(userId, {
    image: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    },
  });

  return updated.image;
};

const normEmail = (email = "") => String(email).trim().toLowerCase();

exports.createUserAdmin = async (payload) => {

  const fullName = String(payload.fullName || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = payload.phone ? String(payload.phone).replace(/\D/g, "").slice(0, 10) : "";
  const isActive = payload.isActive !== undefined ? !!payload.isActive : true;

  const roleCodes = Array.isArray(payload.roleCodes) ? payload.roleCodes : [];
  const password = String(payload.password || "");

  if (!fullName) throw new Error("fullName is required");
  if (!phone) throw new Error("phone is required");
  if (!email) throw new Error("email is required");
  if (!password || password.length < 6) throw new Error("password min 6 chars");
  if (roleCodes.includes("ADMIN")) throw new Error("Không cho gán ADMIN qua API");

  const finalRoleCodes = roleCodes.length ? roleCodes : ["USER"];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const exists = await userRepo.findByEmail(email, { session });
    if (exists) throw new Error("Email đã tồn tại");
    const phoneExits = await userRepo.findByPhone(phone, { session })
    if (phoneExits) throw new Error("Số điện thoại đã tồn tại");


    // 2) tạo User (KHÔNG lưu passwordHash ở đây)
    const user = await userRepo.createOne({ fullName, email, phone, isActive, type: "client" })

    // 3) tạo AuthProvider local để lưu passwordHash
    // providerId local = email
    const passwordHash = await hashPassword(password, 10);

    await authRepo.createAuthProvider({
      userId: user._id,
      provider: "local",
      providerId: email,
      email,
      passwordHash,
    })
    const roles = await userRepo.replaceUserRolesByCodes(
      { userId: user._id, roleCodes: finalRoleCodes },
      { session }
    );

    await session.commitTransaction();

    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: roles.map((r) => ({
        _id: r._id,
        code: r.code,
        name: r.name,
        type: r.type,
        priority: r.priority,
      })),
    };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};


exports.updateUserAdmin = async (userId, payload) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "UserId không hợp lệ");
  }

  // lấy user + roles hiện tại
  const current = await userRepo.findUserWithRolesById(userId);
  if (!current || current.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user");
  }

  // không cho sửa ADMIN
  const currentRoleCodes = (current.roles || []).map((r) => r.code).filter(Boolean);
  if (currentRoleCodes.includes("ADMIN")) {
    throw new ApiError(httpStatus.FORBIDDEN, "Không thể cập nhật tài khoản ADMIN");
  }

  /* ---------------- normalize payload ---------------- */
  const fullName =
    payload.fullName !== undefined ? String(payload.fullName || "").trim() : undefined;

  const email =
    payload.email !== undefined ? normalizeEmail(payload.email) : undefined;

  const phone =
    payload.phone !== undefined ? normalizePhone(payload.phone) : undefined;

  const isActive =
    payload.isActive !== undefined ? !!payload.isActive : undefined;

  // roleCodes: nếu client gửi [] => hiểu là reset về USER
  const roleCodes =
    payload.roleCodes !== undefined
      ? (Array.isArray(payload.roleCodes) ? payload.roleCodes.filter(Boolean) : [])
      : undefined;

  // password: nếu gửi "" => coi như không đổi
  const passwordRaw =
    payload.password !== undefined ? String(payload.password || "") : undefined;
  const password = passwordRaw !== undefined && passwordRaw.trim() !== "" ? passwordRaw : undefined;

  /* ---------------- validate nhẹ ---------------- */
  if (fullName !== undefined && !fullName) {
    throw new ApiError(httpStatus.BAD_REQUEST, "fullName không hợp lệ");
  }

  if (email !== undefined) {
    if (!email) throw new ApiError(httpStatus.BAD_REQUEST, "email không hợp lệ");
    if (!EMAIL_REGEX.test(email)) throw new ApiError(httpStatus.BAD_REQUEST, "email không đúng định dạng");
  }

  if (phone !== undefined) {
    if (!phone) throw new ApiError(httpStatus.BAD_REQUEST, "phone không hợp lệ (0xxxxxxxxx)");
  }

  if (password !== undefined && password.length < 6) {
    throw new ApiError(httpStatus.BAD_REQUEST, "password min 6 chars");
  }

  if (roleCodes !== undefined && roleCodes.includes("ADMIN")) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Không cho gán ADMIN qua API");
  }

  /* ---------------- build update user doc ---------------- */
  const updateUserDoc = {};
  if (fullName !== undefined) updateUserDoc.fullName = fullName;
  if (email !== undefined) updateUserDoc.email = email;
  if (phone !== undefined) updateUserDoc.phone = phone;
  if (isActive !== undefined) updateUserDoc.isActive = isActive;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /* --------- check unique email (User) --------- */
    if (email !== undefined && email !== current.email) {
      const existed = await userRepo.findByEmail(email, { session });
      if (existed && String(existed._id) !== String(userId)) {
        throw new ApiError(httpStatus.CONFLICT, "Email already exists");
      }
    }

    /* --------- check unique phone (User) --------- */
    if (phone !== undefined && phone !== (current.phone || "")) {
      const existedPhone = await userRepo.findByPhone(phone, { session });
      if (existedPhone && String(existedPhone._id) !== String(userId)) {
        throw new ApiError(httpStatus.CONFLICT, "Phone already exists");
      }
    }

    /* --------- nếu đổi email: sync AuthProvider local providerId/email --------- */
    if (email !== undefined && email !== current.email) {
      // tránh trùng providerId ở AuthProvider (unique index provider+providerId)
      const existedLocal = await AuthProvider.findOne({
        provider: "local",
        providerId: email,
        userId: { $ne: new mongoose.Types.ObjectId(userId) },
      }).session(session).lean();

      if (existedLocal) {
        throw new ApiError(httpStatus.CONFLICT, "Email already exists (auth provider)");
      }

      await AuthProvider.updateOne(
        { userId, provider: "local" },
        { $set: { providerId: email, email } },
        { session }
      );
    }

    /* --------- update user info --------- */
    if (Object.keys(updateUserDoc).length) {
      await userRepo.updateById(userId, updateUserDoc, { session });
    }

    /* --------- password: lưu vào AuthProvider (local) --------- */
    let passwordChanged = false;
    if (password !== undefined) {
      const finalEmail = email !== undefined ? email : (current.email || "");
      const passwordHash = await hashPassword(password, 10);

      const ap = await AuthProvider.findOne({ userId, provider: "local" })
        .session(session)
        .lean();

      if (ap) {
        await AuthProvider.updateOne(
          { _id: ap._id },
          { $set: { passwordHash, email: finalEmail, providerId: finalEmail } },
          { session }
        );
      } else {
        // user trước đó login Google/Facebook… giờ set mật khẩu local
        await AuthProvider.create(
          [
            {
              userId,
              provider: "local",
              providerId: finalEmail,
              email: finalEmail,
              passwordHash,
            },
          ],
          { session }
        );
      }

      passwordChanged = true;
    }

    let nextUserType = current.type;
    let needBumpAuthz = false;

    /* --------- replace roles + sync user.type --------- */
    if (roleCodes !== undefined) {
      const finalRoleCodes = roleCodes.length ? roleCodes : ["USER"];

      const newRoles = await userRepo.replaceUserRolesByCodes(
        { userId, roleCodes: finalRoleCodes },
        { session }
      );

      const INTERNAL_ROLE_TYPES = ["owner", "manager", "staff", "shipper"];
      const hasInternalRole = (newRoles || []).some((r) =>
        INTERNAL_ROLE_TYPES.includes(r.type)
      );

      nextUserType = hasInternalRole ? "internal" : "client";
      needBumpAuthz = true;
    }

    /* --------- bump authzVersion + update type nếu cần --------- */
    if (needBumpAuthz || passwordChanged) {
      await userRepo.updateById(
        userId,
        {
          authzVersion: (current.authzVersion || 0) + 1,
          ...(nextUserType !== current.type ? { type: nextUserType } : {}),
        },
        { session }
      );
    } else if (nextUserType !== current.type) {
      // nếu không bump mà type đổi (ít xảy ra), vẫn update type
      await userRepo.updateById(userId, { type: nextUserType }, { session });
    }

    await session.commitTransaction();

    const updated = await userRepo.findUserWithRolesById(userId);
    return updated;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};




const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};



exports.updateMyProfile = async (userId, body) => {  //profile
  // chỉ cho phép update các field này
  const payload = pick(body, ["fullName", "phone", "image", "addresses"]);

  // Validate nhẹ
  if (payload.fullName !== undefined) {
    payload.fullName = String(payload.fullName).trim();
    if (!payload.fullName) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Họ tên không hợp lệ");
    }
  }

  if (payload.phone !== undefined) {
    payload.phone = String(payload.phone).trim();
    if (!payload.phone) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Số điện thoại không hợp lệ");
    }

    // check trùng phone (trừ chính mình)
    const existed = await userRepo.findByPhone(payload.phone);
    if (existed && String(existed._id) !== String(userId)) {
      throw new ApiError(httpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
    }
  }

  //normalize image
  if (payload.image !== undefined) {
    payload.image = {
      url: payload.image?.url ? String(payload.image.url).trim() : "",
      publicId: payload.image?.publicId ? String(payload.image.publicId).trim() : "",
    };
  }

  //addresses: nếu muốn bắt buộc 1 default thì làm ở đây
  if (payload.addresses !== undefined) {
    if (!Array.isArray(payload.addresses)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "addresses phải là mảng");
    }

    // đảm bảo đúng schema
    payload.addresses = payload.addresses.map((a) => ({
      name: a?.name ? String(a.name).trim() : "",
      phone: a?.phone ? String(a.phone).trim() : "",
      street: a?.street ? String(a.street).trim() : "",
      ward: a?.ward ? String(a.ward).trim() : "",
      district: a?.district ? String(a.district).trim() : "",
      province: a?.province ? String(a.province).trim() : "",
      isDefault: !!a?.isDefault,
    }));

    // optional: ép chỉ 1 default
    const defaultCount = payload.addresses.filter((x) => x.isDefault).length;
    if (defaultCount > 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Chỉ được chọn 1 địa chỉ mặc định");
    }
  }

  const updated = await userRepo.updateById(userId, payload);
  if (!updated) {
    throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user");
  }

  // Không trả passwordHash
  const safe = await userRepo.findById(userId);
  return safe;
};



// restore

// helper validate
function ensureObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function uniqIds(ids) {
  const s = new Set((ids || []).map(String));
  return Array.from(s);
}

/**
 * Restore 1 user + userRole
 * @param {string} id
 * @param {{ restoreInactiveRoles?: boolean }} options
 */
exports.restoreUser = async (id, options = {}) => {
  const { restoreInactiveRoles = false } = options;

  if (!ensureObjectId(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "UserId không hợp lệ");
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const user = await userRepo.findById(id, { session }).lean();
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user");

    // Nếu bạn muốn chặn restore admin thì bật đoạn này
    // (tuỳ cấu trúc User: nếu có field role = 'ADMIN' hoặc roles[])
    // if (user.role === "ADMIN") throw new ApiError(httpStatus.FORBIDDEN, "Không thể restore ADMIN");

    const uRes = await userRepo.restoreById(id, { session });

    let urRes;
    if (restoreInactiveRoles) {
      urRes = await userRoleRepo.restoreManyByUserIds([id], { session });
    } else {
      const activeRoleIds = await roleRepo.findActiveRoleIds({ session });
      urRes = await userRoleRepo.restoreManyByUserIdsAndRoleIds([id], activeRoleIds, { session });
    }

    await session.commitTransaction();
    return {
      restoredUser: uRes?.modifiedCount || 0,
      restoredUserRoles: urRes?.modifiedCount || 0,
    };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};

/**
 * Restore nhiều user + userRole
 * @param {string[]} ids
 * @param {{ restoreInactiveRoles?: boolean }} options
 */
exports.restoreUsersMany = async (ids, options = {}) => {
  const { restoreInactiveRoles = false } = options;

  const cleanIds = uniqIds(ids);
  if (!cleanIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "ids phải là mảng và không được rỗng");
  }

  // validate all ids
  const invalid = cleanIds.filter((x) => !ensureObjectId(x));
  if (invalid.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, `UserId không hợp lệ: ${invalid.join(", ")}`);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const users = await userRepo.findManyByIds(cleanIds, { session }).lean();

    // có thể chọn: chỉ restore những user tồn tại
    const foundIds = users.map((u) => String(u._id));
    if (!foundIds.length) {
      throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user nào");
    }

    // Nếu muốn chặn ADMIN: lọc ra và báo lỗi hoặc bỏ qua
    // const hasAdmin = users.some((u) => u.role === "ADMIN");
    // if (hasAdmin) throw new ApiError(httpStatus.FORBIDDEN, "Danh sách có ADMIN, không được restore");

    const uRes = await userRepo.restoreManyByIds(foundIds, { session });

    let urRes;
    if (restoreInactiveRoles) {
      urRes = await userRoleRepo.restoreManyByUserIds(foundIds, { session });
    } else {
      const activeRoleIds = await roleRepo.findActiveRoleIds({ session });
      urRes = await userRoleRepo.restoreManyByUserIdsAndRoleIds(foundIds, activeRoleIds, { session });
    }

    await session.commitTransaction();

    return {
      requested: cleanIds.length,
      found: foundIds.length,
      restoredUsers: uRes?.modifiedCount || 0,
      restoredUserRoles: urRes?.modifiedCount || 0,
    };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
};

// đổi mk
exports.changeMyPassword = async (userId, oldPassword, newPassword) => {
  if (!oldPassword || !newPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Thiếu dữ liệu");
  }

  if (String(newPassword).length < 6) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Mật khẩu tối thiểu 6 ký tự");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng mật khẩu cũ");
  }

  const user = await userRepo.findByIdWithPassword(userId);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy user");

  const ok = await comparePassword(oldPassword, user.passwordHash);
  if (!ok) throw new ApiError(httpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");

  const passwordHash = await hashPassword(newPassword, 10);

  // ✅ đổi pass + vô hiệu hoá token cũ (nếu bạn có check authzVersion trong JWT middleware)
  await userRepo.updateById(userId, {
    passwordHash,
    authzVersion: (user.authzVersion || 0) + 1,
  });

  // hoặc dùng bumpAuthzVersion nếu bạn muốn tách riêng:
  // await userRepo.updateById(userId, { passwordHash });
  // await userRepo.bumpAuthzVersion(userId);

  return { ok: true };
};
