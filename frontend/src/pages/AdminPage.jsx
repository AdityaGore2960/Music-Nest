/**
 * Admin Dashboard
 * Analytics with Recharts, user management, content moderation
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminService } from '../services';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  FaUsers, FaMusic, FaCompactDisc, FaPlay, FaShieldHalved,
  FaBan, FaTrash,
} from 'react-icons/fa6';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#1DB954', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-spotify-light text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{value?.toLocaleString()}</p>
      </div>
    </motion.div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, page, userSearch]);

  const loadStats = async () => {
    try {
      const { data } = await adminService.getStats();
      setStats(data.data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await adminService.getUsers({ page, limit: 15, search: userSearch });
      setUsers(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      toast.error('Failed to load users');
    }
  };

  const handleBanUser = async (userId, username) => {
    if (!confirm(`Toggle ban status for ${username}?`)) return;
    try {
      const { data } = await adminService.toggleBan(userId);
      toast.success(data.message);
      loadUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Permanently delete ${username}? This cannot be undone.`)) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted');
      loadUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await adminService.updateRole(userId, role);
      toast.success('Role updated');
      loadUsers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  // Format chart data
  const playChartData = stats?.monthlyPlays?.map(item => ({
    month: `${MONTHS[item._id.month - 1]} '${String(item._id.year).slice(2)}`,
    plays: item.count,
  })) || [];

  return (
    <div className="pb-24 overflow-y-auto h-full px-6 md:px-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <FaShieldHalved className="text-spotify-green" size={24} />
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {['overview', 'users', 'songs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-black'
                : 'bg-spotify-card text-white hover:bg-spotify-hover'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={FaUsers} label="Total Users" value={stats?.overview?.totalUsers} color="bg-blue-500" />
            <StatCard icon={FaMusic} label="Total Songs" value={stats?.overview?.totalSongs} color="bg-spotify-green" />
            <StatCard icon={FaCompactDisc} label="Total Albums" value={stats?.overview?.totalAlbums} color="bg-purple-500" />
            <StatCard icon={FaPlay} label="Total Plays" value={stats?.overview?.totalPlays} color="bg-orange-500" />
          </div>

          {/* Play History Chart */}
          {playChartData.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-white font-bold mb-6">Monthly Plays (Last 6 Months)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={playChartData}>
                  <defs>
                    <linearGradient id="playGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#B3B3B3" fontSize={12} />
                  <YAxis stroke="#B3B3B3" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#282828', border: '1px solid #535353', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#1DB954' }}
                  />
                  <Area type="monotone" dataKey="plays" stroke="#1DB954" fill="url(#playGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Songs */}
          <div className="glass-card p-6">
            <h3 className="text-white font-bold mb-4">Top Songs by Plays</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.topSongs?.slice(0, 8).map(s => ({ name: s.title.slice(0, 15), plays: s.plays })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#B3B3B3" fontSize={11} />
                <YAxis stroke="#B3B3B3" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#282828', border: '1px solid #535353', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#1DB954' }}
                />
                <Bar dataKey="plays" fill="#1DB954" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Users */}
          <div className="glass-card p-6">
            <h3 className="text-white font-bold mb-4">Recent Users</h3>
            <div className="space-y-3">
              {stats?.recentUsers?.map(u => (
                <div key={u._id} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div>
                    <p className="text-white text-sm font-medium">{u.username}</p>
                    <p className="text-spotify-light text-xs">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                    u.role === 'artist' ? 'bg-spotify-green/20 text-spotify-green' :
                    'bg-white/10 text-spotify-light'
                  }`}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
            className="input-field max-w-md"
          />

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-spotify-light uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs text-spotify-light uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-spotify-light uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs text-spotify-light uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-spotify-light uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-white text-sm font-medium">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-spotify-light text-sm hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-spotify-card text-white text-xs px-2 py-1 rounded border border-white/20 focus:outline-none focus:border-spotify-green"
                      >
                        <option value="user">User</option>
                        <option value="artist">Artist</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.isActive ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleBanUser(u._id, u.username)}
                              className="text-spotify-light hover:text-orange-400 transition-colors p-1.5"
                              title={u.isActive ? 'Ban user' : 'Unban user'}
                            >
                              <FaBan size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u._id, u.username)}
                              className="text-spotify-light hover:text-red-400 transition-colors p-1.5"
                              title="Delete user"
                            >
                              <FaTrash size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost text-sm disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-spotify-light text-sm">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost text-sm disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Songs Tab */}
      {activeTab === 'songs' && (
        <div className="glass-card p-6">
          <h3 className="text-white font-bold mb-4">Top Songs</h3>
          <div className="space-y-3">
            {stats?.topSongs?.map((song, i) => (
              <div key={song._id} className="flex items-center gap-4 py-2 border-b border-white/5">
                <span className="text-spotify-light text-sm w-6 text-right">{i + 1}</span>
                <img
                  src={song.coverImage || '/default-cover.png'}
                  alt={song.title}
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{song.title}</p>
                  <p className="text-spotify-light text-xs">{song.artist?.username}</p>
                </div>
                <span className="text-spotify-light text-sm flex items-center gap-1">
                  <FaPlay size={10} /> {song.plays.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
