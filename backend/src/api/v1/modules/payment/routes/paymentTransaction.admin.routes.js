// src/api/v1/modules/payment/routes/paymentTransaction.admin.routes.js

const router = require("express").Router();
const ctrl = require("../controllers/paymentTransaction.admin.controller");
const { guard } = require("../../../middlewares/auth");
const { PERMISSIONS } = require("../../../../../constants/permissions");

console.log("AUDIT_PAYMENT_READ =", PERMISSIONS.AUDIT_PAYMENT_READ);
router.get("/", ...guard({ any: [PERMISSIONS.AUDIT_PAYMENT_READ] }), ctrl.list);

// lịch sử thanh toán theo user
router.get("/user/:userId", ...guard({ any: [PERMISSIONS.AUDIT_PAYMENT_READ] }), ctrl.listByUser);

module.exports = router;
