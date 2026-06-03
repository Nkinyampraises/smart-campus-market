import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Alerts',    path: '/admin/fraud' },
  { label: 'Users',     path: '/admin/users' },
  { label: 'Listings',  path: '/admin/listings' },
  { label: 'Reports',   path: '/admin/reports' },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/admin/users?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link to="/admin/dashboard" className="text-[18px] font-black tracking-tighter text-[#ff6b1a] no-underline flex-shrink-0">
          CampusTrade
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const active = location.pathname === n.path;
            return (
              <Link
                key={n.path}
                to={n.path}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold no-underline transition-colors ${
                  active
                    ? 'text-[#ff6b1a] border-b-2 border-[#ff6b1a] rounded-none'
                    : 'text-gray-600 hover:text-[#ff6b1a]'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs ml-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-100 rounded-full text-[13px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#ff6b1a]/30 transition-all"
            />
          </div>
        </form>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          <button className="relative p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-gray-500 text-[22px]">notifications</span>
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[11px]"
              style={{ backgroundColor: '#ff6b1a' }}
            >
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
          <Link
            to="/browse"
            className="text-[12px] text-gray-400 hover:text-[#ff6b1a] no-underline transition-colors"
          >
            ← Marketplace
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AdminSidebar;
