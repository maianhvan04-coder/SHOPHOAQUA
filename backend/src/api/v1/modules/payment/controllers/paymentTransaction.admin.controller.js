// src/api/v1/modules/payment/controllers/paymentTransaction.admin.controller.js

const service = require("../services/paymentTransaction.service");

module.exports.list = async (req, res, next) => {
  try {
    const data = await service.listAdmin(req.query);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

module.exports.listByUser = async (req, res, next) => {
  try {
    const data = await service.listAdmin({
      ...req.query,
      userId: req.params.userId,
      type: "PAYMENT",
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
