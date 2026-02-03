// src/api/v1/modules/payment/controllers/paymentTransaction.user.controller.js

const service = require("../services/paymentTransaction.service");

module.exports.my = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const data = await service.listMy({ userId, q: req.query });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
