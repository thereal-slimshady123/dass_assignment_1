const express = require('express');
const router = express.Router();
const { register, login, createOrganizer, deleteOrganizer, getMe, addClub, deleteClub, addEvent, deleteEvent } = require('../controllers/controller');
const { protect, restrictTo } = require('../middleware/middleware');
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/create-organizer', protect, restrictTo('admin'), createOrganizer);
router.delete('/delete-organizer', protect, restrictTo('admin'), deleteOrganizer);
router.post('/add-club', protect, restrictTo('admin'), addClub);
router.delete('/delete-club', protect, restrictTo('admin'), deleteClub);
router.post('/add-event', protect, restrictTo('admin'), addEvent);
router.delete('/delete-event', protect, restrictTo('admin'), deleteEvent);

module.exports = router;