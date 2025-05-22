const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a team name'],
        unique: true,
        trim: true
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    captainDetails: {
        name: String,
        email: String,
        role: String,
        avatar: String,
        _id: false // Prevent MongoDB from adding an _id to this object
    },
    players: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        position: String,
        jerseyNumber: Number,
        userDetails: {
            name: String,
            email: String,
            role: String,
            avatar: String,
            _id: false // Prevent MongoDB from adding an _id to this object
        },
        _id: false // Prevent MongoDB from adding an _id to each player
    }],
    competitions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competition'
    }],
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    draws: {
        type: Number,
        default: 0
    },
    logo: {
        type: String,
        default: 'default-team-logo.png'
    },
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

// Virtual for team statistics
teamSchema.virtual('totalMatches').get(function() {
    return this.wins + this.losses + this.draws;
});

teamSchema.virtual('winPercentage').get(function() {
    const totalMatches = this.totalMatches;
    return totalMatches > 0 ? (this.wins / totalMatches) * 100 : 0;
});

// Enable virtuals in JSON
teamSchema.set('toJSON', { virtuals: true });
teamSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Team', teamSchema);