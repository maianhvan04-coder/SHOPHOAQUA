const mongoose = require("mongoose");

const orderEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "CREATE",
        "CLAIM",
        "CONFIRM",
        "ASSIGN_SHIPPER",
        "SHIP",
        "DELIVER",
        "CANCEL",
        "PAY",
        "REFUND",
        "NOTE",
      ],
      required: true,
    },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ ai tạo đơn (nếu staff tạo hộ khách) - khách tự đặt thì để null
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ✅ staff phụ trách chính (owner của đơn)
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },      

    // ✅ shipper phụ trách giao
    shipper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },

    // ✅ ai làm từng bước (rất quan trọng khi nhiều staff)
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    shippedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true }, // ai thu tiền (cashier/shipper/staff)

    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        image: { type: String, default: "" },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }, // snapshot tại thời điểm đặt
      },
    ],

    customerNote: { type: String, trim: true, default: "" },
    shopNote: { type: String, trim: true, default: "" },

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      province: { type: String, required: true },
      ward: { type: String, required: true },
      addressDetails: { type: String, required: true },
    },

    paymentMethod: { type: String, default: "COD" },

    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },

    status: {
      type: {
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date, default: null },

        isDelivered: { type: Boolean, default: false },
        deliveredAt: { type: Date, default: null },

        confirmedAt: { type: Date, default: null },
        shippedAt: { type: Date, default: null },

        // ✅ thêm cancelledAt (để dashboard theo ngày hủy cũng rõ)
        cancelledAt: { type: Date, default: null },

        orderStatus: {
          type: String,
          enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
          default: "Pending",
        },
      },
      default: () => ({
        orderStatus: "Pending",
        isPaid: false,
        isDelivered: false,
        paidAt: null,
        deliveredAt: null,
        confirmedAt: null,
        shippedAt: null,
        cancelledAt: null,
      }),
    },

    // ✅ log đầy đủ lịch sử (ai làm gì lúc nào)
    timeline: {
      type: [orderEventSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// index bạn đang có (giữ lại)
orderSchema.index({ staff: 1, createdAt: 1 });
orderSchema.index({ "status.orderStatus": 1, createdAt: 1 });
orderSchema.index({ staff: 1, "status.orderStatus": 1, createdAt: 1 });
orderSchema.index({ shipper: 1, createdAt: 1 });
orderSchema.index({ shipper: 1, "status.orderStatus": 1, createdAt: 1 });

// ✅ thêm index cho KPI theo paidAt (rất cần nếu tính doanh thu theo ngày trả tiền)
orderSchema.index({ "status.isPaid": 1, "status.paidAt": 1 });
orderSchema.index({ "status.orderStatus": 1, "status.paidAt": 1 });


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
