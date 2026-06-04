/**
 * MusicBrainz API Routes
 * Proxy routes to MusicBrainz & Cover Art Archive APIs
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org';
const USER_AGENT = 'MusicNest/1.0 (musicnest-app@example.com)';

const mbHeaders = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json',
};

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Safely fetch cover art for a release-group MBID.
 * Returns null instead of throwing when the archive has no art (404).
 */
async function fetchCoverArt(mbid) {
  try {
    const { data } = await axios.get(`${CAA_BASE}/release-group/${mbid}`, {
      headers: mbHeaders,
      timeout: 5000,
    });
    // Return the front-image URL from the first image in the list
    const front = data.images?.find((img) => img.front) || data.images?.[0];
    return front?.thumbnails?.['500'] || front?.thumbnails?.large || front?.image || null;
  } catch {
    return null;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * @desc  Search recordings (songs) on MusicBrainz
 * @route GET /api/musicbrainz/search/songs?q=<query>&limit=20&offset=0
 * @access Public
 */
router.get('/search/songs', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required.' });
    }

    const { data } = await axios.get(`${MB_BASE}/recording/`, {
      params: { query: q.trim(), fmt: 'json', limit, offset },
      headers: mbHeaders,
      timeout: 10000,
    });

    // Enrich with cover art (first 5 to avoid rate-limit hammering)
    const recordings = data.recordings || [];
    const enriched = await Promise.all(
      recordings.slice(0, 20).map(async (rec) => {
        const releaseGroupMbid =
          rec.releases?.[0]?.['release-group']?.id || null;
        const coverArt = releaseGroupMbid ? await fetchCoverArt(releaseGroupMbid) : null;
        return {
          id: rec.id,
          title: rec.title,
          artist: rec['artist-credit']?.[0]?.name || 'Unknown Artist',
          artistId: rec['artist-credit']?.[0]?.artist?.id || null,
          album: rec.releases?.[0]?.title || null,
          albumId: rec.releases?.[0]?.id || null,
          releaseGroupId: releaseGroupMbid,
          duration: rec.length ? Math.round(rec.length / 1000) : null, // seconds
          year: rec.releases?.[0]?.date?.slice(0, 4) || null,
          coverArt,
          score: rec.score,
        };
      })
    );

    res.json({
      success: true,
      query: q,
      total: data.count,
      offset: data.offset,
      songs: enriched,
    });
  } catch (err) {
    console.error('MusicBrainz song search error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to search songs.', error: err.message });
  }
});

/**
 * @desc  Search artists on MusicBrainz
 * @route GET /api/musicbrainz/search/artists?q=<query>&limit=20
 * @access Public
 */
router.get('/search/artists', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required.' });
    }

    const { data } = await axios.get(`${MB_BASE}/artist`, {
      params: { query: q.trim(), fmt: 'json', limit },
      headers: mbHeaders,
      timeout: 10000,
    });

    const artists = (data.artists || []).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type || 'Unknown',
      country: a.country || null,
      disambiguation: a.disambiguation || null,
      score: a.score,
      tags: a.tags?.slice(0, 5).map((t) => t.name) || [],
    }));

    res.json({ success: true, query: q, total: data.count, artists });
  } catch (err) {
    console.error('MusicBrainz artist search error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to search artists.', error: err.message });
  }
});

/**
 * @desc  Get artist details + release groups (albums) by MBID
 * @route GET /api/musicbrainz/artist/:mbid
 * @access Public
 */
router.get('/artist/:mbid', async (req, res) => {
  try {
    const { mbid } = req.params;
    const { data } = await axios.get(`${MB_BASE}/artist/${mbid}`, {
      params: { inc: 'release-groups', fmt: 'json' },
      headers: mbHeaders,
      timeout: 10000,
    });

    // Fetch cover art for each release group (limit to 12)
    const releaseGroups = (data['release-groups'] || []).slice(0, 12);
    const albumsWithArt = await Promise.all(
      releaseGroups.map(async (rg) => ({
        id: rg.id,
        title: rg.title,
        type: rg['primary-type'] || rg.type || 'Unknown',
        year: rg['first-release-date']?.slice(0, 4) || null,
        coverArt: await fetchCoverArt(rg.id),
      }))
    );

    res.json({
      success: true,
      artist: {
        id: data.id,
        name: data.name,
        type: data.type || null,
        country: data.country || null,
        disambiguation: data.disambiguation || null,
        lifeSpan: data['life-span'] || null,
        tags: data.tags?.slice(0, 10).map((t) => t.name) || [],
        albums: albumsWithArt,
      },
    });
  } catch (err) {
    console.error('MusicBrainz artist detail error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch artist.', error: err.message });
  }
});

/**
 * @desc  Get cover art for a release-group MBID
 * @route GET /api/musicbrainz/cover/:mbid
 * @access Public
 */
router.get('/cover/:mbid', async (req, res) => {
  try {
    const { mbid } = req.params;
    const { data } = await axios.get(`${CAA_BASE}/release-group/${mbid}`, {
      headers: mbHeaders,
      timeout: 8000,
    });
    res.json({ success: true, images: data.images || [] });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.json({ success: true, images: [] });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch cover art.', error: err.message });
  }
});

module.exports = router;
