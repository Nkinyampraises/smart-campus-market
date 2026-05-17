import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

const AdminReports = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminReports().then(setReports).catch(console.error).finally(() => setLoading(false));
  }, []);

  const resolve = async (id, action) => {
    try {
      await api.resolveReport(id, { status: 'resolved', action });
      setReports((prev) => prev.filter((r) => r.id !== id));
      showToast('Report resolved', 'success');
    } catch { showToast('Failed to resolve', 'error'); }
  };

  const severityColor = (s) =>
    s === 'high' ? 'bg-red-100 text-red-600' : s === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex">
      <AdminSidebar activePage="reports" />
      <main className="flex-1 p-8">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-8">Reports</h1>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">check_circle</span>
            <p className="font-semibold">No pending reports</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((r) => (
              <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${severityColor(r.severity)}`}>{r.severity?.toUpperCase() || 'REPORT'}</span>
                      <span className="text-[12px] text-gray-400">{r.reason}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-[#1b1c1c]">Listing: {r.listing_id}</p>
                    {r.description && <p className="text-[13px] text-gray-500 mt-1">{r.description}</p>}
                    <p className="text-[11px] text-gray-400 mt-2">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resolve(r.id, 'remove_listing')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold hover:bg-red-100">Remove</button>
                    <button onClick={() => resolve(r.id, 'dismiss')} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[12px] font-bold hover:bg-gray-200">Dismiss</button>
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

export default AdminReports;
