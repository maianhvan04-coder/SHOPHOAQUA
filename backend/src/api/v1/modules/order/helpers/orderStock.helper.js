// modules/order/helpers/orderStock.helper.js

const Product = require("../../product/models/product.model");
const { ensureObjectId } = require("./orderCommon.helper");

function buildQtyByProduct(order) {
  const qtyByProduct = new Map();
  for (const item of order?.orderItems || []) {
    const pid = String(item.product);
    const q = Number(item.quantity || 0);
    if (!pid || q <= 0) continue;
    qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + q);
  }
  return qtyByProduct;
}

//  reserve kho: stock -= qty (atomic check đủ kho)
async function reserveStockForOrder({ order, session }) {
  const qtyByProduct = buildQtyByProduct(order);

  for (const [pid, qty] of qtyByProduct.entries()) {
    const _id = ensureObjectId(pid, "productId");

    const r = await Product.updateOne(
      { _id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { session }
    );

    if (!r.matchedCount) {
      const p = await Product.findById(_id).select("name stock").session(session).lean();
      const err = new Error(
        `Không đủ tồn kho: ${p?.name || pid} (còn ${Number(p?.stock || 0)}, cần ${qty})`
      );
      err.statusCode = 409;
      throw err;
    }
  }
}

// ✅ trả kho: stock += qty
async function releaseStockForOrder({ order, session }) {
  const qtyByProduct = buildQtyByProduct(order);

  const ops = Array.from(qtyByProduct.entries()).map(([pid, qty]) => ({
    updateOne: {
      filter: { _id: ensureObjectId(pid, "productId") },
      update: { $inc: { stock: qty } },
    },
  }));

  if (ops.length) await Product.bulkWrite(ops, { session });
}

// ✅ ghi nhận bán: sold += qty
async function increaseSoldForOrder({ order, session }) {
  const qtyByProduct = buildQtyByProduct(order);

  const ops = Array.from(qtyByProduct.entries()).map(([pid, qty]) => ({
    updateOne: {
      filter: { _id: ensureObjectId(pid, "productId") },
      update: { $inc: { sold: qty } },
    },
  }));

  if (ops.length) await Product.bulkWrite(ops, { session });
}

module.exports = {
  reserveStockForOrder,
  releaseStockForOrder,
  increaseSoldForOrder,
};
