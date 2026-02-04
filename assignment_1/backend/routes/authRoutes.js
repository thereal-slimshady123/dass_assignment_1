const express = require('express');
const router = express.Router();
const { register, login, createOrganizer, getMe } = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/create-organizer', protect, restrictTo('admin'), createOrganizer);

module.exports = router;