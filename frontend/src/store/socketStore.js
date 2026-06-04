/**
 * Socket Store — Zustand
 * Manages Socket.io connection and real-time state
 */
import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  activityFeed: [],     // Friend activity
  notifications: [],    // Unread notifications
  songListeners: {},    // songId -> count

  connect: (accessToken) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    // Friend activity
    socket.on('activity:feed', (activity) => {
      set((s) => ({
        activityFeed: [activity, ...s.activityFeed].slice(0, 20),
      }));
    });

    // Live song listener count
    socket.on('song:listeners', ({ songId, count }) => {
      set((s) => ({
        songListeners: { ...s.songListeners, [songId]: count },
      }));
    });

    // Notifications
    socket.on('notification:receive', (notification) => {
      set((s) => ({
        notifications: [
          { ...notification, id: Date.now(), read: false },
          ...s.notifications,
        ].slice(0, 50),
      }));
    });

    // Online/offline users
    socket.on('user:online', (user) => {
      set((s) => ({
        onlineUsers: [...s.onlineUsers.filter((u) => u.userId !== user.userId), user],
      }));
    });

    socket.on('user:offline', ({ userId }) => {
      set((s) => ({
        onlineUsers: s.onlineUsers.filter((u) => u.userId !== userId),
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // Emit player events
  emitSongPlay: (songId, songTitle) => {
    get().socket?.emit('song:play', { songId, songTitle });
  },

  emitSongStop: (songId) => {
    get().socket?.emit('song:stop', { songId });
  },

  // Playlist collaboration
  joinPlaylistRoom: (playlistId) => {
    get().socket?.emit('playlist:join', { playlistId });
  },

  leavePlaylistRoom: (playlistId) => {
    get().socket?.emit('playlist:leave', { playlistId });
  },

  emitPlaylistUpdate: (data) => {
    get().socket?.emit('playlist:update', data);
  },

  markNotificationsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearActivity: () => set({ activityFeed: [] }),
}));

export default useSocketStore;
