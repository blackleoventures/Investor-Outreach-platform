const express = require("express");
const router = express.Router();
const { sendEmail, trackOpen, trackClick, webhook, inbound, unsubscribe } = require("../controllers/email.controller");

router.post("/send", sendEmail);
router.get("/track", trackOpen);
router.get("/click", trackClick);
router.post("/webhook", express.json({ type: "application/json" }), webhook);
router.post("/inbound", inbound);
router.get("/unsubscribe", unsubscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;

