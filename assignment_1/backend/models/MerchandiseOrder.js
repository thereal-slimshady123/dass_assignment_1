const mongoose = require('mongoose');

const merchandiseOrderSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    eventName: { type: String, required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Participant info
    userId: { type: String },
    participantName: { type: String, default: '' },
    participantEmail: { type: String, required: true, index: true },

    // Payment proof — base64 encoded image uploaded by user
    paymentProofImage: { type: String, required: true },
    paymentProofMimeType: { type: String, default: 'image/jpeg' },

    // Workflow status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    rejectionReason: { type: String, default: '' },

    // Generated on approval
    ticketId: { type: String, default: '' },
    qrDataUrl: { type: String, default: '' },  // base64 PNG for the QR code

    // Audit
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('MerchandiseOrder', merchandiseOrderSchema);
