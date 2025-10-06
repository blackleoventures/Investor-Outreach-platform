const express = require('express');
const router = express.Router();
const { getAllIncubators, createIncubator, updateIncubator, deleteIncubator } = require('../controllers/incubator.controller');
// const upload = require('../middlewares/multer.middleware');
// const requireAuth = require('../middlewares/firebaseAuth.middleware');

router.get('/', getAllIncubators);
router.post('/create', createIncubator);
router.put('/:id', updateIncubator);
router.delete('/:id', deleteIncubator);
// router.post('/upload-file', requireAuth, upload.single('file'), uploadIncubators);

module.exports = router;