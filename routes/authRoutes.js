const express = require('express');
const { check } = require('express-validator');
const { register, login, getMe, forgotPassword, resetPassword, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Register user
router.post('/register', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('role').optional().isIn(['user', 'admin', 'organizer'])
], register);

// Login user
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], login);

// Get current user
router.get('/me', protect, getMe);

// Forgot password
router.post('/forgot-password', [
    check('email', 'Please include a valid email').isEmail()
], forgotPassword);

// Reset password
router.post('/reset-password', [
    check('token', 'Token is required').not().isEmpty(),
    check('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], resetPassword);

// Logout user
router.post('/logout', protect, logout);

module.exports = router;