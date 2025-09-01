const express = require("express");
const router = express.Router();
const dealRoomController = require("../controllers/dealRoom.controller");

// Deal room routes
router.post("/", dealRoomController.createDealRoom);
router.get("/:id", dealRoomController.getDealRoom);
router.put("/:id/analysis", dealRoomController.updatePitchAnalysis);
router.post("/:id/grant-access", dealRoomController.grantInvestorAccess);
router.post("/:id/track-engagement", dealRoomController.trackEngagement);
router.get("/:id/analytics", dealRoomController.getEngagementAnalytics);
router.get("/company/:companyId", dealRoomController.getCompanyDealRooms);

module.exports = router;