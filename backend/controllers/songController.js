const Song = require('../models/Song');
const Album = require('../models/Album');
const PlayHistory = require('../models/PlayHistory');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

/**
 * @desc  Get all public songs with pagination
 * @route GET /api/songs
 * @access Public
 */
const getSongs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const genre = req.query.genre;
    const mood = req.query.mood;

    const query = { isPublic: true };
    if (genre) query.genre = genre;
    if (mood) query.mood = mood;

    const [songs, total] = await Promise.all([
      Song.find(query)
        .populate('artist', 'username profileImage')
        .populate('album', 'title coverImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Song.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: songs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get trending songs (most played in last 7 days)
 * @route GET /api/songs/trending
 * @access Public
 */
const getTrendingSongs = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = parseInt(req.query.limit) || 10;

    // Aggregate play history to find most played songs recently
    const trending = await PlayHistory.aggregate([
      { $match: { playedAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$song', playCount: { $sum: 1 } } },
      { $sort: { playCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: '_id',
          as: 'song',
        },
      },
      { $unwind: '$song' },
      { $match: { 'song.isPublic': true } },
    ]);

    // Fallback: if not enough play history, get most played overall
    if (trending.length < limit) {
      const songs = await Song.find({ isPublic: true })
        .populate('artist', 'username profileImage')
        .populate('album', 'title coverImage')
        .sort({ plays: -1 })
        .limit(limit);
      return res.status(200).json({ success: true, data: songs });
    }

    // Populate artist data for trending songs
    const songIds = trending.map((t) => t._id);
    const songs = await Song.find({ _id: { $in: songIds }, isPublic: true })
      .populate('artist', 'username profileImage')
      .populate('album', 'title coverImage');

    res.status(200).json({ success: true, data: songs });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get single song by ID + increment play count
 * @route GET /api/songs/:id
 * @access Public
 */
const getSongById = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('artist', 'username profileImage bio followers')
      .populate('album', 'title coverImage releaseDate');

    if (!song || (!song.isPublic && (!req.user || song.artist._id.toString() !== req.user._id.toString()))) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    // Increment play count
    await Song.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } });

    // Record play history if user is logged in
    if (req.user) {
      await PlayHistory.create({
        user: req.user._id,
        song: song._id,
      });
    }

    res.status(200).json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Upload a new song
 * @route POST /api/songs
 * @access Private (Artist, Admin)
 */
const uploadSong = async (req, res, next) => {
  try {
    const { title, genre, mood, lyrics, isPublic, albumId, releaseYear } = req.body;

    if (!req.files?.audio) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    // Upload audio to Cloudinary
    const audioResult = await uploadToCloudinary(req.files.audio[0].buffer, 'songs', 'video');

    // Upload cover image if provided
    let coverImageUrl = '';
    let coverImagePublicId = '';
    if (req.files?.coverImage) {
      const imgResult = await uploadToCloudinary(req.files.coverImage[0].buffer, 'covers', 'image');
      coverImageUrl = imgResult.url;
      coverImagePublicId = imgResult.publicId;
    }

    const song = await Song.create({
      title,
      artist: req.user._id,
      album: albumId || null,
      genre,
      mood,
      lyrics,
      isPublic: isPublic !== undefined ? isPublic : true,
      releaseYear: releaseYear || new Date().getFullYear(),
      audioUrl: audioResult.url,
      audioPublicId: audioResult.publicId,
      duration: Math.round(audioResult.duration || 0),
      coverImage: coverImageUrl,
      coverImagePublicId,
    });

    // If albumId provided, add song to album
    if (albumId) {
      await Album.findByIdAndUpdate(albumId, { $addToSet: { songs: song._id } });
    }

    const populated = await song.populate('artist', 'username profileImage');

    res.status(201).json({ success: true, message: 'Song uploaded successfully.', data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete a song
 * @route DELETE /api/songs/:id
 * @access Private (Owner Artist, Admin)
 */
const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    // Check ownership (admins can delete any)
    if (req.user.role !== 'admin' && song.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this song.' });
    }

    // Delete files from Cloudinary
    if (song.audioPublicId) {
      await deleteFromCloudinary(song.audioPublicId, 'video');
    }
    if (song.coverImagePublicId) {
      await deleteFromCloudinary(song.coverImagePublicId, 'image');
    }

    // Remove from all albums
    await Album.updateMany({ songs: song._id }, { $pull: { songs: song._id } });

    // Remove from all users' liked songs
    await User.updateMany({ likedSongs: song._id }, { $pull: { likedSongs: song._id } });

    await song.deleteOne();

    res.status(200).json({ success: true, message: 'Song deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Like or unlike a song
 * @route PATCH /api/songs/:id/like
 * @access Private
 */
const likeSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });

    const user = await User.findById(req.user._id);
    const isLiked = user.likedSongs.includes(song._id);

    if (isLiked) {
      // Unlike
      user.likedSongs.pull(song._id);
      await Song.findByIdAndUpdate(song._id, { $inc: { likes: -1 } });
    } else {
      // Like
      user.likedSongs.addToSet(song._id);
      await Song.findByIdAndUpdate(song._id, { $inc: { likes: 1 } });
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: isLiked ? 'Song unliked.' : 'Song liked.',
      isLiked: !isLiked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get new releases (songs from last 30 days)
 * @route GET /api/songs/new-releases
 * @access Public
 */
const getNewReleases = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const songs = await Song.find({
      isPublic: true,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .populate('artist', 'username profileImage')
      .populate('album', 'title coverImage')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, data: songs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSongs,
  getTrendingSongs,
  getSongById,
  uploadSong,
  deleteSong,
  likeSong,
  getNewReleases,
};
