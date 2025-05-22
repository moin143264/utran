const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a competition name'],
        unique: true,
        trim: true
    },
    sport: {
        type: String,
        required: [true, 'Please specify the sport']
    },
    startDate: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    endDate: {
        type: Date,
        required: [true, 'Please add an end date']
    },
    registrationDeadline: {
        type: Date,
        required: [true, 'Please add a registration deadline']
    },
    maxTeams: {
        type: Number,
        required: [true, 'Please specify maximum number of teams']
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    matches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match'
    }],
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    venue: {
        type: String,
        required: [true, 'Please specify the venue']
    },
    rules: [{
        type: String
    }],
    prizes: [{
        position: String,
        prize: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Competition', competitionSchema);