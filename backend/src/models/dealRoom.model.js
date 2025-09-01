const mongoose = require("mongoose");

const dealRoomSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      trim: true,
    },
    pitchDeckUrl: {
      type: String,
      required: true,
    },
    pitchDeckAnalysis: {
      summary: {
        problem: String,
        solution: String,
        market: String,
        traction: String,
        status: {
          type: String,
          enum: ["RED", "YELLOW", "GREEN"],
          default: "YELLOW"
        },
        total_score: {
          type: Number,
          default: 0,
          min: 0,
          max: 100
        }
      },
      scorecard: {
        type: Map,
        of: Number,
        default: {}
      },
      suggested_questions: [String],
      email_template: String,
      highlights: [String]
    },
    accessibleInvestors: [{
      investorId: String,
      accessGrantedAt: Date,
      lastViewedAt: Date,
      deckDownloaded: Boolean,
      emailsSent: Number,
      lastEmailSent: Date,
      replied: Boolean,
      lastReplyAt: Date,
      engagementScore: {
        type: Number,
        default: 0
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: String,
    settings: {
      allowDirectMessaging: {
        type: Boolean,
        default: true
      },
      trackEngagement: {
        type: Boolean,
        default: true
      },
      autoFollowUp: {
        type: Boolean,
        default: false
      },
      followUpDays: {
        type: Number,
        default: 7
      }
    }
  },
  { timestamps: true }
);

dealRoomSchema.index({ companyId: 1 });
dealRoomSchema.index({ "accessibleInvestors.investorId": 1 });

module.exports = mongoose.model("DealRoom", dealRoomSchema);