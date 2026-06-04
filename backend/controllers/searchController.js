const Song = require('../models/Song');
const Album = require('../models/Album');
const Playlist = require('../models/Playlist');
const User = require('../models/User');

/**
 * @desc  Search across songs, albums, artists, and playlists
 * @route GET /api/search?q=query&type=song|album|artist|playlist&genre=&mood=&year=
 * @access Public
 */
const search = async (req, res, next) => {
  try {
    const { q, type, genre, mood, year } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const limit = 10;

    const results = {};

    // Search songs
    if (!type || type === 'song') {
      const songQuery = {
        isPublic: true,
        $or: [{ title: searchRegex }],
      };
      if (genre) songQuery.genre = genre;
      if (mood) songQuery.mood = mood;
      if (year) songQuery.releaseYear = parseInt(year);

      results.songs = await Song.find(songQuery)
        .populate('artist', 'username profileImage')
        .populate('album', 'title coverImage')
        .sort({ plays: -1 })
        .limit(limit);
    }

    // Search albums
    if (!type || type === 'album') {
      const albumQuery = { isPublic: true, title: searchRegex };
      if (genre) albumQuery.genre = genre;

      results.albums = await Album.find(albumQuery)
        .populate('artist', 'username profileImage')
        .sort({ plays: -1 })
        .limit(limit);
    }

    // Search artists (users with role artist)
    if (!type || type === 'artist') {
      results.artists = await User.find({
        role: 'artist',
        isActive: true,
        $or: [{ username: searchRegex }],
      })
        .select('username profileImage bio followers')
        .limit(limit);
    }

    // Search playlists
    if (!type || type === 'playlist') {
      results.playlists = await Playlist.find({
        isPublic: true,
        $or: [{ title: searchRegex }, { description: searchRegex }],
      })
        .populate('owner', 'username profileImage')
        .sort({ 'followers.length': -1 })
        .limit(limit);
    }

    res.status(200).json({ success: true, query: q, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get trending search terms (based on most played songs)
 * @route GET /api/search/trending
 * @access Public
 */
const getTrendingSearches = async (req, res, next) => {
  try {
    const trending = await Song.find({ isPublic: true })
      .select('title genre')
      .sort({ plays: -1 })
      .limit(10);

    const terms = trending.map((s) => s.title);
    const genres = [...new Set(trending.map((s) => s.genre))].slice(0, 5);

    res.status(200).json({ success: true, data: { terms, genres } });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, getTrendingSearches };
