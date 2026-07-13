import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';

const NAV_ITEMS = [
  { icon: 'dashboard',  label: 'Dashboard',    path: '/admin/dashboard' },
  { icon: 'group',      label: 'Users',         path: '/admin/users' },
  { icon: 'store',      label: 'Listings',      path: '/admin/listings' },
  { icon: 'flag',       label: 'Reports',       path: '/admin/reports', badgeKey: 'pendingReports' },
  { icon: 'gpp_bad',   label: 'Fraud Alerts',  path: '/admin/fraud',   badgeKey: 'fraudFlags' },
];

const AdminSidebar = () => {
  const location = useLocation();
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-gray-100 bg-white flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      <div className="p-4">
        {/* Admin badge */}
        <div className="mb-6 px-2 pt-2">
          <span className="inline-block bg-red-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
            Admin Panel
          </span>
          <p className="text-[11px] text-gray-400 mt-1.5">Platform Management</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            const badge  = item.badgeKey ? stats[item.badgeKey] : 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[13px] no-underline ${
                  active
                    ? 'bg-orange-50 text-[#ff6b1a] font-bold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#1b1c1c]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: active ? '#ff6b1a' : undefined }}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="mt-auto border-t border-gray-100 p-4">
        <Link
          to="/browse"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all text-[13px] no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          <span>Open Marketplace</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
