const mongoose = require("mongoose");

const matchResultSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    results: [
      {
        investor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Investor",
        },
        score: Number,
        partner_name: String,
        partner_email: String,
        investor_name: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MatchResult", matchResultSchema);
