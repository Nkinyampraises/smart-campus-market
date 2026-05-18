import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';

const AdminListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.adminListings().then(setListings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = listings.filter((l) => l.title?.toLowerCase().includes(search.toLowerCase()));
  const statusColor = (s) =>
    s === 'active' ? 'bg-emerald-100 text-emerald-700' : s === 'reserved' ? 'bg-blue-100 text-blue-700' :
    s === 'sold' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600';

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex">
      <AdminSidebar activePage="listings" />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[28px] font-black text-[#1b1c1c]">Listings</h1>
          <input type="text" placeholder="Search listings…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#ff6b1a] w-64" />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-[14px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Title','Category','Price','Zone','Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-black text-[11px] text-gray-400 uppercase tracking-wider">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-[#1b1c1c] max-w-[200px] truncate">{l.title}</td>
                    <td className="px-5 py-3 text-gray-500">{l.category}</td>
                    <td className="px-5 py-3 font-bold text-[#ff6b1a]">{formatFCFA(l.price_fcfa)}</td>
                    <td className="px-5 py-3 text-gray-500">{l.campus_zone || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${statusColor(l.status)}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-gray-400 py-10">No listings found</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminListings;
