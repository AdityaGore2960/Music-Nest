/**
 * Player Store — Zustand
 * Controls Howler.js music playback state
 * Manages queue, shuffle, repeat, volume, and seek
 */
import { create } from 'zustand';
import { Howl } from 'howler';

let howlInstance = null;
let progressInterval = null;

const clearProgress = () => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
};

const usePlayerStore = create((set, get) => ({
  // Current song
  currentSong: null,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: 0.8,
  isMuted: false,

  // Queue
  queue: [],
  queueIndex: 0,

  // Modes
  isShuffle: false,
  repeatMode: 'off', // 'off' | 'all' | 'one'

  // Metadata
  isLoading: false,
  error: null,

  /**
   * Load and play a song
   * If a queue is provided, replaces the current queue
   */
  playSong: (song, queue = null, queueIndex = 0) => {
    const state = get();

    // Resolve the audio source — local songs use audioUrl, Jamendo tracks use audio
    const audioSrc = song.audioUrl || song.audio;

    // Resolve unique ID — local songs use _id, Jamendo tracks use id
    const songId = song._id || song.id;
    const currentId = state.currentSong?._id || state.currentSong?.id;

    // If same song, just toggle play
    if (currentId && currentId === songId && howlInstance) {
      if (state.isPlaying) {
        howlInstance.pause();
        clearProgress();
        set({ isPlaying: false });
      } else {
        howlInstance.play();
        get()._startProgressTracking();
        set({ isPlaying: true });
      }
      return;
    }

    // Stop existing playback
    if (howlInstance) {
      howlInstance.unload();
      howlInstance = null;
    }
    clearProgress();

    set({ isLoading: true, error: null, currentSong: song, currentTime: 0 });

    if (queue) {
      set({ queue, queueIndex });
    }

    howlInstance = new Howl({
      src: [audioSrc],
      html5: true, // Enable streaming
      volume: state.isMuted ? 0 : state.volume,
      onplay: () => {
        set({ isPlaying: true, isLoading: false, duration: howlInstance.duration() });
        get()._startProgressTracking();

        // Dispatch socket event
        window.dispatchEvent(new CustomEvent('player:play', {
          detail: { songId: song._id, songTitle: song.title },
        }));
      },
      onpause: () => {
        clearProgress();
        set({ isPlaying: false });
      },
      onstop: () => {
        clearProgress();
        set({ isPlaying: false, currentTime: 0 });
      },
      onend: () => {
        clearProgress();
        get()._handleSongEnd();
      },
      onerror: (id, err) => {
        clearProgress();
        set({ isLoading: false, isPlaying: false, error: 'Failed to load audio' });
        console.error('Howl error:', err);
      },
      onload: () => {
        set({ duration: howlInstance.duration(), isLoading: false });
      },
    });

    howlInstance.play();
  },

  togglePlay: () => {
    if (!howlInstance) return;
    const { isPlaying } = get();
    if (isPlaying) {
      howlInstance.pause();
    } else {
      howlInstance.play();
    }
  },

  playNext: () => {
    const { queue, queueIndex, isShuffle, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      // Replay current song
      howlInstance?.seek(0);
      howlInstance?.play();
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }
      }
    }

    set({ queueIndex: nextIndex });
    get().playSong(queue[nextIndex], null, nextIndex);
  },

  playPrev: () => {
    const { queue, queueIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      howlInstance?.seek(0);
      set({ currentTime: 0 });
      return;
    }

    const prevIndex = Math.max(0, queueIndex - 1);
    set({ queueIndex: prevIndex });
    get().playSong(queue[prevIndex], null, prevIndex);
  },

  seek: (time) => {
    if (howlInstance) {
      howlInstance.seek(time);
      set({ currentTime: time });
    }
  },

  setVolume: (vol) => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    if (howlInstance) howlInstance.volume(clampedVol);
    set({ volume: clampedVol, isMuted: clampedVol === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    if (isMuted) {
      if (howlInstance) howlInstance.volume(volume);
      set({ isMuted: false });
    } else {
      if (howlInstance) howlInstance.volume(0);
      set({ isMuted: true });
    }
  },

  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),

  cycleRepeat: () => {
    const modes = ['off', 'all', 'one'];
    set((s) => ({
      repeatMode: modes[(modes.indexOf(s.repeatMode) + 1) % modes.length],
    }));
  },

  addToQueue: (song) => {
    set((s) => ({ queue: [...s.queue, song] }));
  },

  removeFromQueue: (index) => {
    set((s) => ({
      queue: s.queue.filter((_, i) => i !== index),
    }));
  },

  clearQueue: () => {
    if (howlInstance) {
      howlInstance.stop();
      howlInstance.unload();
      howlInstance = null;
    }
    clearProgress();
    set({ queue: [], queueIndex: 0, currentSong: null, isPlaying: false, currentTime: 0 });
  },

  // Internal: start tracking playback progress
  _startProgressTracking: () => {
    clearProgress();
    progressInterval = setInterval(() => {
      if (howlInstance && howlInstance.playing()) {
        set({ currentTime: howlInstance.seek() || 0 });
      }
    }, 1000);
  },

  // Internal: handle song end
  _handleSongEnd: () => {
    get().playNext();
  },
}));

export default usePlayerStore;
