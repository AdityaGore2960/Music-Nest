const express = require('express');
const router = express.Router();
const {
  register, login, logout, refreshToken,
  verifyEmail, forgotPassword, resetPassword, getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// @route POST /api/auth/register
router.post('/register', register);

// @route POST /api/auth/login
router.post('/login', login);

// @route POST /api/auth/logout
router.post('/logout', protect, logout);

// @route POST /api/auth/refresh-token
router.post('/refresh-token', refreshToken);

// @route GET /api/auth/verify-email/:token
router.get('/verify-email/:token', verifyEmail);

// @route POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// @route PATCH /api/auth/reset-password/:token
router.patch('/reset-password/:token', resetPassword);

// @route GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;
