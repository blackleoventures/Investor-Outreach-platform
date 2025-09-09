const express = require("express");
const multer = require('multer');
const {
  getPaginatedInvestors,
  bulkAddInvestors,
  uploadCSV,
  uploadInvestorFile,
  getAllInvestors,
  updateInvestor,
  deleteInvestor,
  getFilterOptions,
  getUniqueFundSectors,
  getUniqueFundTypes,
  getUploadStats,
} = require("../controllers/investor.controller");

const upload = multer({ dest: '/tmp/' });

const router = express.Router();

router.get("/", getPaginatedInvestors);
router.post("/bulk", bulkAddInvestors);
router.post("/upload", upload.single('file'), uploadCSV);
const uploadMiddleware = (req, res, next) => {
  const uploader = upload.any();
  uploader(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }
    next();
  });
};

router.post("/upload-file", uploadMiddleware, uploadInvestorFile);
router.get("/upload-stats", getUploadStats);
router.get("/all", getAllInvestors);
router.put("/:id", updateInvestor);
router.delete("/:id", deleteInvestor);
router.post("/upload-csv", upload.single('file'), uploadCSV);
router.get("/filters", getFilterOptions);
router.get("/sectors", getUniqueFundSectors);
router.get("/fund-types", getUniqueFundTypes);

module.exports = router;

