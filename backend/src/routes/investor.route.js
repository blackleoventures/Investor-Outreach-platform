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
const requireAuth = require('../middlewares/firebaseAuth.middleware');

const router = express.Router();

router.get("/", getPaginatedInvestors);
router.post("/bulk", requireAuth, bulkAddInvestors);
router.post("/upload", requireAuth, upload.single('file'), uploadCSV);
const uploadMiddleware = (req, res, next) => {
  const uploader = upload.any();
  uploader(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }
    next();
  });
};

router.post("/upload-file", requireAuth, uploadMiddleware, uploadInvestorFile);
router.get("/upload-stats", requireAuth, getUploadStats);
router.get("/all", getAllInvestors);
router.put("/:id", requireAuth, updateInvestor);
router.delete("/:id", requireAuth, deleteInvestor);
router.post("/upload-csv", requireAuth, upload.single('file'), uploadCSV);
router.get("/filters", getFilterOptions);
router.get("/sectors", getUniqueFundSectors);
router.get("/fund-types", getUniqueFundTypes);

module.exports = router;

