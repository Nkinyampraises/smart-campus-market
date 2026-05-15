import React, { useState } from 'react';
import Topbar from '../components/Topbar';
import AdminSidebar from '../components/AdminSidebar';
import { adminReports } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const AdminReports = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState(adminReports);

  const remove = (id, action) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (action === 'remove') showToast('Listing removed.', 'success');
    else if (action === 'suspend') showToast('User suspended.', 'error');
    else showToast('Report dismissed.', 'neutral');
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />
      <div className="max-w-7xl mx-auto flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-[32px] font-black text-[#1b1c1c]">Reports Queue</h1>
            <p className="text-[14px] text-gray-400 mt-1">
              {reports.length} pending report{reports.length !== 1 ? 's' : ''}
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
              <span className="material-symbols-outlined text-[64px] mb-4">check_circle</span>
              <h3 className="font-bold text-[20px] mb-2">All clear!</h3>
              <p className="text-[14px]">No pending reports in the queue.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {reports
                .sort((a, b) => b.reportCount - a.reportCount)
                .map((r) => (
                  <div
                    key={r.id}
                    className={`bg-white rounded-2xl border-2 shadow-sm p-6 ${
                      r.severity === 'high' ? 'border-red-300' : r.severity === 'medium' ? 'border-yellow-300' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex gap-5">
                      <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={r.listing.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-[16px] text-[#1b1c1c] mb-1">{r.listing.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                r.severity === 'high' ? 'bg-red-100 text-red-600' : r.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {r.reportCount} reports
                              </span>
                              <span className="text-[12px] text-gray-500">{r.reason}</span>
                            </div>
                          </div>
                          <span className="text-[12px] text-gray-400">{r.date}</span>
                        </div>
                        <p className="text-[12px] text-gray-500 mb-4">Reported by: {r.reporter}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => remove(r.id, 'remove')}
                            className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold text-[12px] hover:bg-red-700 transition-all"
                          >
                            Remove Listing
                          </button>
                          <button
                            onClick={() => remove(r.id, 'suspend')}
                            className="px-5 py-2 border-2 border-orange-400 text-orange-600 rounded-xl font-bold text-[12px] hover:bg-orange-50 transition-all"
                          >
                            Suspend Seller
                          </button>
                          <button
                            onClick={() => remove(r.id, 'dismiss')}
                            className="px-5 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-[12px] hover:bg-gray-50 transition-all"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminReports;
