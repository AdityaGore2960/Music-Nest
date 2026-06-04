const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../utils/tokenUtils');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailUtils');

/**
 * @desc  Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} already in use.` });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (password hashed via pre-save hook)
    const user = await User.create({
      username,
      email,
      password,
      verificationToken,
      verificationTokenExpire,
    });

    // Send verification email — never block registration if email fails
    // (emailUtils already guards against unconfigured credentials)
    try {
      await sendVerificationEmail(email, username, verificationToken);
    } catch (emailErr) {
      // Log but don't rethrow — user account is created regardless
      console.warn('⚠️  Could not send verification email:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email to activate your account.',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Login user — returns access token + sets refresh token cookie
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly select password (excluded by default)
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been banned.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token in DB
    user.refreshToken = refreshToken;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Logout user — clear refresh token
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
  try {
    // Clear refresh token from DB
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null }, { validateBeforeSave: false });

    clearRefreshTokenCookie(res);

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Refresh access token using refresh token cookie
 * @route POST /api/auth/refresh-token
 * @access Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token found.' });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Find user and check stored refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid refresh token. Please login again.' });
    }

    // Issue new access token
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ success: false, message: 'Refresh token expired. Please login again.' });
    }
    next(error);
  }
};

/**
 * @desc  Verify email address
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Forgot password — send reset email
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal whether email exists
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user.email, user.username, resetToken);
    } catch (emailErr) {
      // Log warning but do NOT roll back — token is saved, user can retry
      console.warn('⚠️  Could not send password reset email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Reset password using token
 * @route PATCH /api/auth/reset-password/:token
 * @access Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshToken = null; // Invalidate all existing sessions
    await user.save();

    clearRefreshTokenCookie(res);

    res.status(200).json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get currently logged in user
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('following', 'username profileImage role')
      .populate('likedSongs', 'title audioUrl coverImage duration')
      .populate('savedAlbums', 'title coverImage');

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
};
