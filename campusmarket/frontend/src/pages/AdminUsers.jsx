import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import AdminSidebar from '../components/AdminSidebar';
import { mockUsers } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const AdminUsers = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.campusZone.toLowerCase().includes(q)
    );
  }, [search, users]);

  const toggleStatus = (id) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const next = u.status === 'Active' ? 'Suspended' : 'Active';
        showToast(`User ${next === 'Suspended' ? 'suspended' : 'restored'}.`, next === 'Suspended' ? 'error' : 'success');
        return { ...u, status: next };
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />
      <div className="max-w-7xl mx-auto flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-[32px] font-black text-[#1b1c1c]">User Management</h1>
            <p className="text-[14px] text-gray-400 mt-1">{users.length} registered users</p>
          </div>

          {/* Search */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 w-full max-w-md">
            <span className="material-symbols-outlined text-gray-400 mr-3">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or zone..."
              className="flex-1 text-[14px] outline-none"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
              {['User', 'Email', 'Zone', 'Listings', 'Rating', 'Status', 'Actions'].map((h) => (
                <span key={h} className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{h}</span>
              ))}
            </div>

            {filtered.map((u) => (
              <div
                key={u.id}
                className={`grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-50 items-center transition-colors ${
                  u.status === 'Suspended' ? 'bg-red-50/40' : 'hover:bg-gray-50/50'
                }`}
              >
                {/* User */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-[11px] flex-shrink-0"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.initials}
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-[#1b1c1c]">{u.name}</p>
                    {u.isVerified && (
                      <span className="text-[10px] text-emerald-600 font-bold">Verified</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <p className="text-[12px] text-gray-500 truncate">{u.email}</p>

                {/* Zone */}
                <p className="text-[12px] text-gray-600">{u.campusZone}</p>

                {/* Listings */}
                <p className="font-bold text-[13px] text-[#1b1c1c]">{u.listings}</p>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-bold text-[13px]">{u.rating}</span>
                </div>

                {/* Status */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  {u.status}
                </span>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    View
                  </button>
                  <button
                    onClick={() => toggleStatus(u.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      u.status === 'Active'
                        ? 'border border-red-300 text-red-600 hover:bg-red-50'
                        : 'border border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {u.status === 'Active' ? 'Suspend' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-[48px] mb-3 block">person_search</span>
                <p className="font-semibold">No users found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminUsers;
