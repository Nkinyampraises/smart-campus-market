import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Alerts',    path: '/admin/fraud' },
  { label: 'Users',     path: '/admin/users' },
  { label: 'Listings',  path: '/admin/listings' },
  { label: 'Reports',   path: '/admin/reports' },
];

const AdminNavbar = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link to="/admin/dashboard" className="text-[18px] font-black tracking-tighter text-[#ff6b1a] no-underline flex-shrink-0">
          CampusTrade
        </Link>

        {/* Admin nav links */}
        <nav className="flex items-center gap-0.5">
          {NAV.map((n) => {
            const active = location.pathname === n.path;
            return (
              <Link
                key={n.path}
                to={n.path}
                className={`px-3 py-1.5 text-[13px] font-semibold no-underline transition-colors ${
                  active
                    ? 'text-[#ff6b1a] border-b-2 border-[#ff6b1a] rounded-none pb-[5px]'
                    : 'text-gray-600 hover:text-[#ff6b1a]'
                }`}
              >
                {n.label}
              </Link>
            );
          })}

          {/* Divider */}
          <span className="mx-2 text-gray-200">|</span>

          {/* Home and Marketplace — open in new tab so admin stays open */}
          <a
            href="/home"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#ff6b1a] no-underline transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">home</span>
            Home
          </a>
          <a
            href="/browse"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#ff6b1a] no-underline transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">storefront</span>
            Marketplace
          </a>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]">search</span>
            <input
              placeholder="Search alerts..."
              className="pl-8 pr-4 py-1.5 bg-gray-100 rounded-full text-[13px] w-44 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#ff6b1a]/30 transition-all"
            />
          </div>

          {/* Notification bell */}
          <button className="relative p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-gray-500 text-[22px]">notifications</span>
          </button>

          {/* Admin avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[11px] cursor-pointer"
            style={{ backgroundColor: '#ff6b1a' }}
            title={user?.email}
          >
            {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
