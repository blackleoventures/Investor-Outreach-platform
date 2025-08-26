const express = require("express");
const router = express.Router();

const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
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

module.exports = router;
