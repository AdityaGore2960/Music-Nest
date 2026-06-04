const User = require('../models/User');
const PlayHistory = require('../models/PlayHistory');
const Song = require('../models/Song');
const Playlist = require('../models/Playlist');
const { uploadToCloudinary } = require('../utils/cloudinaryUtils');

/**
 * @desc  Get user profile by ID
 * @route GET /api/users/:id
 * @access Public
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-refreshToken -password -verificationToken -resetPasswordToken')
      .populate('following', 'username profileImage role')
      .populate('followers', 'username profileImage');

    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get user's public playlists
    const playlists = await Playlist.find({ owner: user._id, isPublic: true })
      .select('title coverImage songs followersCount')
      .limit(10);

    res.status(200).json({
      success: true,
      data: { ...user.toJSON(), playlists },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update user profile
 * @route PATCH /api/users/:id
 * @access Private (Own profile)
 */
const updateProfile = async (req, res, next) => {
  try {
    // Only allow users to update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile.' });
    }

    const { username, bio } = req.body;
    const updates = {};

    if (username) {
      // Check if username taken by another user
      const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (exists) return res.status(409).json({ success: false, message: 'Username already taken.' });
      updates.username = username;
    }

    if (bio !== undefined) updates.bio = bio;

    // Upload new profile image if provided
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'profile-images', 'image');
      updates.profileImage = result.url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password -refreshToken');

    res.status(200).json({ success: true, message: 'Profile updated.', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get user's play history
 * @route GET /api/users/:id/history
 * @access Private (Own history)
 */
const getPlayHistory = async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const history = await PlayHistory.find({ user: req.user._id })
      .populate({
        path: 'song',
        select: 'title coverImage duration audioUrl',
        populate: { path: 'artist', select: 'username profileImage' },
      })
      .sort({ playedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Follow or unfollow an artist
 * @route POST /api/users/:id/follow
 * @access Private
 */
const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found.' });

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(targetId);

    if (isFollowing) {
      currentUser.following.pull(targetId);
      targetUser.followers.pull(req.user._id);
    } else {
      currentUser.following.addToSet(targetId);
      targetUser.followers.addToSet(req.user._id);
    }

    await Promise.all([
      currentUser.save({ validateBeforeSave: false }),
      targetUser.save({ validateBeforeSave: false }),
    ]);

    res.status(200).json({
      success: true,
      message: isFollowing ? 'Unfollowed.' : 'Following.',
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get recently played songs for a user
 * @route GET /api/users/:id/recently-played
 * @access Private
 */
const getRecentlyPlayed = async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Get unique songs, most recently played first
    const history = await PlayHistory.aggregate([
      { $match: { user: req.user._id } },
      { $sort: { playedAt: -1 } },
      { $group: { _id: '$song', playedAt: { $first: '$playedAt' } } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: '_id',
          as: 'song',
        },
      },
      { $unwind: '$song' },
    ]);

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get user's liked songs
 * @route GET /api/users/:id/liked-songs
 * @access Private
 */
const getLikedSongs = async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const user = await User.findById(req.user._id).populate({
      path: 'likedSongs',
      populate: { path: 'artist', select: 'username profileImage' },
    });

    res.status(200).json({ success: true, data: user.likedSongs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  getPlayHistory,
  followUser,
  getRecentlyPlayed,
  getLikedSongs,
};
