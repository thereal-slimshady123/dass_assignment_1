const express = require('express');
const router = express.Router();
const { register, login, createOrganizer, deleteOrganizer, getMe, addClub, deleteClub } = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/create-organizer', protect, restrictTo('admin'), createOrganizer);
router.delete('/delete-organizer', protect, restrictTo('admin'), deleteOrganizer);
router.post('/add-club', protect, restrictTo('admin'), addClub);
router.delete('/delete-club', protect, restrictTo('admin'), deleteClub);

module.exports = router;