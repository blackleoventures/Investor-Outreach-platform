const mongoose = require("mongoose");

const UnsubscribeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    reason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Unsubscribe", UnsubscribeSchema);

