const express = require('express');
const router = express.Router();
const { getAllIncubators, addIncubator, uploadIncubators, updateIncubator, deleteIncubator } = require('../controllers/incubator.controller');
const upload = require('../middlewares/multer.middleware');

router.get('/', getAllIncubators);
router.post('/', addIncubator);
router.put('/:id', updateIncubator);
router.delete('/:id', deleteIncubator);
router.post('/upload-file', upload.single('file'), uploadIncubators);

module.exports = router;