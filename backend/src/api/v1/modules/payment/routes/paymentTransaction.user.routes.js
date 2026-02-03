// src/api/v1/modules/payment/routes/paymentTransaction.user.routes.js

const router = require("express").Router();
const ctrl = require("../controllers/paymentTransaction.user.controller");
const { guard } = require("../../../middlewares/auth");

router.get("/my", ...guard({ any: [] }), ctrl.my);

module.exports = router;
