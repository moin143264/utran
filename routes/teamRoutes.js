const express = require('express');
const { check } = require('express-validator');
const {
    createTeam,
    getTeams,
    getTeam,
    updateTeam,
    deleteTeam,
    addPlayer,
    removePlayer
} = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all teams and create new team
router
    .route('/')
    .get(getTeams)
    .post(
        protect,
        [
            check('name', 'Team name is required').not().isEmpty(),
            check('description', 'Description is required').not().isEmpty()
        ],
        createTeam
    );

// Get, update and delete team by ID
router
    .route('/:id')
    .get(getTeam)
    .put(protect, updateTeam)
    .delete(protect, deleteTeam);

// Add player to team
router.post(
    '/:id/players',
    protect,
    [
        check('userId', 'User ID is required').not().isEmpty(),
        check('position', 'Position is required').not().isEmpty(),
        check('jerseyNumber', 'Jersey number is required').isNumeric()
    ],
    addPlayer
);

// Remove player from team
router.delete('/:id/players/:playerId', protect, removePlayer);

module.exports = router;
