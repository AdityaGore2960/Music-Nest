const axios = require('axios');

/**
 * @desc  Add tracks to Spotify playlist via RapidAPI
 * @route POST /api/spotify/addTracks
 * @access Private
 */
const addTracksToPlaylist = async (req, res, next) => {
  try {
    const { userId, accessToken, playlistId, position } = req.body;

    if (!userId || !accessToken || !playlistId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: userId, accessToken, or playlistId' 
      });
    }

    const options = {
      method: 'POST',
      url: 'https://spotifystefan-skliarovv1.p.rapidapi.com/addTracksToPlaylist',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-rapidapi-host': 'Spotifystefan-skliarovV1.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      },
      data: new URLSearchParams({
        userId,
        accessToken,
        playlistId,
        position: position || ''
      }).toString()
    };

    const response = await axios.request(options);

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Spotify API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add tracks to Spotify playlist',
      error: error.response?.data || error.message
    });
  }
};

const searchSongs = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required' });
    }

    const options = {
      method: 'GET',
      url: 'https://spotify23.p.rapidapi.com/search/',
      params: {
        q: q,
        type: 'tracks',
        offset: '0',
        limit: '20',
        numberOfTopResults: '5'
      },
      headers: {
        'x-rapidapi-host': 'spotify23.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      }
    };

    const response = await axios.request(options);

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Spotify Search API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search songs',
      error: error.response?.data || error.message
    });
  }
};

const getTrack = async (req, res, next) => {
  try {
    const { id } = req.params;

    const options = {
      method: 'GET',
      url: 'https://spotify23.p.rapidapi.com/tracks/',
      params: { ids: id },
      headers: {
        'x-rapidapi-host': 'spotify23.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      }
    };

    const response = await axios.request(options);

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Spotify Track API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch track',
      error: error.response?.data || error.message
    });
  }
};

const getLyrics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const options = {
      method: 'GET',
      url: 'https://spotify23.p.rapidapi.com/track_lyrics/',
      params: { id: id },
      headers: {
        'x-rapidapi-host': 'spotify23.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
      }
    };

    const response = await axios.request(options);

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Spotify Lyrics API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lyrics',
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  addTracksToPlaylist,
  searchSongs,
  getTrack,
  getLyrics
};
