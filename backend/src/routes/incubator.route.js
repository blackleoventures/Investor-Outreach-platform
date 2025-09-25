const express = require('express');
const router = express.Router();
const { getAllIncubators, addIncubator, uploadIncubators, updateIncubator, deleteIncubator } = require('../controllers/incubator.controller');
const upload = require('../middlewares/multer.middleware');
const requireAuth = require('../middlewares/firebaseAuth.middleware');

router.get('/', getAllIncubators);
router.post('/', requireAuth, addIncubator);
router.put('/:id', requireAuth, updateIncubator);
router.delete('/:id', requireAuth, deleteIncubator);
router.post('/upload-file', requireAuth, upload.single('file'), uploadIncubators);

module.exports = router;