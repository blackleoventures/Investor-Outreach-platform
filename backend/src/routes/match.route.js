const express = require("express");
const { getAllMatchResults, getScoredInvestors } = require("../controllers/matchResult.controller");
const router = express.Router();

router.get("/", getAllMatchResults);
router.get("/:companyId/scored", getScoredInvestors);

module.exports = router;

