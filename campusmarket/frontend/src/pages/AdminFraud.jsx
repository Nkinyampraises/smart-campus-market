import React, { useState } from 'react';
import Topbar from '../components/Topbar';
import AdminSidebar from '../components/AdminSidebar';
import { adminFraudAlerts } from '../data/mockData';
import { formatFCFA } from '../data/listings';
import { useToast } from '../context/ToastContext';

const AdminFraud = () => {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState(adminFraudAlerts);

  const dismiss = (id, action) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (action === 'hide') showToast('Listing hidden.', 'success');
    else if (action === 'safe') showToast('Marked as safe.', 'neutral');
    else if (action === 'suspend') showToast('Account suspended.', 'error');
    else showToast('Alert dismissed.', 'neutral');
  };

  const stats = [
    { label: 'Suspicious Prices Today', value: alerts.filter((a) => a.type === 'low_price').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Spam Reports Today', value: alerts.filter((a) => a.type === 'spam').length, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Cases Resolved', value: 14, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />
      <div className="max-w-7xl mx-auto flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-[32px] font-black text-[#1b1c1c]">Fraud Detection</h1>
            <p className="text-[14px] text-gray-400 mt-1">Automated fraud alerts and suspicious activity</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-2xl border border-gray-100 p-5 ${s.bg}`}>
                <p className={`text-[32px] font-black ${s.color}`}>{s.value}</p>
                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div className="flex flex-col gap-5">
            {alerts.map((alert) => {
              if (alert.type === 'low_price') {
                return (
                  <div key={alert.id} className="bg-white border-2 border-yellow-300 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-yellow-600 text-[18px]">warning</span>
                      </div>
                      <span className="font-black text-[13px] text-yellow-700 uppercase tracking-widest">Low Price Flag</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={alert.listing.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[15px] text-[#1b1c1c] mb-1">{alert.listing.title}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[20px] font-black text-yellow-600">
                            {formatFCFA(alert.listing.priceFCFA)}
                          </span>
                          <span className="bg-yellow-100 text-yellow-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            Suspicious
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-500 mb-4">{alert.rule}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => dismiss(alert.id, 'hide')}
                            className="px-5 py-2 bg-yellow-600 text-white rounded-xl font-bold text-[12px] hover:bg-yellow-700 transition-all"
                          >
                            Hide Listing
                          </button>
                          <button
                            onClick={() => dismiss(alert.id, 'safe')}
                            className="px-5 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-[12px] hover:bg-gray-50 transition-all"
                          >
                            Mark Safe
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // spam type
              return (
                <div key={alert.id} className="bg-white border-2 border-red-300 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600 text-[18px]">gpp_bad</span>
                    </div>
                    <span className="font-black text-[13px] text-red-700 uppercase tracking-widest">Spam Detection</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-[12px]"
                      style={{ backgroundColor: alert.seller.color }}
                    >
                      {alert.seller.initials}
                    </div>
                    <div>
                      <p className="font-bold text-[15px] text-[#1b1c1c]">{alert.seller.name}</p>
                      <p className="text-[12px] text-gray-400">{alert.date}</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-gray-600 mb-4 bg-red-50 rounded-xl p-3">
                    {alert.explanation}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => dismiss(alert.id, 'suspend')}
                      className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold text-[12px] hover:bg-red-700 transition-all"
                    >
                      Suspend Account
                    </button>
                    <button
                      onClick={() => dismiss(alert.id, 'dismiss')}
                      className="px-5 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-[12px] hover:bg-gray-50 transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}

            {alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
                <span className="material-symbols-outlined text-[64px] mb-4 text-emerald-400">verified_user</span>
                <h3 className="font-bold text-[20px] mb-2 text-emerald-600">All clear!</h3>
                <p className="text-[14px]">No fraud alerts at the moment.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminFraud;
