// src/api/v1/modules/payment/services/paymentTransaction.service.js

const mongoose = require("mongoose");
const repo = require("../repos/paymentTransaction.repo");

function toDateOrNull(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toEndOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function ensureOid(id, name = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`${name} không hợp lệ`);
    err.statusCode = 400;
    throw err;
  }
  return id;
}

/**
 * Ghi PAYMENT SUCCESS (idempotent)
 * - COD: gọi khi Delivered + isPaid=true
 * - Online: gọi khi gateway success
 */
module.exports.upsertSuccessPayment = async (payload) => {
  const {
    orderId,
    userId,
    staffId,
    method = "COD",
    amount,
    transactionId,
    paidAt,
    note,
    meta,
    client,
    session,
  } = payload;

  ensureOid(orderId, "orderId");
  ensureOid(userId, "userId");
  if (staffId) ensureOid(staffId, "staffId");

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) {
    const err = new Error("amount không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const doc = {
    order: repo.toObjectId(orderId),
    user: repo.toObjectId(userId),
    staff: staffId ? repo.toObjectId(staffId) : null,

    type: "PAYMENT",
    status: "SUCCESS",

    method,
    amount: amt,
    currency: "VND",

    transactionId: transactionId || null,
    paidAt: paidAt ? new Date(paidAt) : new Date(),

    client: {
      ip: client?.ip || "",
      userAgent: client?.userAgent || "",
      deviceId: client?.deviceId || "",
    },

    note: note || "",
    meta: meta || {},
  };

  const filter = transactionId
    ? { transactionId }
    : { order: doc.order, type: "PAYMENT", status: "SUCCESS" };

  return repo.upsertOne(filter, doc, { session });
};

/**
 * Admin list lịch sử thanh toán:
 * - user mua: PaymentTx.user
 * - người thao tác: PaymentTx.staff
 * - staff quản lí + shipper giao: từ Order (populate sâu)
 * - thiết bị thao tác: PaymentTx.client
 */
module.exports.listAdmin = async (q = {}) => {
  const {
    from,
    to,
    status,
    method,
    userId,
    orderId,
    transactionId,
    staffId,

    type = "PAYMENT",
    dateField = "paidAt",

    page = 1,
    limit = 20,
  } = q;

  const filter = { type };

  const fromD = from ? toDateOrNull(from) : null;
  const toD = to ? toEndOfDay(toDateOrNull(to)) : null;

  if (fromD || toD) {
    const field = dateField === "createdAt" ? "createdAt" : "paidAt";
    filter[field] = {};
    if (fromD) filter[field].$gte = fromD;
    if (toD) filter[field].$lte = toD;
  }

  if (status) filter.status = String(status).trim();
  if (method) filter.method = String(method).trim();
  if (transactionId) filter.transactionId = String(transactionId).trim();

  if (userId) {
    ensureOid(userId, "userId");
    filter.user = repo.toObjectId(userId);
  }
  if (orderId) {
    ensureOid(orderId, "orderId");
    filter.order = repo.toObjectId(orderId);
  }
  if (staffId) {
    ensureOid(staffId, "staffId");
    filter.staff = repo.toObjectId(staffId);
  }

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(200, Math.max(1, Number(limit) || 20));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    repo.findMany({
      filter,
      sort: { paidAt: -1, createdAt: -1 },
      skip,
      limit: l,
      populate: [
        // ✅ user mua (tài khoản + tên)
        { path: "user", select: "_id fullName name email phone username" },

        // ✅ người thao tác/thu tiền (tài khoản + tên)
        { path: "staff", select: "_id fullName name email phone username" },

        // ✅ order + staff quản lí + shipper giao
        {
          path: "order",
          select: "_id orderCode totalPrice status staff shipper createdAt",
          populate: [
            { path: "staff", select: "_id fullName name email phone username" },
            { path: "shipper", select: "_id fullName name email phone username" },
          ],
        },
      ],
    }),
    repo.count(filter),
  ]);

  return { items, pagination: { page: p, limit: l, total } };
};

/**
 * User xem lịch sử của mình (optional)
 */
module.exports.listMy = async ({ userId, q = {} }) => {
  ensureOid(userId, "userId");

  const {
    from,
    to,
    status,
    method,
    dateField = "paidAt",
    page = 1,
    limit = 20,
  } = q;

  const filter = {
    user: repo.toObjectId(userId),
    type: "PAYMENT",
  };

  const fromD = from ? toDateOrNull(from) : null;
  const toD = to ? toEndOfDay(toDateOrNull(to)) : null;

  if (fromD || toD) {
    const field = dateField === "createdAt" ? "createdAt" : "paidAt";
    filter[field] = {};
    if (fromD) filter[field].$gte = fromD;
    if (toD) filter[field].$lte = toD;
  }

  if (status) filter.status = String(status).trim();
  if (method) filter.method = String(method).trim();

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    repo.findMany({
      filter,
      sort: { paidAt: -1, createdAt: -1 },
      skip,
      limit: l,
      populate: [
        { path: "order", select: "_id orderCode totalPrice status createdAt" },
        { path: "staff", select: "_id fullName name email phone username" },
      ],
    }),
    repo.count(filter),
  ]);

  return { items, pagination: { page: p, limit: l, total } };
};
