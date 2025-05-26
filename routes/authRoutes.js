const express = require('express');
const { check } = require('express-validator');
const { register, login, getMe, forgotPassword, resetPassword, logout, sendOTP, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Send OTP for email verification
router.post('/send-otp', [
    check('email', 'Please include a valid email').isEmail()
], sendOTP);

// Verify OTP and complete registration
router.post('/verify-otp', [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP is required').not().isEmpty(),
    check('name', 'Name is required').not().isEmpty(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('role').optional().isIn(['user', 'admin', 'organizer'])
], verifyOTP);

// Register user (legacy route)
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
