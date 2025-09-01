const express = require("express");
const {
  getPaginatedInvestors,
  bulkAddInvestors,
  uploadCSV,
  getAllInvestors,
  updateInvestor,
  deleteInvestor,
  getFilterOptions,
  getUniqueFundSectors,
  getUniqueFundTypes,
} = require("../controllers/investor.controller");

const router = express.Router();

router.get("/", getPaginatedInvestors);
router.post("/bulk", bulkAddInvestors);
router.post("/upload", uploadCSV);
router.get("/all", getAllInvestors);
router.put(":id", updateInvestor);
router.delete(":id", deleteInvestor);
router.get("/filters", getFilterOptions);
router.get("/sectors", getUniqueFundSectors);
router.get("/fund-types", getUniqueFundTypes);

module.exports = router;

