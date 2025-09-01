const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    dealRoomId: {
      type: String,
      required: true,
    },
    founderId: {
      type: String,
      required: true,
    },
    investorId: {
      type: String,
      required: true,
    },
    messages: [{
      messageId: String,
      sender: {
        type: String,
        enum: ["founder", "investor"],
        required: true
      },
      subject: String,
      body: String,
      sentAt: Date,
      opened: Boolean,
      openedAt: Date,
      clicked: Boolean,
      clickedAt: Date,
      replied: Boolean,
      repliedAt: Date,
      aiGenerated: Boolean,
      tone: String,
      attachments: [{
        name: String,
        url: String,
        type: String
      }]
    }],
    status: {
      type: String,
      enum: ["active", "archived", "blocked"],
      default: "active"
    },
    lastActivity: Date,
    notes: [{
      note: String,
      addedBy: String,
      addedAt: Date
    }],
    tags: [String],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    }
  },
  { timestamps: true }
);

conversationSchema.index({ dealRoomId: 1, investorId: 1 });
conversationSchema.index({ founderId: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);