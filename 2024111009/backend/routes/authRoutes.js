const express = require('express');
const router = express.Router();
const { register, login, createOrganizer, deleteOrganizer, getMe, addClub, deleteClub, addEvent, deleteEvent, getEvents, getEventById, getClubs, forgotPassword, resetPassword, changePassword, requestOrganizerPasswordReset, getOrganizerPasswordResetHistory, sendEventRegistrationEmailHandler, updateOrganizerProfile, incrementEventRegistration, getAllOrganizers, getPublicOrganizers, getAllClubs, updateOrganizerStatus, updateClubStatus, getPasswordResetRequests, clearPasswordResetRequest, getPasswordChangeRequests, approvePasswordChangeRequest, rejectPasswordChangeRequest, scanAttendance, getAttendanceDashboard, manualOverride, exportAttendanceCSV, createMerchandiseOrder, getMerchandiseOrders, approveMerchandiseOrder, rejectMerchandiseOrder, getUserMerchandiseOrders, updateEvent, getMyEvents, getEventForumMessages, createForumPost, deleteForumPost, togglePinForumPost, toggleForumReactionController } = require('../controllers/controller');
const { protect, restrictTo } = require('../middleware/middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);
router.post('/organizer-password-reset-request', protect, restrictTo('organizer'), requestOrganizerPasswordReset);
router.get('/organizer-password-reset-history', protect, restrictTo('organizer'), getOrganizerPasswordResetHistory);
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
router.patch('/events/:id', protect, restrictTo('organizer', 'admin'), updateEvent);
router.get('/my-events', protect, restrictTo('organizer', 'admin'), getMyEvents);
router.get('/clubs', getClubs);
router.get('/public-organizers', getPublicOrganizers);
router.get('/organizers', protect, restrictTo('admin'), getAllOrganizers);
router.get('/all-clubs', protect, restrictTo('admin'), getAllClubs);
router.patch('/update-organizer-status', protect, restrictTo('admin'), updateOrganizerStatus);
router.patch('/update-club-status', protect, restrictTo('admin'), updateClubStatus);
router.get('/password-reset-requests', protect, restrictTo('admin'), getPasswordResetRequests);
router.post('/clear-password-reset-request', protect, restrictTo('admin'), clearPasswordResetRequest);
router.get('/password-change-requests', protect, restrictTo('admin'), getPasswordChangeRequests);
router.post('/approve-password-change-request', protect, restrictTo('admin'), approvePasswordChangeRequest);
router.post('/reject-password-change-request', protect, restrictTo('admin'), rejectPasswordChangeRequest);

// Attendance tracking routes
router.post('/scan-attendance', protect, restrictTo('organizer'), scanAttendance);
router.get('/attendance-dashboard/:eventId', protect, restrictTo('organizer'), getAttendanceDashboard);
router.post('/manual-override', protect, restrictTo('organizer'), manualOverride);
router.get('/export-attendance/:eventId', protect, restrictTo('organizer'), exportAttendanceCSV);

// Merchandise payment verification routes
router.post('/create-merchandise-order', protect, createMerchandiseOrder);
router.get('/merchandise-orders/:eventId', protect, restrictTo('organizer'), getMerchandiseOrders);
router.post('/approve-merchandise-order', protect, restrictTo('organizer'), approveMerchandiseOrder);
router.post('/reject-merchandise-order', protect, restrictTo('organizer'), rejectMerchandiseOrder);
router.get('/my-merchandise-orders', protect, getUserMerchandiseOrders);

// Event forum routes
router.get('/events/:eventId/forum', protect, getEventForumMessages);
router.post('/events/:eventId/forum', protect, createForumPost);
router.delete('/events/:eventId/forum/:messageId', protect, deleteForumPost);
router.patch('/events/:eventId/forum/:messageId/pin', protect, togglePinForumPost);
router.patch('/events/:eventId/forum/:messageId/react', protect, toggleForumReactionController);

module.exports = router;