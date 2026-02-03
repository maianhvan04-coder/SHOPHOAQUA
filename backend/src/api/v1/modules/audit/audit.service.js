const mongoose = require("mongoose");
const UAParser = require("ua-parser-js");

const auditRepo = require("./audit.repo");
const AuditLog = require("./audit.model"); // 🔥 THIẾU DÒNG NÀY
const productRepo = require("../product/repositories/product.repo.js");
const ApiError = require("../../../../core/apiError");
const httpStatus = require("../../../../core/httpStatus");

const { buildRollbackPayload } = require("./audit.rollback");

const {
    parsePagination,
    parseBoolean,
} = require("../../../../helpers/query.util.js.js");
/**
 * Ghi audit log
 * @param {Object} payload
 */
function mapRiskLevel(action, meta = {}) {
    if (action === "login_failed") {
        if (meta.blocked) return "critical";
        if ((meta.failCount ?? 0) >= 5) return "high";
        if ((meta.failCount ?? 0) >= 3) return "medium";
        return "low";
    }
    return "low";
}

function mapMeta(action, meta = {}) {
    if (action === "login_success") {
        return {
            email: meta.email ?? null,
            method: meta.method ?? "password",
        };
    }

    // login_failed
    return {
        email: meta.email ?? null,
        reason: meta.reason ?? null,
        failCount: meta.failCount ?? 0,
        window: meta.window ?? "5m",
        blocked: Boolean(meta.blocked),
        alerts: Array.isArray(meta.alerts) ? meta.alerts : [],
    };
}





exports.logAudit = async ({
    actorId,
    actorRoles = [],
    resource,
    action,
    resourceId,
    changes = {},
    req,
}) => {

    if (!resource || !action) return;
    const rawUA = req?.headers?.["user-agent"];
    const parser = new UAParser(rawUA);
    const ua = parser.getResult();
    try {
        await AuditLog.create({
            actorId,
            actorRoles,
            resource,
            action,
            resourceId,
            changes,
            ip: req?.ip,
            // structured (dễ đọc)
            userAgent: {
                browser: {
                    name: ua.browser.name,
                    version: ua.browser.version,
                },
                os: {
                    name: ua.os.name,
                    version: ua.os.version,
                },
                device: {
                    type: ua.device.type || "desktop",
                    vendor: ua.device.vendor,
                    model: ua.device.model,
                },
                engine: {
                    name: ua.engine.name,
                    version: ua.engine.version,
                },
            },
        });
    } catch (err) {
        // audit không được làm sập request chính
        console.error("AUDIT_LOG_ERROR:", err);
    }
};

exports.getProductAudit = async ({ resource, resourceId }) => {
    return auditRepo.findById({
        resource,
        resourceId,
    });
};


exports.getProductHistory = async ({ productId, user, query }) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "productId không hợp lệ");
    }

    const product = await productRepo
        .findByIdAdmin(productId)
        .select("_id name createdBy")
        .lean();

    if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "Không tìm thấy sản phẩm");
    }

    // RBAC product:read
    const authz = user.permissions?.["product:read"];
    if (!authz) {
        throw new ApiError(httpStatus.FORBIDDEN, "Không có quyền xem sản phẩm");
    }

    if (authz.scope === "own") {
        if (String(product.createdBy) !== String(user.sub)) {
            throw new ApiError(httpStatus.FORBIDDEN, "Không có quyền xem lịch sử sản phẩm này");
        }
    }

    const { page, limit, skip } = parsePagination(query);

    const filter = {
        resource: "product",
        resourceId: product._id,
    };

    const [items, total] = await Promise.all([
        auditRepo.find({ filter, skip, limit }),
        auditRepo.count({ filter }),
    ]);

    return {
        product,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        items,
    };
};


exports.getProductAuditList = async ({ user, query }) => {
    const limit = Math.min(Number(query.limit || 20), 50);

    const {
        productId,
        action,
        actorId,
        before,

        // 🔥 filters mới
        search,
        role,
        fromDate,
        toDate,
    } = query;

    const isAdmin =
        user.roles?.includes("ADMIN") ||
        user.roles?.includes("MANAGER");

    const filter = {
        resource: "product",
    };

    /* =======================
     * BASIC FILTERS
     * ======================= */

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        filter.resourceId = productId;
    }

    if (action) {
        filter.action = action;
    }

    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
        filter.actorId = actorId;
    }

    /* =======================
     * 🔍 SEARCH (name / email)
     * ======================= */
    if (search) {
        filter.$or = [
            { "actorId.fullName": { $regex: search, $options: "i" } },
            { "actorId.email": { $regex: search, $options: "i" } },
        ];
    }

    /* =======================
     * 🎭 ROLE
     * ======================= */
    if (role) {
        filter.actorRoles = role;
    }

    /* =======================
     * 📅 DATE RANGE
     * ======================= */
    if (fromDate || toDate) {
        filter.createdAt = {};

        if (fromDate) {
            const from = new Date(fromDate);
            if (!isNaN(from)) {
                filter.createdAt.$gte = from;
            }
        }

        if (toDate) {
            const to = new Date(`${toDate}T23:59:59.999Z`);
            if (!isNaN(to)) {
                filter.createdAt.$lte = to;
            }
        }
    }

    /* =======================
     * ⏱ CURSOR (Chrome-style)
     * ======================= */
    if (before) {
        const beforeDate = new Date(before);
        if (!isNaN(beforeDate)) {
            filter.createdAt = {
                ...(filter.createdAt || {}),
                $lt: beforeDate,
            };
        }
    }

    /* =======================
     * 🔒 PERMISSION
     * ======================= */
    if (!isAdmin) {
        if (!mongoose.Types.ObjectId.isValid(user.sub)) {
            throw new ApiError(400, "UserId không hợp lệ");
        }

        const myProducts = await productRepo.findByCreatedBy(user.sub);

        filter.resourceId = {
            $in: myProducts.map((p) => p._id),
        };
    }

    /* =======================
     * QUERY DB
     * ======================= */
    const items = await auditRepo.find({
        filter,
        limit,
    });

    const nextCursor =
        items.length > 0
            ? items[items.length - 1].createdAt
            : null;

    return {
        items,
        nextCursor,
    };
};



exports.getProductAuditDetail = async ({
    auditId,
    userId,
    roles,
    permissions,
}) => {
    if (!mongoose.Types.ObjectId.isValid(auditId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "auditId không hợp lệ");
    }

    const audit = await auditRepo.findProductAuditById(auditId);
    if (!audit) {
        throw new ApiError(httpStatus.NOT_FOUND, "Audit không tồn tại");
    }

    if (audit.resource !== "product") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Audit không phải product");
    }

    // =====================
    // 🔐 RBAC
    // =====================
    const canReadAudit = permissions?.["audit:product:read"];
    if (!canReadAudit) {
        throw new ApiError(httpStatus.FORBIDDEN, "Không có quyền xem audit");
    }

    const isAdmin =
        roles.includes("ADMIN") || roles.includes("MANAGER");

    // STAFF: chỉ xem audit của sản phẩm do mình tạo
    if (!isAdmin && canReadAudit.scope === "own") {
        const createdBy =
            audit?.changes?.after?.createdBy ||
            audit?.changes?.before?.createdBy;

        if (String(createdBy) !== String(userId)) {
            throw new ApiError(
                httpStatus.FORBIDDEN,
                "Chỉ được xem audit sản phẩm của mình"
            );
        }
    }

    return audit;
};

exports.getSecurityAuditList = async ({ user, query }) => {
    const limit = Math.min(Number(query.limit || 20), 50);

    const {
        action,     // login_success | login_failed
        actorId,    // userId
        role,       // ADMIN | STAFF
        search,     // email | fullName
        fromDate,
        toDate,
        before,     // cursor
        riskLevel,  // high | medium | low
    } = query;

    const isAdmin =
        user.roles?.includes("ADMIN") ||
        user.roles?.includes("MANAGER");

    const filter = {
        resource: "security",
    };

    /* =======================
     * ACTION
     * ======================= */
    if (action) {
        filter.action = action;
    }

    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
        filter.actorId = actorId;
    }


    if (role) {
        filter.actorRoles = role;
    }


    if (search) {
        filter.$or = [
            { "changes.meta.email": { $regex: search, $options: "i" } },
            { "actorId.fullName": { $regex: search, $options: "i" } },
            { "actorId.email": { $regex: search, $options: "i" } },
        ];
    }

    if (fromDate || toDate) {
        filter.createdAt = {};

        if (fromDate) {
            const from = new Date(fromDate);
            if (!isNaN(from)) filter.createdAt.$gte = from;
        }

        if (toDate) {
            const to = new Date(`${toDate}T23:59:59.999Z`);
            if (!isNaN(to)) filter.createdAt.$lte = to;
        }
    }

    /* =======================
     * CURSOR (Chrome-style)
     * ======================= */
    if (before) {
        const beforeDate = new Date(before);
        if (!isNaN(beforeDate)) {
            filter.createdAt = {
                ...(filter.createdAt || {}),
                $lt: beforeDate,
            };
        }
    }


    if (!isAdmin) {
        if (!mongoose.Types.ObjectId.isValid(user.sub)) {
            throw new ApiError(400, "UserId không hợp lệ");
        }

        // Non-admin chỉ xem log của chính mình
        filter.actorId = user.sub;
    }


    const rawItems = await auditRepo.find({
        filter,
        limit,
    });

    let items = rawItems.map(item => {
        const meta = item.changes?.meta || {};

        return {
            _id: item._id,
            resource: item.resource,
            action: item.action,

            riskLevel: mapRiskLevel(item.action, meta),

            actorId: item.actorId
                ? {
                    _id: item.actorId._id,
                    fullName: item.actorId.fullName,
                    email: item.actorId.email,
                }
                : null,

            changes: {
                meta: mapMeta(item.action, meta),
            },

            ip: item.ip,

            userAgent: {
                device: {
                    type: item.userAgent?.device?.type ?? "desktop",
                },
            },

            createdAt: item.createdAt,
        };
    });

    if (riskLevel) {
        items = items.filter(item => item.riskLevel === riskLevel);
    }


    const nextCursor =
        items.length > 0
            ? items[items.length - 1].createdAt
            : null;

    return {
        items,
        nextCursor,
    };
};


exports.rollback = async ({ auditId, user, resourceService }) => {
    const audit = await AuditLog.findById(auditId).lean();
    if (!audit) throw new ApiError(404, "Audit không tồn tại");

    if (!user.permissions?.["audit:product:rollback"]) {
        throw new ApiError(403, "Không có quyền rollback");
    }

    // build payload theo policy
    const payload = buildRollbackPayload({ audit });

    // gọi service của resource
    const updated = await resourceService.rollbackById(
        audit.resourceId,
        payload,
        user
    );

    // ghi audit rollback
    await AuditLog.create({
        actorId: user.sub,
        actorRoles: user.roles,
        resource: audit.resource,
        action: "rollback",
        resourceId: audit.resourceId,
        rollbackOf: audit._id,
        changes: {
            before: audit.changes.after,
            after: payload,
        },
    });

    return updated;
};


