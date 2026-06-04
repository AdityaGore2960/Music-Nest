/**
 * App.jsx — Main application with routing and global layout
 */
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import useAuthStore from './store/authStore';
import useSocketStore from './store/socketStore';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import ArtistPage from './pages/ArtistPage';
import PlaylistPage from './pages/PlaylistPage';
import AdminPage from './pages/AdminPage';
import MusicDiscoverPage from './pages/MusicDiscoverPage';
import { FaBars } from 'react-icons/fa6';

// Protected route wrapper
function ProtectedRoute({ roles }) {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Main app layout (sidebar + content + player)
function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-spotify-black">
      <Sidebar isMobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center px-4 py-3 bg-spotify-dark border-b border-white/5 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white mr-3"
          >
            <FaBars size={20} />
          </button>
          <span className="text-white font-bold">MusicNest</span>
        </div>

        <main className="flex-1 bg-gradient-to-b from-spotify-dark to-spotify-black overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent Music Player */}
      <MusicPlayer />
    </div>
  );
}

// Loading screen
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-spotify-black">
      <div className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center mb-4 shadow-glow-green animate-pulse">
        <span className="text-black text-xl">🎵</span>
      </div>
      <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { initialize, isInitialized, user, accessToken } = useAuthStore();
  const { connect } = useSocketStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Connect socket when user logs in
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (user && token) {
      connect(token);
    }
  }, [user]);

  // Listen for logout event from API interceptor
  useEffect(() => {
    const handleLogout = () => {
      useAuthStore.getState().logout();
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  if (!isInitialized) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#282828',
            color: '#fff',
            border: '1px solid #535353',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#1DB954', secondary: '#000' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />

      <Routes>
        {/* Public auth pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Main app layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/discover" element={<MusicDiscoverPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/liked-songs" element={<LibraryPage />} />

          {/* Protected: Admin only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
