const express = require("express");
const upload = require("../middlewares/multer.middleware");
const { analyzeDeck, enhanceEmail, optimizeSubject, draftReply, matchInvestors, testUpload, extractAndPrefill, regenerateTemplate } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/analyze-deck", upload.single("deck"), analyzeDeck);
router.post("/test-upload", upload.single("deck"), testUpload);
router.post("/extract-and-prefill", upload.single("document"), extractAndPrefill);
router.post("/regenerate-template", regenerateTemplate);
router.post("/enhance-email", enhanceEmail);
router.post("/optimize-subject", optimizeSubject);
router.post("/draft-reply", draftReply);

router.post("/match-investors", matchInvestors);


module.exports = router;