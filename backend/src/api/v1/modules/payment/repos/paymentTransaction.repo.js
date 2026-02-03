// src/api/v1/modules/payment/repos/paymentTransaction.repo.js

const mongoose = require("mongoose");
const PaymentTx = require("../models/paymentTransaction.model");

module.exports.toObjectId = (id) => new mongoose.Types.ObjectId(id);

module.exports.upsertOne = async (filter, doc, options = {}) => {
  const q = PaymentTx.findOneAndUpdate(
    filter,
    { $set: doc },
    { new: true, upsert: true }
  );
  if (options.session) q.session(options.session);
  return q;
};

module.exports.findMany = async ({ filter, sort, skip, limit, populate = [], session }) => {
  let q = PaymentTx.find(filter).sort(sort).skip(skip).limit(limit);
  if (session) q = q.session(session);

  // ✅ hỗ trợ populate sâu (nested populate)
  for (const p of populate) q = q.populate(p);

  return q.lean();
};

module.exports.count = async (filter, session) => {
  const q = PaymentTx.countDocuments(filter);
  if (session) q.session(session);
  return q;
};
