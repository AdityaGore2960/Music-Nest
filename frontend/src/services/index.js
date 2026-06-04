import api from './api';

// Auth API calls
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.patch(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  getMe: () => api.get('/auth/me'),
};

// Song API calls
export const songService = {
  getAll: (params) => api.get('/songs', { params }),
  getTrending: (limit = 10) => api.get('/songs/trending', { params: { limit } }),
  getNewReleases: () => api.get('/songs/new-releases'),
  getById: (id) => api.get(`/songs/${id}`),
  upload: (formData) => api.post('/songs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      return percent;
    },
  }),
  delete: (id) => api.delete(`/songs/${id}`),
  like: (id) => api.patch(`/songs/${id}/like`),
};

// Album API calls
export const albumService = {
  getAll: (params) => api.get('/albums', { params }),
  getById: (id) => api.get(`/albums/${id}`),
  create: (formData) => api.post('/albums', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/albums/${id}`),
};

// Playlist API calls
export const playlistService = {
  getById: (id) => api.get(`/playlists/${id}`),
  create: (data) => api.post('/playlists', data),
  update: (id, data) => api.patch(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
  addSong: (id, songId) => api.post(`/playlists/${id}/songs`, { songId }),
  removeSong: (id, songId) => api.delete(`/playlists/${id}/songs/${songId}`),
  reorder: (id, songs) => api.patch(`/playlists/${id}/reorder`, { songs }),
};

// User API calls
export const userService = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (id, formData) => api.patch(`/users/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getHistory: (id, params) => api.get(`/users/${id}/history`, { params }),
  getRecentlyPlayed: (id) => api.get(`/users/${id}/recently-played`),
  getLikedSongs: (id) => api.get(`/users/${id}/liked-songs`),
  follow: (id) => api.post(`/users/${id}/follow`),
};

// Search API calls
export const searchService = {
  search: (params) => api.get('/search', { params }),
  getTrending: () => api.get('/search/trending'),
};

// Admin API calls
export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleBan: (id) => api.patch(`/admin/users/${id}/ban`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// MusicBrainz (external music metadata) API calls
export const musicBrainzService = {
  searchSongs: (q, limit = 20, offset = 0) =>
    api.get('/musicbrainz/search/songs', { params: { q, limit, offset } }),
  searchArtists: (q, limit = 20) =>
    api.get('/musicbrainz/search/artists', { params: { q, limit } }),
  getArtist: (mbid) => api.get(`/musicbrainz/artist/${mbid}`),
  getCoverArt: (mbid) => api.get(`/musicbrainz/cover/${mbid}`),
};

// Jamendo API — real audio streams + cover art (free, open music)
export const jamendoService = {
  searchTracks: (q, limit = 20, offset = 0) =>
    api.get('/jamendo/tracks/search', { params: { q, limit, offset } }),
  getFeaturedTracks: (limit = 20, order = 'popularity_total') =>
    api.get('/jamendo/tracks/featured', { params: { limit, order } }),
  getArtistTracks: (artistId, limit = 10) =>
    api.get(`/jamendo/tracks/artist/${artistId}`, { params: { limit } }),
  searchArtists: (q, limit = 20) =>
    api.get('/jamendo/artists/search', { params: { q, limit } }),
};
