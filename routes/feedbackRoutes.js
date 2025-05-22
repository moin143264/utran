const express = require('express');
const { check } = require('express-validator');
const {
    createFeedback,
    getFeedback,
    getFeedbackById,
    updateFeedback,
    deleteFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all feedback and create new feedback
router
    .route('/')
    .get(protect, authorize('admin'), getFeedback)
    .post(
        protect,
        [
            check('competitionId', 'Competition ID is required').not().isEmpty(),
            check('rating', 'Rating must be between 1 and 5').isInt({ min: 1, max: 5 }),
            check('comment', 'Comment is required').not().isEmpty(),
            check('category', 'Category must be valid').isIn([
                'organization',
                'venue',
                'scheduling',
                'refereeing',
                'other'
            ])
        ],
        createFeedback
    );

// Get, update and delete feedback by ID
router
    .route('/:id')
    .get(protect, getFeedbackById)
    .put(
        protect,
        authorize('admin'),
        [
            check('status').optional().isIn(['pending', 'reviewed', 'resolved']),
            check('adminResponse').optional().not().isEmpty()
        ],
        updateFeedback
    )
    .delete(protect, authorize('admin'), deleteFeedback);

module.exports = router;