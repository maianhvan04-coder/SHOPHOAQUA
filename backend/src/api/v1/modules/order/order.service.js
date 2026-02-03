// modules/order/order.service.js

const mongoose = require("mongoose");
const Order = require("./order.model");
const Product = require("../product/models/product.model");

const dashboardReadService = require("../dashboard/service/dashboardRead.service");
const dashboardWriter = require("../dashboard/service/dashboardWriter.service");
const paymentTxService = require("../payment/services/paymentTransaction.service");

const {
  escapeRegex,
  ensureObjectId,
  runInTransaction,
  mapOrderStatusToEventType,
} = require("./helpers/orderCommon.helper");

const {
  reserveStockForOrder,
  releaseStockForOrder,
  increaseSoldForOrder,
} = require("./helpers/orderStock.helper");


// ====================== CUSTOMER ======================
module.exports.createOrderService = async (userId, data) => {
  const { orderItems, shippingAddress, paymentMethod, shippingPrice = 0, customerNote } = data;

  if (paymentMethod && paymentMethod !== "COD") {
    const err = new Error("Hiện shop chỉ hỗ trợ COD (thanh toán khi nhận hàng).");
    err.statusCode = 400;
    throw err;
  }

  if (!orderItems || orderItems.length === 0) {
    const err = new Error("Đơn hàng phải có ít nhất một sản phẩm.");
    err.statusCode = 400;
    throw err;
  }

  return runInTransaction(async (session) => {
    let itemsPrice = 0;
    const processedItems = [];

    for (const item of orderItems) {
      const qty = Number(item.quantity || 0);
      if (qty < 1) {
        const err = new Error("Số lượng sản phẩm phải >= 1.");
        err.statusCode = 400;
        throw err;
      }

      const product = await Product.findById(item.product).session(session);
      if (!product) {
        const err = new Error(`Sản phẩm ID ${item.product} không tồn tại.`);
        err.statusCode = 404;
        throw err;
      }

      const currentPrice = Number(product.price || 0);
      itemsPrice += currentPrice * qty;

      processedItems.push({
        product: product._id,
        name: product.name,
        image: product.image?.url || "",
        quantity: qty,
        price: currentPrice,
      });
    }

    const totalPrice = itemsPrice + Number(shippingPrice || 0);
    const now = new Date();

    const [newOrder] = await Order.create(
      [
        {
          user: userId,
          orderItems: processedItems,
          shippingAddress: {
            fullName: shippingAddress.fullName,
            phone: shippingAddress.phone,
            province: shippingAddress.province,
            ward: shippingAddress.ward,
            addressDetails: shippingAddress.addressDetails,
          },
          paymentMethod: "COD",
          itemsPrice,
          shippingPrice,
          totalPrice,
          customerNote,
          status: { orderStatus: "Pending", isPaid: false, isDelivered: false },
          timeline: [{ type: "CREATE", by: userId, at: now }],
        },
      ],
      { session }
    );

    // dashboard cache
    await dashboardWriter.applyCreate({ order: newOrder, at: now, session });

    return newOrder;
  });
};

module.exports.getMyOrdersService = async (userId, status) => {
  if (!userId) {
    const err = new Error("UserId là bắt buộc.");
    err.statusCode = 400;
    throw err;
  }

  const query = { user: userId };
  if (status) query["status.orderStatus"] = status;

  return Order.find(query)
    .populate("staff", "fullName phone")
    .sort({ createdAt: -1 });
};

module.exports.getOrderDetailService = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId }).populate("staff", "fullName phone");
  if (!order) {
    const err = new Error("Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này.");
    err.statusCode = 404;
    throw err;
  }
  return order;
};

module.exports.cancelOrderService = async (userId, orderId, body = {}) => {
  ensureObjectId(orderId, "orderId");
  ensureObjectId(userId, "userId");

  return runInTransaction(async (session) => {
    const now = new Date();
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    const cancelled = await Order.findOneAndUpdate(
      { _id: orderId, user: userId, "status.orderStatus": "Pending" },
      {
        $set: {
          "status.orderStatus": "Cancelled",
          "status.cancelledAt": now,
          cancelledBy: userId,
          ...(reason ? { shopNote: reason } : {}),
        },
        $push: {
          timeline: { type: "CANCEL", by: userId, at: now, note: reason || "User cancelled order" },
        },
      },
      { new: true, session }
    );

    if (!cancelled) {
      const order = await Order.findOne({ _id: orderId, user: userId }).select("status.orderStatus");
      if (!order) {
        const err = new Error("Không tìm thấy đơn hàng hoặc bạn không có quyền thực hiện.");
        err.statusCode = 404;
        throw err;
      }
      const err = new Error(`Đơn hàng đã được ${order.status?.orderStatus || "xử lý"}, không thể tự hủy lúc này.`);
      err.statusCode = 409;
      throw err;
    }

    await dashboardWriter.applyStatusChange({
      order: cancelled,
      type: "CANCEL",
      at: now,
      fromStatus: "Pending",
      toStatus: "Cancelled",
      session,
    });

    return cancelled;
  });
};

// ====================== ADMIN ======================
module.exports.updateOrderStatusAdmin = async (orderId, statusData = {}) => {
  const { orderStatus, shopNote, actorId } = statusData;

  const by =
    actorId && mongoose.Types.ObjectId.isValid(actorId)
      ? new mongoose.Types.ObjectId(actorId)
      : null;

  // chỉ update note (không đổi status)
  if (!orderStatus) {
    const now = new Date();
    const updated = await Order.findById(orderId);
    if (!updated) {
      const err = new Error("Không tìm thấy đơn hàng.");
      err.statusCode = 404;
      throw err;
    }

    if (typeof shopNote === "string") {
      updated.shopNote = shopNote;
      updated.timeline ??= [];
      updated.timeline.push({ type: "NOTE", by, at: now, note: shopNote });
    }
    return updated.save();
  }

  const allowedNext = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Shipped", "Cancelled"],
    Shipped: ["Delivered", "Cancelled"],
    Delivered: [],
    Cancelled: [],
  };

  return runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      const err = new Error("Không tìm thấy đơn hàng.");
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    const fromStatus = order.status?.orderStatus ?? "Pending";
    const wasPaid = !!order.status?.isPaid;

    if (fromStatus === "Delivered") {
      const err = new Error("Đơn hàng đã hoàn thành, không thể cập nhật thêm.");
      err.statusCode = 409;
      throw err;
    }
    if (fromStatus === "Cancelled") {
      const err = new Error("Đơn hàng đã bị hủy, không thể cập nhật.");
      err.statusCode = 409;
      throw err;
    }
    if (!allowedNext[fromStatus]?.includes(orderStatus)) {
      const err = new Error(`Không thể chuyển từ ${fromStatus} sang ${orderStatus}.`);
      err.statusCode = 409;
      throw err;
    }

    if (typeof shopNote === "string") order.shopNote = shopNote;

    // rule: ship/deliver cần staff + confirmedAt
    if (orderStatus === "Shipped" || orderStatus === "Delivered") {
      if (!order.staff) {
        const err = new Error("Đơn chưa có staff (chưa claim), không thể giao.");
        err.statusCode = 409;
        throw err;
      }
      if (!order.status?.confirmedAt) {
        const err = new Error("Đơn chưa Confirmed, không thể giao.");
        err.statusCode = 409;
        throw err;
      }
    }

    order.status ??= {};
    order.timeline ??= [];

    // set status
    order.status.orderStatus = orderStatus;

    // ========= CONFIRMED =========
    if (orderStatus === "Confirmed") {
      // ✅ reserve kho tại Confirmed (stock -)
      await reserveStockForOrder({ order, session });

      order.status.confirmedAt ??= now;
      order.confirmedBy ??= by ?? order.staff ?? null;
      order.timeline.push({ type: "CONFIRM", by: by ?? order.staff ?? null, at: now });
    }

    // ========= SHIPPED =========
    if (orderStatus === "Shipped") {
      if (!order.shipper) {
        const err = new Error("Chưa có shipper nhận đơn, không thể chuyển Shipped.");
        err.statusCode = 409;
        throw err;
      }
      order.status.shippedAt ??= now;
      order.shippedBy ??= by ?? order.shipper ?? null;
      order.timeline.push({ type: "SHIP", by: by ?? order.shipper ?? null, at: now });
    }

    // ========= CANCELLED =========
    if (orderStatus === "Cancelled") {
      // ✅ nếu đã Confirmed/Shipped thì trả kho (stock +)
      if (fromStatus === "Confirmed" || fromStatus === "Shipped") {
        await releaseStockForOrder({ order, session });
      }

      order.status.cancelledAt ??= now;
      order.cancelledBy ??= by ?? order.staff ?? null;
      order.timeline.push({
        type: "CANCEL",
        by: by ?? order.staff ?? null,
        at: now,
        note: typeof shopNote === "string" && shopNote.trim() ? shopNote.trim() : "",
      });
    }

    // ========= DELIVERED =========
    if (orderStatus === "Delivered") {
      if (order.status.isDelivered) {
        const err = new Error("Đơn hàng đã được đánh dấu Delivered trước đó.");
        err.statusCode = 409;
        throw err;
      }

      order.status.shippedAt ??= now;

      // ✅ Delivered chỉ +sold (KHÔNG trừ kho nữa)
      await increaseSoldForOrder({ order, session });

      order.status.isDelivered = true;
      order.status.deliveredAt = now;
      order.deliveredBy ??= by ?? order.shipper ?? null;
      order.timeline.push({ type: "DELIVER", by: by ?? order.shipper ?? null, at: now });

      // COD auto pay + ghi lịch sử thanh toán
      if (order.paymentMethod === "COD" && !order.status.isPaid) {
        order.status.isPaid = true;
        order.status.paidAt = now;
        order.paidBy ??= order.shipper ?? by ?? null;

        order.timeline.push({
          type: "PAY",
          by: order.paidBy ?? null,
          at: now,
          meta: { method: "COD", amount: order.totalPrice },
        });

        await paymentTxService.upsertSuccessPayment({
          orderId: order._id,
          userId: order.user,
          staffId: order.paidBy ?? null,
          method: "COD",
          amount: order.totalPrice,
          paidAt: now,
          note: "COD collected (Delivered)",
          meta: { source: "ADMIN_STATUS_DELIVERED", fromStatus, toStatus: "Delivered" },
          client: statusData?.client,
          session,
        });
      }
    }

    const saved = await order.save({ session });

    await dashboardWriter.applyStatusChange({
      order: saved,
      type: mapOrderStatusToEventType(orderStatus),
      at: now,
      fromStatus,
      toStatus: orderStatus,
      session,
    });

    // dashboard cache: pay (nếu mới phát sinh pay)
    if (
      orderStatus === "Delivered" &&
      saved.paymentMethod === "COD" &&
      !wasPaid &&
      saved.status?.isPaid
    ) {
      await dashboardWriter.applyPay({
        order: saved,
        at: saved.status.paidAt || now,
        session,
      });
    }

    return saved;
  });
};

module.exports.getAllOrdersAdmin = async (query) => {
  const { status, limit = 10, page = 1, orderId } = query;

  const filter = {};
  if (status) filter["status.orderStatus"] = status;

  // ✅ search orderId: nếu full ObjectId => match thẳng
  if (orderId && String(orderId).trim()) {
    const q = String(orderId).trim();
    if (mongoose.Types.ObjectId.isValid(q)) {
      filter._id = q;
    } else {
      // match theo chuỗi _id (không cần quét toàn bộ)
      filter.$expr = {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: escapeRegex(q),
          options: "i",
        },
      };
    }
  }

  const pageNum = Math.max(1, Number(page || 1));
  const limitNum = Math.max(1, Math.min(50, Number(limit || 10)));

  const totalItems = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate("user", "fullName phone")
    .populate("staff", "fullName phone")
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .skip((pageNum - 1) * limitNum);

  return { orders, totalItems };
};

// ====================== STAFF ======================
module.exports.getMyStaffOrdersService = async (staffId, query) => {
  if (!staffId) {
    const err = new Error("staffId là bắt buộc.");
    err.statusCode = 400;
    throw err;
  }

  const filter = { staff: staffId };
  if (query?.status) filter["status.orderStatus"] = query.status;

  if (query?.month) {
    const [y, m] = query.month.split("-").map(Number);
    const offsetMs = 7 * 60 * 60 * 1000;
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0) - offsetMs);
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0) - offsetMs);
    filter.createdAt = { $gte: start, $lt: end };
  }

  return Order.find(filter).sort({ createdAt: -1 });
};

module.exports.getUnassignedOrdersService = async (query = {}) => {
  const status = String(query.status || "Pending").trim();

  return Order.find({
    "status.orderStatus": status,
    $or: [{ staff: null }, { staff: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .limit(50);
};

module.exports.claimOrderService = async (orderId, staffId) => {
  ensureObjectId(orderId, "orderId");
  ensureObjectId(staffId, "staffId");

  return runInTransaction(async (session) => {
    const now = new Date();

    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        "status.orderStatus": "Pending",
        $or: [{ staff: null }, { staff: { $exists: false } }],
      },
      {
        $set: {
          staff: staffId,
          confirmedBy: staffId,
          "status.orderStatus": "Confirmed",
          "status.confirmedAt": now,
        },
        $push: { timeline: { type: "CLAIM", by: staffId, at: now } },
      },
      { new: true, session }
    );

    if (!updated) {
      const exists = await Order.exists({ _id: orderId });
      const err = new Error(exists ? "Đơn không Pending hoặc đã được staff khác nhận" : "Không tìm thấy đơn hàng");
      err.statusCode = exists ? 409 : 404;
      throw err;
    }

    // ✅ TRỪ KHO 1 LẦN TẠI CONFIRMED (reserve)
    await reserveStockForOrder({ order: updated, session });

    // (optional) log cho dễ truy vết
    updated.timeline ??= [];
    updated.timeline.push({ type: "NOTE", by: staffId, at: now, note: "Reserved stock at Confirmed" });

    await updated.save({ session });

    await dashboardWriter.applyClaim({ order: updated, at: now, session });
    return updated;
  });
};

// ====================== SHIPPER ======================
module.exports.getShipperInboxService = async () => {
  return Order.find({
    "status.orderStatus": "Confirmed",
    shipper: null,
    staff: { $ne: null },
    "status.confirmedAt": { $ne: null },
  })
    .populate("user", "fullName phone")
    .populate("staff", "fullName phone")
    .sort({ createdAt: -1 })
    .limit(50);
};

module.exports.shipperClaimOrderService = async (orderId, shipperId) => {
  ensureObjectId(orderId, "orderId");
  ensureObjectId(shipperId, "shipperId");

  return runInTransaction(async (session) => {
    const now = new Date();

    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        "status.orderStatus": "Confirmed",
        shipper: null,
        staff: { $ne: null },
        "status.confirmedAt": { $ne: null },
      },
      {
        $set: {
          shipper: shipperId,
          shippedBy: shipperId,
          "status.orderStatus": "Shipped",
          "status.shippedAt": now,
        },
        $push: { timeline: { type: "SHIP", by: shipperId, at: now } },
      },
      { new: true, session }
    );

    if (!updated) {
      const exists = await Order.exists({ _id: orderId });
      const err = new Error(exists ? "Đơn không Confirmed hoặc đã có shipper nhận" : "Không tìm thấy đơn hàng");
      err.statusCode = exists ? 409 : 404;
      throw err;
    }

    await dashboardWriter.applyStatusChange({
      order: updated,
      type: "SHIP",
      at: now,
      fromStatus: "Confirmed",
      toStatus: "Shipped",
      session,
    });

    return updated;
  });
};

module.exports.getMyShipperOrdersService = async (shipperId, query = {}) => {
  ensureObjectId(shipperId, "shipperId");

  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Math.min(50, Number(query.limit || 10)));
  const q = String(query.q || "").trim();
  const status = String(query.status || "").trim();

  const filter = { shipper: shipperId };
  filter["status.orderStatus"] = status ? status : { $in: ["Shipped", "Delivered"] };

  if (q) {
    if (mongoose.Types.ObjectId.isValid(q)) filter._id = q;
    else {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ "shippingAddress.fullName": rx }, { "shippingAddress.phone": rx }];
    }
  }

  const totalItems = await Order.countDocuments(filter);

  const items = await Order.find(filter)
    .populate("user", "fullName phone")
    .populate("staff", "fullName phone")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { items, pagination: { page, limit, totalItems, totalPages } };
};

module.exports.shipperMarkDeliveredService = async (orderId, shipperId, ctx = {}) => {
  ensureObjectId(orderId, "orderId");
  ensureObjectId(shipperId, "shipperId");

  return runInTransaction(async (session) => {
    const now = new Date();

    const order = await Order.findOne({
      _id: orderId,
      shipper: shipperId,
      "status.orderStatus": "Shipped",
      "status.isDelivered": { $ne: true },
    }).session(session);

    if (!order) {
      const exists = await Order.exists({ _id: orderId });
      const err = new Error(
        exists ? "Đơn không ở trạng thái Shipped hoặc không thuộc shipper này" : "Không tìm thấy đơn hàng"
      );
      err.statusCode = exists ? 409 : 404;
      throw err;
    }

    const wasPaid = !!order.status?.isPaid;

    order.status ??= {};
    order.timeline ??= [];
    order.status.shippedAt ??= now;

    // ✅ Delivered chỉ +sold (không trừ kho)
    await increaseSoldForOrder({ order, session });

    order.status.orderStatus = "Delivered";
    order.status.isDelivered = true;
    order.status.deliveredAt = now;
    order.deliveredBy = shipperId;

    order.timeline.push({ type: "DELIVER", by: shipperId, at: now });

    // COD auto pay
    if (order.paymentMethod === "COD" && !order.status.isPaid) {
      order.status.isPaid = true;
      order.status.paidAt = now;
      order.paidBy = shipperId;

      order.timeline.push({
        type: "PAY",
        by: shipperId,
        at: now,
        meta: { method: "COD", amount: order.totalPrice },
      });

      await paymentTxService.upsertSuccessPayment({
        orderId: order._id,
        userId: order.user,
        staffId: shipperId,
        method: "COD",
        amount: order.totalPrice,
        paidAt: now,
        note: "COD collected by shipper",
        meta: { source: "SHIPPER_DELIVERED", fromStatus: "Shipped", toStatus: "Delivered" },
        client: ctx?.client,
        session,
      });
    }

    const saved = await order.save({ session });

    await dashboardWriter.applyStatusChange({
      order: saved,
      type: "DELIVER",
      at: now,
      fromStatus: "Shipped",
      toStatus: "Delivered",
      session,
    });

    if (saved.paymentMethod === "COD" && !wasPaid && saved.status?.isPaid) {
      await dashboardWriter.applyPay({ order: saved, at: saved.status.paidAt || now, session });
    }

    return saved;
  });
};

module.exports.shipperCancelOrderService = async (orderId, shipperId, body = {}) => {
  ensureObjectId(orderId, "orderId");
  ensureObjectId(shipperId, "shipperId");

  return runInTransaction(async (session) => {
    const now = new Date();
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        shipper: shipperId,
        "status.orderStatus": "Shipped",
        "status.isDelivered": { $ne: true },
      },
      {
        $set: {
          "status.orderStatus": "Cancelled",
          "status.cancelledAt": now,
          cancelledBy: shipperId,
          ...(reason ? { shopNote: reason } : {}),
        },
        $push: {
          timeline: {
            type: "CANCEL",
            by: shipperId,
            at: now,
            note: reason || "Shipper cancelled order",
          },
        },
      },
      { new: true, session }
    );

    if (!updated) {
      const exists = await Order.exists({ _id: orderId });
      const err = new Error(
        exists
          ? "Không thể huỷ: đơn không ở trạng thái Shipped hoặc không thuộc shipper này"
          : "Không tìm thấy đơn hàng"
      );
      err.statusCode = exists ? 409 : 404;
      throw err;
    }

    // trả kho lại (stock +)
    await releaseStockForOrder({ order: updated, session });

    await dashboardWriter.applyStatusChange({
      order: updated,
      type: "CANCEL",
      at: now,
      fromStatus: "Shipped",
      toStatus: "Cancelled",
      session,
    });

    return updated;
  });
};

// ====================== DASHBOARD READ (re-export) ======================
module.exports.getDashboardDayService = dashboardReadService.getDashboardDayService;
module.exports.getDashboardMonthService = dashboardReadService.getDashboardMonthService;
module.exports.getDashboardYearService = dashboardReadService.getDashboardYearService;
