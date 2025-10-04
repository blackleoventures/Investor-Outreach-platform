const express = require("express");
const upload = require("../middlewares/multer.middleware");
const { enhanceEmailBody, optimizeSubject, draftReply, matchInvestors, testUpload, extractAndPrefill, regenerateTemplate, analyzePitchDeck } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/analyze-pitch", analyzePitchDeck);
router.post("/enhance-email-body", enhanceEmailBody);
router.post("/optimize-subject", optimizeSubject);

router.post("/test-upload", upload.single("deck"), testUpload);
router.post("/extract-and-prefill", upload.single("document"), extractAndPrefill);
router.post("/regenerate-template", regenerateTemplate);

router.post("/draft-reply", draftReply);

router.post("/match-investors", matchInvestors);


module.exports = router;