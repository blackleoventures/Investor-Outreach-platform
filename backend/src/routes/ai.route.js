const express = require("express");
const upload = require("../middlewares/multer.middleware");
const { analyzeDeck, createTemplate, getTemplate, updateTemplate, downloadTemplate, enhanceEmail } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/analyze-deck", upload.single("deck"), analyzeDeck);
router.post("/enhance-email", enhanceEmail);
router.post("/templates", createTemplate);
router.get("/templates/:id", getTemplate);
router.put("/templates/:id", updateTemplate);
router.get("/templates/:id/download", downloadTemplate);

module.exports = router;