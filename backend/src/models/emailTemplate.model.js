const mongoose = require("mongoose");

const EmailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["Initial Outreach", "Follow-up", "Thank You", "Investor Update", "Custom"],
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    variables: [{
      name: String,
      description: String,
      defaultValue: String,
      required: Boolean,
    }],
    tone: {
      type: String,
      enum: ["Professional", "Persuasive", "Friendly", "Casual"],
      default: "Professional",
    },
    isPreBuilt: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    lastUsed: Date,
    tags: [String],
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient querying
EmailTemplateSchema.index({ category: 1, isActive: 1 });
EmailTemplateSchema.index({ companyId: 1, isActive: 1 });

module.exports = mongoose.model("EmailTemplate", EmailTemplateSchema); 