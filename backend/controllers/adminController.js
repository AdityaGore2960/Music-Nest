const User = require('../models/User');
const Song = require('../models/Song');
const Album = require('../models/Album');
const Playlist = require('../models/Playlist');
const PlayHistory = require('../models/PlayHistory');

/**
 * @desc  Get platform analytics
 * @route GET /api/admin/stats
 * @access Private (Admin)
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalArtists,
      totalSongs,
      totalAlbums,
      totalPlaylists,
      totalPlays,
      recentUsers,
      topSongs,
      topArtists,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'artist' }),
      Song.countDocuments(),
      Album.countDocuments(),
      Playlist.countDocuments(),
      PlayHistory.countDocuments(),
      User.find().select('username email role createdAt').sort({ createdAt: -1 }).limit(5),
      Song.find().populate('artist', 'username').sort({ plays: -1 }).limit(10),
      User.find({ role: 'artist' })
        .select('username profileImage followers')
        .sort({ 'followers.length': -1 })
        .limit(10),
    ]);

    // Monthly play data for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyPlays = await PlayHistory.aggregate([
      { $match: { playedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$playedAt' },
            month: { $month: '$playedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: { totalUsers, totalArtists, totalSongs, totalAlbums, totalPlaylists, totalPlays },
        recentUsers,
        topSongs,
        topArtists,
        monthlyPlays,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get all users for admin management
 * @route GET /api/admin/users
 * @access Private (Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const role = req.query.role;

    const query = {};
    if (search) query.$or = [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (role) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken -verificationToken -resetPasswordToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update user role
 * @route PATCH /api/admin/users/:id/role
 * @access Private (Admin)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'artist', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.status(200).json({ success: true, message: `User role updated to ${role}.`, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Ban or unban a user
 * @route PATCH /api/admin/users/:id/ban
 * @access Private (Admin)
 */
const toggleUserBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot ban another admin.' });
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: user.isActive ? 'User unbanned.' : 'User banned.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete user (admin action)
 * @route DELETE /api/admin/users/:id
 * @access Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete an admin account.' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getUsers, updateUserRole, toggleUserBan, deleteUser };
