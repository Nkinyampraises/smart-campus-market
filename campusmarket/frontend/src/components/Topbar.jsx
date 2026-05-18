import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

const Topbar = ({ activePage }) => {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    if (!isLoggedIn) return;
    api.getNotifications()
      .then((ns) => setUnreadCount(ns.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [isLoggedIn]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'neutral');
    navigate('/home');
  };

  const isActive = (page) => activePage === page;

  return (
    <header className="bg-white border-b border-gray-100 shadow-[0px_2px_12px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link
          to="/home"
          className="text-[22px] font-black tracking-tighter text-[#ff6b1a] no-underline flex-shrink-0"
        >
          CampusTrade
        </Link>

        {/* Search */}
        <div className="hidden md:flex items-center bg-[#f6f3f2] rounded-full px-4 py-2 flex-1 max-w-md">
          <span className="material-symbols-outlined text-[#5c5f60] mr-2 text-[20px]">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-[14px] w-full outline-none"
            placeholder="Search campus marketplace..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <Link
            to="/browse"
            className={`px-3 py-2 rounded-lg font-semibold text-[14px] no-underline transition-colors ${
              isActive('browse')
                ? 'text-[#ff6b1a] font-bold'
                : 'text-gray-600 hover:text-[#ff6b1a] hover:bg-orange-50'
            }`}
          >
            Marketplace
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                to="/create-listing"
                className="ml-1 bg-[#ff6b1a] text-white px-4 py-2 rounded-full font-bold text-[13px] hover:shadow-md hover:shadow-orange-200 transition-all flex items-center gap-1.5 no-underline"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Sell Item
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative p-2 hover:bg-gray-50 rounded-full transition-colors ml-1"
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    isActive('notifications') ? 'text-[#ff6b1a]' : 'text-[#5c5f60]'
                  }`}
                >
                  notifications
                </span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#ff6b1a] rounded-full flex items-center justify-center text-white text-[9px] font-black">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Avatar / User Menu */}
              <div className="relative ml-1">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-[12px] border-2 border-white shadow-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: user?.color || '#ff6b1a' }}
                >
                  {user?.initials || 'ME'}
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="font-bold text-[14px] text-[#1b1c1c]">{user?.name}</p>
                        <p className="text-[12px] text-gray-400 truncate">{user?.email}</p>
                      </div>
                      {[
                        { label: 'My Profile', icon: 'person', link: '/my-profile' },
                        { label: 'My Listings', icon: 'list_alt', link: '/my-listings' },
                        { label: 'Wishlist', icon: 'favorite', link: '/wishlist' },
                        { label: 'Transactions', icon: 'receipt_long', link: '/transactions' },
                        { label: 'Inbox', icon: 'chat', link: '/inbox' },
                        { label: 'Offers', icon: 'local_offer', link: '/offers' },
                      ].map((item) => (
                        <Link
                          key={item.link}
                          to={item.link}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-gray-700 hover:bg-orange-50 hover:text-[#ff6b1a] no-underline transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-gray-50">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">logout</span>
                          Log Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Guest buttons */
            <div className="flex items-center gap-2 ml-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full font-bold text-[13px] border-2 border-[#ff6b1a] text-[#ff6b1a] hover:bg-orange-50 transition-all no-underline"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-full font-bold text-[13px] bg-[#ff6b1a] text-white hover:shadow-md hover:shadow-orange-200 transition-all no-underline flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                Sign Up Free
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile search icon */}
        <button
          className="md:hidden ml-auto p-2"
          onClick={() => navigate('/search?q=')}
        >
          <span className="material-symbols-outlined text-[#5c5f60]">search</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
