const express = require("express");
const { enhanceEmailBody, optimizeSubject, draftReply, matchInvestors, regenerateTemplate, analyzePitchDeck } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/analyze-pitch", analyzePitchDeck);
router.post("/enhance-email-body", enhanceEmailBody);
router.post("/optimize-subject", optimizeSubject);

router.post("/regenerate-template", regenerateTemplate);

router.post("/draft-reply", draftReply);

router.post("/match-investors", matchInvestors);


module.exports = router;