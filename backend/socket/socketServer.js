/**
 * Socket.io Server
 * Handles real-time features:
 * - Live listener count per song
 * - Friend activity feed
 * - Playlist collaboration
 * - Notifications
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory stores (use Redis in production for scalability)
const onlineUsers = new Map();    // userId -> socketId
const songListeners = new Map();  // songId -> Set of userIds

const initSocket = (io) => {
  // Middleware: authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        // Allow unauthenticated connections for public data
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('username profileImage role');
      socket.user = user;
      next();
    } catch (err) {
      socket.user = null;
      next(); // Allow connection but without auth
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?._id?.toString();

    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log(`🟢 User connected: ${socket.user.username} (${socket.id})`);

      // Notify friends this user is online
      socket.broadcast.emit('user:online', {
        userId,
        username: socket.user.username,
        profileImage: socket.user.profileImage,
      });
    }

    // ── Song Listening Events ──────────────────────────────────

    /**
     * User starts playing a song
     * Payload: { songId, songTitle }
     */
    socket.on('song:play', ({ songId, songTitle }) => {
      if (!songId) return;

      // Track listener
      if (!songListeners.has(songId)) {
        songListeners.set(songId, new Set());
      }
      songListeners.get(songId).add(socket.id);

      const listenerCount = songListeners.get(songId).size;

      // Broadcast updated listener count to all clients watching this song
      io.emit('song:listeners', { songId, count: listenerCount });

      // Broadcast friend activity to followers
      if (socket.user) {
        socket.broadcast.emit('activity:feed', {
          userId,
          username: socket.user.username,
          profileImage: socket.user.profileImage,
          songId,
          songTitle,
          action: 'playing',
          timestamp: new Date().toISOString(),
        });
      }
    });

    /**
     * User stops playing a song
     * Payload: { songId }
     */
    socket.on('song:stop', ({ songId }) => {
      if (songId && songListeners.has(songId)) {
        songListeners.get(songId).delete(socket.id);
        const count = songListeners.get(songId).size;
        io.emit('song:listeners', { songId, count });
        if (count === 0) songListeners.delete(songId);
      }
    });

    // ── Playlist Collaboration ────────────────────────────────

    /**
     * Join a playlist collaboration room
     * Payload: { playlistId }
     */
    socket.on('playlist:join', ({ playlistId }) => {
      socket.join(`playlist:${playlistId}`);
    });

    /**
     * Leave a playlist room
     */
    socket.on('playlist:leave', ({ playlistId }) => {
      socket.leave(`playlist:${playlistId}`);
    });

    /**
     * Broadcast playlist update to all collaborators
     * Payload: { playlistId, action, songId, songTitle }
     */
    socket.on('playlist:update', (data) => {
      socket.to(`playlist:${data.playlistId}`).emit('playlist:updated', {
        ...data,
        by: socket.user?.username || 'Someone',
      });
    });

    // ── Notifications ─────────────────────────────────────────

    /**
     * Send a notification to a specific user
     * Used by backend to push events like "new song by followed artist"
     */
    socket.on('notification:send', ({ targetUserId, notification }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('notification:receive', notification);
      }
    });

    // ── Disconnection ─────────────────────────────────────────

    socket.on('disconnect', () => {
      if (userId) {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user:offline', { userId });
        console.log(`🔴 User disconnected: ${socket.user?.username} (${socket.id})`);
      }

      // Remove from all song listeners
      songListeners.forEach((listeners, songId) => {
        if (listeners.has(socket.id)) {
          listeners.delete(socket.id);
          io.emit('song:listeners', { songId, count: listeners.size });
        }
      });
    });
  });

  console.log('✅ Socket.io initialized');
};

// Utility to push notification to online user (callable from controllers)
const notifyUser = (io, userId, notification) => {
  const onlineUsersMap = onlineUsers;
  const socketId = onlineUsersMap.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification:receive', notification);
  }
};

module.exports = { initSocket, notifyUser };
