import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { api } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Total Users',     value: stats.totalUsers,     icon: 'group',     color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Live Listings',   value: stats.liveListings,   icon: 'storefront',color: 'text-[#ff6b1a]', bg: 'bg-orange-50' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: 'flag',      color: 'text-red-600',   bg: 'bg-red-50' },
    { label: 'Fraud Flags',     value: stats.fraudFlags,     icon: 'warning',   color: 'text-yellow-600',bg: 'bg-yellow-50' },
  ] : [];

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex">
      <AdminSidebar activePage="dashboard" />
      <main className="flex-1 p-8">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-8">Dashboard</h1>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <span className={`material-symbols-outlined ${c.color}`}>{c.icon}</span>
                </div>
                <p className="text-[28px] font-black text-[#1b1c1c]">{c.value ?? '—'}</p>
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">{c.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { label: 'Manage Users',    icon: 'group',    path: '/admin/users',    desc: 'View, suspend or manage all campus users.' },
            { label: 'Manage Listings', icon: 'list_alt', path: '/admin/listings', desc: 'Monitor and moderate all marketplace listings.' },
            { label: 'Reports',         icon: 'flag',     path: '/admin/reports',  desc: 'Review flagged content reported by students.' },
            { label: 'Fraud Detection', icon: 'warning',  path: '/admin/fraud',    desc: 'AI-flagged suspicious listings and accounts.' },
          ].map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:shadow-md transition-all flex items-start gap-4">
              <div className="bg-orange-50 p-3 rounded-xl">
                <span className="material-symbols-outlined text-[#ff6b1a] text-[24px]">{item.icon}</span>
              </div>
              <div>
                <p className="font-bold text-[16px] text-[#1b1c1c]">{item.label}</p>
                <p className="text-[13px] text-gray-500 mt-1">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
