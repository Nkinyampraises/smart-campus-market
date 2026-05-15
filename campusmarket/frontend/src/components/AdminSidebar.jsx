import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { adminStats } from '../data/mockData';

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  { icon: 'group', label: 'Users', path: '/admin/users' },
  { icon: 'store', label: 'Listings', path: '/admin/listings' },
  { icon: 'flag', label: 'Reports', path: '/admin/reports', badge: adminStats.pendingReports },
  { icon: 'gpp_bad', label: 'Fraud Alerts', path: '/admin/fraud', badge: adminStats.fraudFlags },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 bg-white p-4 gap-2 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto flex-shrink-0">
      {/* Admin Badge */}
      <div className="mb-5 px-2">
        <span className="inline-block bg-red-600 text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full mb-3">
          Admin Panel
        </span>
        <p className="text-[12px] text-gray-400">Platform Management</p>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[13px] no-underline ${
                active
                  ? 'bg-orange-50 text-[#ff6b1a] font-bold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#1b1c1c]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ color: active ? '#ff6b1a' : undefined }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 pt-4">
        <Link
          to="/browse"
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-all text-[13px] no-underline"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Back to Marketplace</span>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
