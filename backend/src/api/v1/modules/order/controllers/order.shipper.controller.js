// order.shipper.controller.js
const mongoose = require("mongoose");
const orderService = require("../order.service");
const { getClientInfo } = require("../../../../../utils/clientInfo");

exports.getShipperInbox = async (req, res, next) => {
  try {
    const data = await orderService.getShipperInboxService();
    return res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.shipperClaimOrder = async (req, res, next) => {
  try {
    const shipperId = req.user?.sub;
    if (!shipperId) return res.status(401).json({ success: false, message: "Bạn cần đăng nhập." });

    const orderId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "orderId không hợp lệ" });
    }

    const data = await orderService.shipperClaimOrderService(orderId, shipperId);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.getMyShipperOrders = async (req, res, next) => {
  try {
    const shipperId = req.user?.sub;
    if (!shipperId) return res.status(401).json({ success: false, message: "Bạn cần đăng nhập." });

    const data = await orderService.getMyShipperOrdersService(shipperId, req.query);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.shipperMarkDelivered = async (req, res, next) => {
  try {
    const shipperId = req.user?.sub;
    if (!shipperId) return res.status(401).json({ success: false, message: "Bạn cần đăng nhập." });

    const orderId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "orderId không hợp lệ" });
    }

    // ✅ lấy thiết bị thao tác
    const client = getClientInfo(req);

    // ✅ truyền ctx để service lưu vào PaymentTransaction.client
    const data = await orderService.shipperMarkDeliveredService(orderId, shipperId, { client });

    return res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.shipperCancelOrder = async (req, res, next) => {
  try {
    const shipperId = req.user?.sub;
    if (!shipperId) return res.status(401).json({ success: false, message: "Bạn cần đăng nhập." });

    const orderId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "orderId không hợp lệ" });
    }

    const data = await orderService.shipperCancelOrderService(orderId, shipperId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
