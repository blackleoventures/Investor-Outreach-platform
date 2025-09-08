const express = require("express");
const upload = require("../middlewares/multer.middleware");
const { analyzeDeck, enhanceEmail, optimizeSubject, draftReply, matchInvestors } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/analyze-deck", upload.single("deck"), analyzeDeck);
router.post("/enhance-email", enhanceEmail);
router.post("/optimize-subject", optimizeSubject);
router.post("/draft-reply", draftReply);

router.post("/match-investors", matchInvestors);


module.exports = router;