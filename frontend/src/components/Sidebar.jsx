/**
 * Sidebar — Main navigation
 * Collapsible on mobile, shows library and nav links
 */
import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import toast from 'react-hot-toast';
import {
  FaHouse, FaMagnifyingGlass, FaBookmark, FaPlus,
  FaHeart, FaBars, FaXmark, FaMusic, FaShieldHalved, FaRecordVinyl,
} from 'react-icons/fa6';

export default function Sidebar({ isMobileOpen, setMobileOpen }) {
  const { user, logout } = useAuthStore();
  const { disconnect } = useSocketStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    disconnect();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navLinks = [
    { to: '/', icon: FaHouse, label: 'Home', end: true },
    { to: '/search', icon: FaMagnifyingGlass, label: 'Search' },
    { to: '/discover', icon: FaRecordVinyl, label: 'Discover' },
    { to: '/library', icon: FaBookmark, label: 'Your Library' },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center shadow-glow-green">
            <FaMusic size={14} className="text-black" />
          </div>
          {!isCollapsed && (
            <span className="text-white font-bold text-xl tracking-tight">MusicNest</span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="px-3 flex-shrink-0">
        {navLinks.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item mb-1 ${isActive ? 'active text-white font-bold' : ''}`
            }
          >
            <Icon size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Library Section */}
      <div className="mt-4 px-3 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          {!isCollapsed && (
            <span className="text-spotify-light text-sm font-semibold uppercase tracking-wider px-1">
              Playlists
            </span>
          )}
          <button
            onClick={() => toast('Create playlist coming soon!', { icon: '🎵' })}
            className="w-8 h-8 rounded-full bg-spotify-hover hover:bg-spotify-card flex items-center justify-center text-spotify-light hover:text-white transition-colors"
            title="Create playlist"
          >
            <FaPlus size={12} />
          </button>
        </div>

        {/* Liked Songs shortcut */}
        {user && (
          <Link
            to="/liked-songs"
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/10 transition-colors group mb-2"
          >
            <div className="w-10 h-10 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <FaHeart size={14} className="text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">Liked Songs</p>
                <p className="text-xs text-spotify-light">Playlist</p>
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Bottom: User Profile */}
      {user && (
        <div className="p-3 flex-shrink-0 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/10 transition-colors cursor-pointer group">
            <Link to={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
              {!isCollapsed && (
                <span className="text-sm font-medium text-white truncate">{user.username}</span>
              )}
            </Link>
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-spotify-green hover:text-spotify-accent transition-colors"
                    title="Admin"
                  >
                    <FaShieldHalved size={14} />
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs text-spotify-light hover:text-white transition-colors px-2 py-1"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-spotify-black border-r border-white/5 flex-shrink-0 relative"
      >
        {sidebarContent}
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-spotify-card border border-white/10 flex items-center justify-center text-spotify-light hover:text-white transition-colors z-10"
        >
          {isCollapsed ? <FaBars size={10} /> : <FaXmark size={10} />}
        </button>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-spotify-black z-50 md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-spotify-light hover:text-white"
              >
                <FaXmark size={20} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
