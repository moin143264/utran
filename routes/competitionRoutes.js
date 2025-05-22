const express = require('express');
const { check } = require('express-validator');
const {
    createCompetition,
    getCompetitions,
    getCompetition,
    updateCompetition,
    deleteCompetition,
    registerTeam
} = require('../controllers/competitionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all competitions and create new competition
router
    .route('/')
    .get(getCompetitions)
    .post(
        protect,
        authorize('organizer', 'admin'),
        [
            check('name', 'Competition name is required').not().isEmpty(),
            check('sport', 'Sport is required').not().isEmpty(),
            check('startDate', 'Start date is required').not().isEmpty(),
            check('endDate', 'End date is required').not().isEmpty(),
            check('registrationDeadline', 'Registration deadline is required').not().isEmpty(),
            check('maxTeams', 'Maximum number of teams is required').isNumeric(),
            check('description', 'Description is required').not().isEmpty(),
            check('venue', 'Venue is required').not().isEmpty()
        ],
        createCompetition
    );

// Get, update and delete competition by ID
router
    .route('/:id')
    .get(getCompetition)
    .put(
        protect,
        authorize('organizer', 'admin'),
        updateCompetition
    )
    .delete(
        protect,
        authorize('organizer', 'admin'),
        deleteCompetition
    );

// Register team for competition
router.post(
    '/:id/register',
    protect,
    [
        check('teamId', 'Team ID is required').not().isEmpty()
    ],
    registerTeam
);

module.exports = router;