import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const AdminUsers = () => {
  const { showToast } = useToast();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.adminUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleSuspend = async (user) => {
    try {
      if (user.is_suspended) { await api.unsuspendUser(user.id); showToast('User unsuspended', 'success'); }
      else { await api.suspendUser(user.id, { reason: 'Violated community rules' }); showToast('User suspended', 'neutral'); }
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u));
    } catch { showToast('Action failed', 'error'); }
  };

  const filtered = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex">
      <AdminSidebar activePage="users" />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-black text-[#1b1c1c]">Users</h1>
          <input type="text" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#ff6b1a] w-64" />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-[14px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name','Email','Zone','Verified','Status','Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-black text-[11px] text-gray-400 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold">{u.first_name} {u.last_name}</td>
                    <td className="px-5 py-3 text-gray-500 text-[13px]">{u.email}</td>
                    <td className="px-5 py-3 text-gray-500">{u.campus_zone || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${u.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${u.is_suspended ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleSuspend(u)}
                        className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${u.is_suspended ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-gray-400 py-10">No users found</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUsers;
