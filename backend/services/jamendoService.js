/**
 * Jamendo API Service
 * Wraps the Jamendo v3.0 API — provides real audio stream URLs and cover art.
 * Docs: https://developer.jamendo.com/v3.0
 */

const axios = require('axios');

const BASE_URL = 'https://api.jamendo.com/v3.0';

// Use env var if set, otherwise fall back to Jamendo's official public demo client_id.
// Demo key is fine for development; get your own free key at https://devportal.jamendo.com
const DEMO_CLIENT_ID = 'b6747d04';
const getClientId = () => process.env.JAMENDO_CLIENT_ID || DEMO_CLIENT_ID;


/**
 * Search tracks by name.
 * Returns tracks with audio stream URLs and cover images.
 *
 * @param {string} query
 * @param {number} limit
 * @param {number} offset
 */
const searchTracks = async (query, limit = 20, offset = 0) => {
  const { data } = await axios.get(`${BASE_URL}/tracks`, {
    params: {
      client_id: getClientId(),
      format: 'json',
      namesearch: query,
      limit,
      offset,
      // Request full audio + cover image in the response
      include: 'musicinfo',
      imagesize: 500,
      audioformat: 'mp32', // high-quality MP3 stream
    },
    timeout: 10000,
  });

  return {
    total: data.headers?.results_count ?? data.results?.length ?? 0,
    results: (data.results || []).map(normalizeTrack),
  };
};

/**
 * Search artists by name.
 *
 * @param {string} name
 * @param {number} limit
 */
const searchArtists = async (name, limit = 20) => {
  const { data } = await axios.get(`${BASE_URL}/artists`, {
    params: {
      client_id: getClientId(),
      format: 'json',
      namesearch: name,
      limit,
      imagesize: 500,
    },
    timeout: 10000,
  });

  return {
    total: data.headers?.results_count ?? data.results?.length ?? 0,
    results: (data.results || []).map(normalizeArtist),
  };
};

/**
 * Get top / featured tracks (used for the Discover landing state).
 *
 * @param {number} limit
 * @param {'popularity_total'|'releasedate'} orderBy
 */
const getFeaturedTracks = async (limit = 20, orderBy = 'popularity_total') => {
  const { data } = await axios.get(`${BASE_URL}/tracks`, {
    params: {
      client_id: getClientId(),
      format: 'json',
      limit,
      order: orderBy,
      imagesize: 500,
      audioformat: 'mp32',
      include: 'musicinfo',
    },
    timeout: 10000,
  });

  return {
    total: data.headers?.results_count ?? data.results?.length ?? 0,
    results: (data.results || []).map(normalizeTrack),
  };
};

/**
 * Get tracks by a specific artist ID.
 *
 * @param {string} artistId
 * @param {number} limit
 */
const getArtistTracks = async (artistId, limit = 10) => {
  const { data } = await axios.get(`${BASE_URL}/tracks`, {
    params: {
      client_id: getClientId(),
      format: 'json',
      artist_id: artistId,
      limit,
      imagesize: 500,
      audioformat: 'mp32',
    },
    timeout: 10000,
  });

  return (data.results || []).map(normalizeTrack);
};

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeTrack(t) {
  return {
    id: t.id,
    title: t.name,
    artist: t.artist_name,
    artistId: t.artist_id,
    album: t.album_name || null,
    albumId: t.album_id || null,
    audio: t.audio,           // streamable MP3 URL
    audioDownload: t.audiodownload || null,
    image: t.image || null,   // cover art URL
    duration: t.duration || null, // seconds
    releaseDate: t.releasedate || null,
    year: t.releasedate ? t.releasedate.slice(0, 4) : null,
    genre: t.musicinfo?.tags?.genres?.[0] || null,
    license: t.license_ccurl || null,
    shareUrl: t.shareurl || null,
  };
}

function normalizeArtist(a) {
  return {
    id: a.id,
    name: a.name,
    image: a.image || null,
    website: a.website || null,
    joindate: a.joindate || null,
    shareUrl: a.shareurl || null,
  };
}

module.exports = { searchTracks, searchArtists, getFeaturedTracks, getArtistTracks };
