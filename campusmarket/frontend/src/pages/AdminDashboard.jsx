import React, { useState } from 'react';
import Topbar from '../components/Topbar';
import AdminSidebar from '../components/AdminSidebar';
import { adminStats, adminReports, adminQuickStats } from '../data/mockData';
import { useToast } from '../context/ToastContext';

const AdminDashboard = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState(adminReports);

  const approveReport = (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    showToast('Report approved and listing removed.', 'success');
  };

  const dismissReport = (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    showToast('Report dismissed.', 'neutral');
  };

  const statCards = [
    { label: 'Total Users', value: adminStats.totalUsers.toLocaleString(), icon: 'group', color: 'bg-blue-50 text-blue-600', change: '+23 today' },
    { label: 'Live Listings', value: adminStats.liveListings.toLocaleString(), icon: 'store', color: 'bg-orange-50 text-[#ff6b1a]', change: '+47 today' },
    { label: 'Pending Reports', value: adminStats.pendingReports, icon: 'flag', color: 'bg-red-50 text-red-600', change: '3 new today' },
    { label: 'Fraud Flags', value: adminStats.fraudFlags, icon: 'gpp_bad', color: 'bg-yellow-50 text-yellow-600', change: '1 new today' },
  ];

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />
      <div className="max-w-7xl mx-auto flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-[32px] font-black text-[#1b1c1c]">Admin Dashboard</h1>
            <p className="text-[14px] text-gray-400 mt-1">Platform overview and moderation</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </div>
                <p className="text-[30px] font-black text-[#1b1c1c]">{s.value}</p>
                <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{s.label}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">{s.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Recent Reports */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[16px] text-[#1b1c1c]">Recent Reports</h2>
                <span className="bg-red-100 text-red-600 text-[11px] font-black px-2.5 py-1 rounded-full">
                  {reports.length} pending
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {reports.map((r) => (
                  <div key={r.id} className="px-6 py-5 flex gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={r.listing.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-bold text-[14px] text-[#1b1c1c]">{r.listing.title}</p>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                          r.severity === 'high' ? 'bg-red-100 text-red-600' : r.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {r.reportCount} reports
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 mb-3">{r.reason} · Reported by {r.reporter}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveReport(r.id)}
                          className="px-4 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700 transition-all"
                        >
                          Remove Listing
                        </button>
                        <button
                          onClick={() => dismissReport(r.id)}
                          className="px-4 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-bold text-[11px] hover:bg-gray-50 transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <div className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-[40px] block mb-2">check_circle</span>
                    <p className="font-semibold">All reports reviewed!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
              <h2 className="font-bold text-[16px] text-[#1b1c1c] mb-5">Quick Stats</h2>
              <div className="flex flex-col gap-3">
                {adminQuickStats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">{s.label}</span>
                    <span className="font-black text-[14px] text-[#1b1c1c]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
