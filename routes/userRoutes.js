const express = require('express');
const { check } = require('express-validator');
const {
    getUserProfile,
    updateUserProfile,
    getUsers,
    deleteUser,
    updateUserRole,
    lookupUsersByEmail
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// User profile routes
router
    .route('/profile')
    .get(protect, getUserProfile)
    .put(
        protect,
        [
            check('name', 'Name is required').optional().notEmpty(),
            check('email', 'Please include a valid email').optional().isEmail(),
            check('password', 'Password must be 6 or more characters')
                .optional()
                .isLength({ min: 6 })
        ],
        updateUserProfile
    );

// User lookup route - accessible to authenticated users
router
    .route('/lookup')
    .get(protect, lookupUsersByEmail);

// Admin routes
router
    .route('/')
    .get(protect, authorize('admin'), getUsers);

router
    .route('/:id')
    .delete(protect, authorize('admin'), deleteUser);

router
    .route('/:id/role')
    .put(
        protect,
        authorize('admin'),
        [
            check('role', 'Role is required')
                .notEmpty()
                .isIn(['user', 'organizer', 'admin'])
        ],
        updateUserRole
    );

module.exports = router;