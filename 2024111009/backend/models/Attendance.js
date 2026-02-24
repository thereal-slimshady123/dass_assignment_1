const mongoose = require('mongoose');

const auditLogEntrySchema = new mongoose.Schema({
    action: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Event ID is required']
    },
    ticketId: {
        type: String,
        required: [true, 'Ticket ID is required'],
        trim: true
    },
    participantName: {
        type: String,
        trim: true,
        default: ''
    },
    participantEmail: {
        type: String,
        trim: true,
        default: ''
    },
    scannedAt: {
        type: Date,
        default: Date.now
    },
    scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isManualOverride: {
        type: Boolean,
        default: false
    },
    overrideReason: {
        type: String,
        trim: true,
        default: ''
    },
    auditLog: {
        type: [auditLogEntrySchema],
        default: []
    }
});

// Unique compound index: one ticket can only be scanned once per event
attendanceSchema.index({ eventId: 1, ticketId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
