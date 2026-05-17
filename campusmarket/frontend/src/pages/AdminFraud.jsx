import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { api } from '../services/api';

const AdminFraud = () => {
  const [flags, setFlags]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fraudFlags().then(setFlags).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex">
      <AdminSidebar activePage="fraud" />
      <main className="flex-1 p-8">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-2">Fraud Detection</h1>
        <p className="text-[14px] text-gray-500 mb-8">AI-flagged suspicious listings and behaviour</p>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : flags.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">verified_user</span>
            <p className="font-semibold">No fraud flags</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {flags.map((f) => (
              <div key={f.id} className="bg-white border border-yellow-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-yellow-100 p-3 rounded-xl flex-shrink-0">
                    <span className="material-symbols-outlined text-yellow-600">warning</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-black px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full uppercase">{f.type?.replace(/_/g, ' ')}</span>
                    <p className="text-[14px] font-semibold text-[#1b1c1c] mt-1">{f.rule}</p>
                    <p className="text-[12px] text-gray-400 mt-1">Listing: {f.listing_id} · Seller: {f.seller_id}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{new Date(f.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminFraud;
