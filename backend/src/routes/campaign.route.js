const express = require("express");
const router = express.Router();

const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getMatches,
  sendCampaign,
  storeSelectedInvestors,
  getSelectedInvestors
} = require("../controllers/campaign.controller");
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");

router
  .route("/")
  .get(verifyFirebaseToken, getCampaigns)
  .post(verifyFirebaseToken, createCampaign);

router
  .route("/:id")
  .get(verifyFirebaseToken, getCampaignById)
  .put(verifyFirebaseToken, updateCampaign)
  .delete(verifyFirebaseToken, deleteCampaign);

router.post("/matches", verifyFirebaseToken, getMatches);
router.post("/selected-investors", verifyFirebaseToken, storeSelectedInvestors);
router.get("/:campaignId/selected-investors", verifyFirebaseToken, getSelectedInvestors);
router.post("/:id/send", verifyFirebaseToken, sendCampaign);

module.exports = router;
