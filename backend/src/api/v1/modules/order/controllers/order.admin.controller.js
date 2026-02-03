// order.admin.controller.js
const mongoose = require("mongoose");
const orderService = require("../order.service");
const { getClientInfo } = require("../../../../../utils/clientInfo");

module.exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrdersAdmin(req.query);
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công.",
      data: orders,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách đơn hàng.",
    });
  }
};

module.exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "orderId không hợp lệ" });
    }

    // ✅ actorId: người đang thao tác (admin/staff)
    const actorId = req.user?.sub || req.user?._id || req.user?.id || null;

    // ✅ thiết bị thao tác
    const client = getClientInfo(req);

    // ✅ gộp vào statusData để service dùng statusData.actorId + statusData.client
    const statusData = { ...req.body, actorId, client };

    const updatedOrder = await orderService.updateOrderStatusAdmin(id, statusData);

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công!",
      data: updatedOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật trạng thái đơn hàng.",
    });
  }
};
