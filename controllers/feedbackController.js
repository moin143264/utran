const Feedback = require('../models/Feedback');
const Competition = require('../models/Competition');
const { validationResult } = require('express-validator');

// @desc    Create new feedback
// @route   POST /api/feedback
// @access  Private
exports.createFeedback = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { competitionId, rating, comment, category } = req.body;

        // Check if competition exists
        const competition = await Competition.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check if user has already given feedback
        const existingFeedback = await Feedback.findOne({
            user: req.user.id,
            competition: competitionId
        });

        if (existingFeedback) {
            return res.status(400).json({ message: 'You have already submitted feedback for this competition' });
        }

        const feedback = await Feedback.create({
            user: req.user.id,
            competition: competitionId,
            rating,
            comment,
            category
        });

        res.status(201).json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private/Admin
exports.getFeedback = async (req, res) => {
    try {
        const { competition, status, category } = req.query;
        const filter = {};

        if (competition) filter.competition = competition;
        if (status) filter.status = status;
        if (category) filter.category = category;

        const feedback = await Feedback.find(filter)
            .populate('user', 'name email')
            .populate('competition', 'name')
            .sort('-createdAt');

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get feedback by ID
// @route   GET /api/feedback/:id
// @access  Private
exports.getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('user', 'name email')
            .populate('competition', 'name');

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Check if user is authorized to view feedback
        if (feedback.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to view this feedback' });
        }

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update feedback status and response
// @route   PUT /api/feedback/:id
// @access  Private/Admin
exports.updateFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        const { status, adminResponse } = req.body;

        feedback.status = status || feedback.status;
        feedback.adminResponse = adminResponse || feedback.adminResponse;
        feedback.updatedAt = Date.now();

        await feedback.save();

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Admin
exports.deleteFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        await feedback.remove();

        res.json({ message: 'Feedback removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};