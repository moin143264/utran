const express = require('express');
const { check } = require('express-validator');
const {
    createMatch,
    getMatches,
    getMatch,
    updateMatchResult,
    deleteMatch,
    getMatchesByCompetition
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Get matches by competition ID
router.get(
  '/competition/:competitionId',
  protect,
  (req, res, next) => {
    console.log(`[matchRoutes.js] GET /competition/:competitionId - competitionId: ${req.params.competitionId}`);
    next();
  },
  getMatchesByCompetition
);

// Get all matches and create new match
router
    .route('/')
    .get(getMatches)
    .post(
        protect,
        authorize('organizer', 'admin'),
        [
            check('competitionId', 'Competition ID is required').not().isEmpty(),
            check('team1Id', 'Team 1 ID is required').not().isEmpty(),
            check('team2Id', 'Team 2 ID is required').not().isEmpty(),
            check('startTime', 'Start time is required').not().isEmpty(),
            check('venue', 'Venue is required').not().isEmpty(),
            check('round', 'Round number is required').isNumeric(),
            check('matchNumber', 'Match number is required').isNumeric()
        ],
        createMatch
    );

// Get, update and delete match by ID
router
    .route('/:id')
    .get(getMatch)
    .delete(
        protect,
        authorize('organizer', 'admin'),
        deleteMatch
    );

// Update match result
router.put(
    '/:id/result',
    protect,
    authorize('organizer', 'admin'),
    [
        check('team1Score', 'Team 1 score is required').isNumeric(),
        check('team2Score', 'Team 2 score is required').isNumeric(),
        check('winnerId', 'Winner ID is required').not().isEmpty(),
        check('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled'])
    ],
    updateMatchResult
);

module.exports = router;