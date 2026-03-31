const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { sendReportEmail } = require('../controllers/reportController');

const router = express.Router();

router.post('/send-email', protect, sendReportEmail);

module.exports = router;
