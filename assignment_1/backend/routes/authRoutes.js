const express = require('express');
const router = express.Router();
const { register, login, createOrganizer, deleteOrganizer, getMe, addClub, deleteClub, addEvent, deleteEvent, getEvents, getEventById, getClubs, forgotPassword, resetPassword, changePassword, sendEventRegistrationEmailHandler, updateOrganizerProfile, incrementEventRegistration } = require('../controllers/controller');
const { protect, restrictTo } = require('../middleware/middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);
router.post('/send-event-email', sendEventRegistrationEmailHandler);
router.get('/me', protect, getMe);
router.post('/create-organizer', protect, restrictTo('admin'), createOrganizer);
router.delete('/delete-organizer', protect, restrictTo('admin'), deleteOrganizer);
router.post('/update-organizer-profile', protect, restrictTo('organizer'), updateOrganizerProfile);
router.post('/add-club', protect, restrictTo('admin'), addClub);
router.delete('/delete-club', protect, restrictTo('admin'), deleteClub);
router.post('/add-event', protect, restrictTo('organizer', 'admin'), addEvent);
router.delete('/delete-event', protect, restrictTo('admin'), deleteEvent);
router.post('/increment-event-registration', incrementEventRegistration);
router.get('/events', getEvents);
router.get('/events/:id', getEventById);
router.get('/clubs', getClubs);

module.exports = router;