const mongoose = require("mongoose");

const DeckActivitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    deckId: {
      type: String,
      required: true,
    },
    deckName: String,
    investorEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    investorName: String,
    activityType: {
      type: String,
      enum: ["view", "download", "share", "comment"],
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      region: String,
    },
    sessionId: String,
    referrer: String,
    timeSpent: Number, // in seconds
    pageViews: Number,
    downloadFormat: String, // "pdf", "pptx", "docx"
    shareMethod: String, // "email", "link", "social"
    metadata: {
      campaignId: String,
      emailId: String,
      sequenceId: String,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
DeckActivitySchema.index({ companyId: 1, createdAt: -1 });
DeckActivitySchema.index({ investorEmail: 1, companyId: 1 });
DeckActivitySchema.index({ activityType: 1, createdAt: -1 });
DeckActivitySchema.index({ deckId: 1, companyId: 1 });

module.exports = mongoose.model("DeckActivity", DeckActivitySchema); 