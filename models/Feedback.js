const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    competition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Please provide a rating'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: [true, 'Please provide feedback comment'],
        maxlength: 500
    },
    category: {
        type: String,
        enum: ['organization', 'venue', 'scheduling', 'refereeing', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved'],
        default: 'pending'
    },
    adminResponse: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate feedback from same user for same competition
feedbackSchema.index({ user: 1, competition: 1 }, { unique: true });

// Update the updatedAt timestamp before saving
feedbackSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);