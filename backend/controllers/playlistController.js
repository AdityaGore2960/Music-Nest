const Playlist = require('../models/Playlist');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

/**
 * @desc  Get a playlist by ID
 * @route GET /api/playlists/:id
 * @access Public (if public) / Private (if private)
 */
const getPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('owner', 'username profileImage')
      .populate('collaborators', 'username profileImage')
      .populate({
        path: 'songs',
        populate: { path: 'artist', select: 'username profileImage' },
      });

    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    // Check access for private playlists
    if (!playlist.isPublic) {
      if (!req.user) return res.status(403).json({ success: false, message: 'This playlist is private.' });
      const isOwner = playlist.owner._id.toString() === req.user._id.toString();
      const isCollaborator = playlist.collaborators.some(c => c._id.toString() === req.user._id.toString());
      if (!isOwner && !isCollaborator && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'This playlist is private.' });
      }
    }

    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Create a new playlist
 * @route POST /api/playlists
 * @access Private
 */
const createPlaylist = async (req, res, next) => {
  try {
    const { title, description, isPublic } = req.body;

    let coverImageUrl = '';
    let coverImagePublicId = '';
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'playlist-covers', 'image');
      coverImageUrl = result.url;
      coverImagePublicId = result.publicId;
    }

    const playlist = await Playlist.create({
      title,
      description,
      owner: req.user._id,
      isPublic: isPublic !== undefined ? isPublic : true,
      coverImage: coverImageUrl,
      coverImagePublicId,
    });

    res.status(201).json({ success: true, message: 'Playlist created.', data: playlist });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update playlist metadata
 * @route PATCH /api/playlists/:id
 * @access Private (Owner, Collaborator)
 */
const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    const isOwner = playlist.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const { title, description, isPublic } = req.body;
    if (title) playlist.title = title;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    // Update cover image if new file provided
    if (req.file) {
      if (playlist.coverImagePublicId) {
        await deleteFromCloudinary(playlist.coverImagePublicId, 'image');
      }
      const result = await uploadToCloudinary(req.file.buffer, 'playlist-covers', 'image');
      playlist.coverImage = result.url;
      playlist.coverImagePublicId = result.publicId;
    }

    await playlist.save();

    res.status(200).json({ success: true, message: 'Playlist updated.', data: playlist });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete a playlist
 * @route DELETE /api/playlists/:id
 * @access Private (Owner, Admin)
 */
const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    if (playlist.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (playlist.coverImagePublicId) {
      await deleteFromCloudinary(playlist.coverImagePublicId, 'image');
    }

    // Remove from all users' liked playlists
    await User.updateMany({ likedPlaylists: playlist._id }, { $pull: { likedPlaylists: playlist._id } });

    await playlist.deleteOne();
    res.status(200).json({ success: true, message: 'Playlist deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Add song to playlist
 * @route POST /api/playlists/:id/songs
 * @access Private (Owner, Collaborator)
 */
const addSongToPlaylist = async (req, res, next) => {
  try {
    const { songId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    const isOwner = playlist.owner.toString() === req.user._id.toString();
    const isCollaborator = playlist.collaborators.includes(req.user._id);

    if (!isOwner && !isCollaborator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (playlist.songs.includes(songId)) {
      return res.status(409).json({ success: false, message: 'Song already in playlist.' });
    }

    playlist.songs.push(songId);
    await playlist.save();

    res.status(200).json({ success: true, message: 'Song added to playlist.', data: playlist });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Remove song from playlist
 * @route DELETE /api/playlists/:id/songs/:songId
 * @access Private (Owner, Collaborator)
 */
const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { id, songId } = req.params;
    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    const isOwner = playlist.owner.toString() === req.user._id.toString();
    const isCollaborator = playlist.collaborators.includes(req.user._id);

    if (!isOwner && !isCollaborator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    playlist.songs.pull(songId);
    await playlist.save();

    res.status(200).json({ success: true, message: 'Song removed from playlist.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Reorder songs in a playlist
 * @route PATCH /api/playlists/:id/reorder
 * @access Private (Owner)
 */
const reorderPlaylist = async (req, res, next) => {
  try {
    const { songs } = req.body; // Array of song IDs in new order
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found.' });

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    playlist.songs = songs;
    await playlist.save();

    res.status(200).json({ success: true, message: 'Playlist reordered.', data: playlist });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylist,
};
