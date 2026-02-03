// modules/order/helpers/orderCommon.helper.js

const mongoose = require("mongoose");

// escape regex cho search
function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// validate ObjectId
function ensureObjectId(id, name = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`${name} không hợp lệ`);
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(id);
}

// transaction retry
function isTransientTxError(err) {
  return (
    err?.errorLabels?.includes("TransientTransactionError") ||
    err?.errorLabels?.includes("UnknownTransactionCommitResult") ||
    err?.hasErrorLabel?.("TransientTransactionError") ||
    err?.hasErrorLabel?.("UnknownTransactionCommitResult")
  );
}

async function runInTransaction(work, { maxRetry = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await work(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      lastErr = err;
      try {
        await session.abortTransaction();
      } catch (_) {}
      session.endSession();

      if (isTransientTxError(err) && attempt < maxRetry) continue;
      throw err;
    }
  }
  throw lastErr;
}

function mapOrderStatusToEventType(orderStatus) {
  const typeMap = {
    Confirmed: "CONFIRM",
    Shipped: "SHIP",
    Delivered: "DELIVER",
    Cancelled: "CANCEL",
  };
  return typeMap[orderStatus] || "NOTE";
}

module.exports = {
  escapeRegex,
  ensureObjectId,
  runInTransaction,
  mapOrderStatusToEventType,
};
