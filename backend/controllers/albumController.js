const Album = require('../models/Album');
const Song = require('../models/Song');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

/**
 * @desc  Get all public albums
 * @route GET /api/albums
 * @access Public
 */
const getAlbums = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const genre = req.query.genre;
    const artistId = req.query.artist;

    const query = { isPublic: true };
    if (genre) query.genre = genre;
    if (artistId) query.artist = artistId;

    const [albums, total] = await Promise.all([
      Album.find(query)
        .populate('artist', 'username profileImage')
        .sort({ releaseDate: -1 })
        .skip(skip)
        .limit(limit),
      Album.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: albums,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get single album with all songs
 * @route GET /api/albums/:id
 * @access Public
 */
const getAlbumById = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate('artist', 'username profileImage bio followers')
      .populate({
        path: 'songs',
        populate: { path: 'artist', select: 'username profileImage' },
      });

    if (!album || (!album.isPublic && (!req.user || album.artist._id.toString() !== req.user._id.toString()))) {
      return res.status(404).json({ success: false, message: 'Album not found.' });
    }

    res.status(200).json({ success: true, data: album });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Create a new album
 * @route POST /api/albums
 * @access Private (Artist, Admin)
 */
const createAlbum = async (req, res, next) => {
  try {
    const { title, genre, releaseDate, description, isPublic } = req.body;

    let coverImageUrl = '';
    let coverImagePublicId = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'album-covers', 'image');
      coverImageUrl = result.url;
      coverImagePublicId = result.publicId;
    }

    const album = await Album.create({
      title,
      artist: req.user._id,
      genre,
      releaseDate: releaseDate || new Date(),
      description,
      isPublic: isPublic !== undefined ? isPublic : true,
      coverImage: coverImageUrl,
      coverImagePublicId,
    });

    const populated = await album.populate('artist', 'username profileImage');

    res.status(201).json({ success: true, message: 'Album created.', data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete an album
 * @route DELETE /api/albums/:id
 * @access Private (Owner Artist, Admin)
 */
const deleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    if (req.user.role !== 'admin' && album.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Delete cover image from Cloudinary
    if (album.coverImagePublicId) {
      await deleteFromCloudinary(album.coverImagePublicId, 'image');
    }

    // Detach songs from this album
    await Song.updateMany({ album: album._id }, { $set: { album: null } });

    await album.deleteOne();

    res.status(200).json({ success: true, message: 'Album deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAlbums, getAlbumById, createAlbum, deleteAlbum };
