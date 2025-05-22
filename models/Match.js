const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    competition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition',
        required: true
    },
    round: {
        type: Number,
        required: true
    },
    matchNumber: {
        type: Number,
        required: true
    },
    team1: {
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: true
        },
        score: {
            type: Number,
            default: 0
        }
    },
    team2: {
        team: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: true
        },
        score: {
            type: Number,
            default: 0
        }
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: Date,
    venue: {
        type: String,
        required: true
    },
    highlights: [{
        type: String  // URLs to highlight videos/images
    }],
    notes: String,
    referee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

// Update the updatedAt timestamp before saving
matchSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Match', matchSchema);