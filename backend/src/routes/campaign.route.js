const express = require("express");
const router = express.Router();

const {
  createCampaign,
  getCampaignReport,
  getCampaigns,
  getPublicCampaignReport,
  deleteCampaign,
} = require("../controllers/campaign.controller");
const verifyFirebaseToken = require("../middlewares/firebaseAuth.middleware");

router
  .route("/")
  .get(verifyFirebaseToken, getCampaigns)
  .post(verifyFirebaseToken, createCampaign);
router
  .route("/:campaignId")
  .get(getPublicCampaignReport)
  .delete(verifyFirebaseToken, deleteCampaign);
// router.route("report/:campaignId").get(verifyFirebaseToken, getCampaignReport);

module.exports = router;
