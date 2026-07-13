import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';

const StatCard = ({ icon, iconBg, iconColor, label, value, change, changePositive }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4">
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
      </div>
      {change !== undefined && (
        <span className={`text-[12px] font-bold ${changePositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {changePositive ? '+' : ''}{change}
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1">{label}</p>
      <p className="text-[28px] font-black text-[#1b1c1c]">{value ?? '—'}</p>
    </div>
  </div>
);

const severityColor = (s) =>
  s === 'high' || s === 'urgent' ? 'text-red-500' :
  s === 'medium' ? 'text-yellow-600' : 'text-emerald-600';

const statusDot = (s) =>
  s === 'pending' ? 'bg-yellow-400' : s === 'resolved' ? 'bg-emerald-500' : 'bg-red-500';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [reports, setReports] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, r, l] = await Promise.all([
          api.adminStats().catch(() => ({})),
          api.adminReports().catch(() => []),
          api.adminListings().catch(() => []),
        ]);
        setStats(s || {});
        setReports(Array.isArray(r) ? r.slice(0, 5) : []);
        setListings(Array.isArray(l) ? l : []);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Listing distribution by category
  const distribution = React.useMemo(() => {
    if (!listings.length) return [];
    const counts = {};
    listings.forEach((l) => { counts[l.category] = (counts[l.category] || 0) + 1; });
    const total = listings.length;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([cat, cnt]) => ({ cat, pct: Math.round((cnt / total) * 100) }));
  }, [listings]);

  const totalVolume = listings.reduce((s, l) => s + (l.price_fcfa || 0), 0);

  return (
    <AdminLayout>
      <div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-black text-[#1b1c1c]">Admin Dashboard</h1>
          <p className="text-[14px] text-gray-400 mt-1">Monitoring campus commerce activities and user trust metrics.</p>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                icon="flag" iconBg="bg-blue-50" iconColor="text-blue-600"
                label="Reports" value={`${stats?.pendingReports ?? 0} Active`}
                change="+12%" changePositive
              />
              <StatCard
                icon="gpp_bad" iconBg="bg-red-50" iconColor="text-red-500"
                label="Fraud Alert" value={`${stats?.fraudFlags ?? 0} Pending`}
                change="-5%" changePositive={false}
              />
              <StatCard
                icon="person_add" iconBg="bg-orange-50" iconColor="text-[#ff6b1a]"
                label="New Users" value={(stats?.totalUsers ?? 0).toLocaleString()}
                change="+124" changePositive
              />
              <StatCard
                icon="payments" iconBg="bg-emerald-50" iconColor="text-emerald-600"
                label="Volume" value={formatFCFA(totalVolume)}
                change="+4.2k" changePositive
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

              {/* Recent Reports */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <h2 className="font-black text-[16px] text-[#1b1c1c]">Recent Reports</h2>
                  <button onClick={() => navigate('/admin/reports')} className="text-[13px] text-[#ff6b1a] font-bold hover:underline">
                    View All
                  </button>
                </div>
                <table className="w-full text-[13px]">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Item / User', 'Category', 'Reason', 'Status', 'Action'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-black text-[10px] text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reports.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-8">No reports yet</td></tr>
                    ) : reports.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-[14px] text-gray-400">image</span>
                            </div>
                            <div>
                              <p className="font-semibold text-[#1b1c1c] truncate max-w-[120px]">Listing #{r.listing_id?.slice(0,6)}</p>
                              <p className="text-[11px] text-gray-400">{r.reporter_email || 'Anonymous'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {r.category || 'General'}
                          </span>
                        </td>
                        <td className={`px-5 py-3 font-semibold ${severityColor(r.severity)}`}>
                          {r.reason}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${statusDot(r.status)}`} />
                            <span className="capitalize text-[12px] text-gray-600">{r.status}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => navigate('/admin/reports')}
                            className="text-gray-400 hover:text-[#ff6b1a] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Listing Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-black text-[16px] text-[#1b1c1c] mb-6">Listing Distribution</h2>
                {distribution.length === 0 ? (
                  <p className="text-gray-400 text-[13px] text-center py-8">No listings yet</p>
                ) : (
                  <div className="space-y-4">
                    {distribution.map(({ cat, pct }) => (
                      <div key={cat}>
                        <div className="flex justify-between text-[12px] mb-1.5">
                          <span className="font-bold text-gray-600 uppercase tracking-wider">{cat}</span>
                          <span className="font-black text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#ff6b1a] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick stats */}
                <div className="mt-8 space-y-3 border-t border-gray-100 pt-5">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">Total Listings</span>
                    <span className="font-bold text-[#1b1c1c]">{listings.length}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">Total Users</span>
                    <span className="font-bold text-[#1b1c1c]">{stats?.totalUsers ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">Fraud Flags</span>
                    <span className="font-bold text-red-500">{stats?.fraudFlags ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Manage Users',    icon: 'group',    path: '/admin/users',    color: 'bg-blue-50 text-blue-600' },
                { label: 'All Listings',    icon: 'storefront',path: '/admin/listings', color: 'bg-orange-50 text-[#ff6b1a]' },
                { label: 'View Reports',    icon: 'flag',     path: '/admin/reports',  color: 'bg-red-50 text-red-600' },
                { label: 'Fraud Alerts',    icon: 'gpp_bad',  path: '/admin/fraud',    color: 'bg-yellow-50 text-yellow-600' },
              ].map((a) => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.color}`}>
                    <span className="material-symbols-outlined text-[18px]">{a.icon}</span>
                  </div>
                  <span className="font-bold text-[14px] text-[#1b1c1c]">{a.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
