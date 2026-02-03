// src/api/v1/modules/payment/models/paymentTransaction.model.js

const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ người thao tác/thu/hoàn (có thể staff hoặc shipper)
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    type: { type: String, enum: ["PAYMENT", "REFUND"], default: "PAYMENT", index: true },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    method: { type: String, default: "COD", index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "VND" },

    transactionId: { type: String, default: null, index: true },
    paidAt: { type: Date, default: null, index: true },

    // ✅ thiết bị thao tác
    client: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      deviceId: { type: String, default: "" },
    },

    note: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// unique transactionId (nếu có)
paymentTransactionSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

// mỗi order chỉ có 1 SUCCESS PAYMENT
paymentTransactionSchema.index(
  { order: 1, type: 1, status: 1 },
  { unique: true, partialFilterExpression: { type: "PAYMENT", status: "SUCCESS" } }
);

// gợi ý index cho list nhanh
paymentTransactionSchema.index({ user: 1, paidAt: -1 });
paymentTransactionSchema.index({ order: 1, paidAt: -1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
