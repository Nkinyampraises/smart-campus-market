import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const zones = ['Engineering Block', 'Science Block', 'Arts Block', 'Main Dorms', 'Student Union', 'Medical Block'];

const reviews = [
  { name: 'Sarah Mbeki', initials: 'SM', color: '#006c46', rating: 5, comment: 'Great seller! Very responsive.', date: '2 days ago' },
  { name: 'Jean-Paul N.', initials: 'JN', color: '#5c5f60', rating: 5, comment: 'Item exactly as described. Fast reply.', date: '1 week ago' },
  { name: 'Chisom Eze', initials: 'CE', color: '#a43e00', rating: 4, comment: 'Good deal overall!', date: '2 weeks ago' },
];

const MyProfile = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('Edit Info');
  const [form, setForm] = useState({
    firstName: user?.firstName || 'Alex',
    lastName: user?.lastName || 'Henderson',
    phone: user?.phone || '',
    campusZone: user?.campusZone || 'Engineering Block',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      updateUser({
        ...form,
        name: `${form.firstName} ${form.lastName}`,
        initials: `${form.firstName[0] || 'A'}${form.lastName[0] || 'H'}`.toUpperCase(),
      });
      setSaving(false);
      showToast('Profile updated!', 'success');
    }, 700);
  };

  const statCards = [
    { label: 'Active Listings', value: user?.activeListings || 8, icon: 'store', link: '/my-listings' },
    { label: 'Sold', value: user?.soldItems || 45, icon: 'sell', link: '/transactions' },
    { label: 'Bought', value: user?.boughtItems || 12, icon: 'shopping_bag', link: '/transactions' },
    { label: 'Rating', value: `${user?.rating || 4.8} ★`, icon: 'star', link: '/my-profile' },
  ];

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="profile" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Orange Banner */}
        <div
          className="relative rounded-3xl overflow-hidden mb-16"
          style={{ height: '175px', background: 'linear-gradient(135deg, #ff6b1a 0%, #a43e00 100%)' }}
        >
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Avatar — positioned to overlap below banner */}
          <div className="absolute -bottom-12 left-8">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-white text-[28px] font-black"
                style={{ backgroundColor: user?.color || '#ff6b1a' }}
              >
                {user?.initials || 'AH'}
              </div>
              {user?.isVerified && (
                <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-full border-2 border-white uppercase tracking-widest">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Name / info */}
        <div className="ml-36 mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[26px] font-black text-[#1b1c1c]">{user?.name || 'Alex Henderson'}</h1>
            <p className="text-[14px] text-gray-500">{user?.campusZone} · {user?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-yellow-400 text-[16px]"
                  style={{ fontVariationSettings: i < Math.floor(user?.rating || 4.8) ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
              ))}
              <span className="text-[13px] text-gray-500 ml-1">{user?.rating || 4.8} ({user?.reviews || 24} reviews)</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.link)}
              className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:shadow-md hover:border-[#ff6b1a]/30 transition-all group"
            >
              <span className="material-symbols-outlined text-[#ff6b1a] text-[22px] mb-2 block">{s.icon}</span>
              <p className="text-[24px] font-black text-[#1b1c1c]">{s.value}</p>
              <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 flex gap-3">
            {['Edit Info', 'Reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-full font-bold text-[13px] transition-all ${
                  activeTab === tab
                    ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-[#ff6b1a]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Edit Info Tab */}
          {activeTab === 'Edit Info' && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Campus Zone</label>
                  <div className="relative">
                    <select
                      value={form.campusZone}
                      onChange={(e) => set('campusZone', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {zones.map((z) => <option key={z}>{z}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                  rows={4}
                  placeholder="Tell buyers a bit about yourself..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#ff6b1a] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setForm({ firstName: user?.firstName || 'Alex', lastName: user?.lastName || 'Henderson', phone: user?.phone || '', campusZone: user?.campusZone || 'Engineering Block', bio: user?.bio || '' })}
                  className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'Reviews' && (
            <div className="p-8">
              <div className="flex flex-col gap-4">
                {reviews.map((r) => (
                  <div key={r.name} className="bg-[#fcf9f8] rounded-2xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[12px] flex-shrink-0"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.initials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[14px] text-[#1b1c1c]">{r.name}</p>
                          <span className="text-[12px] text-gray-400">{r.date}</span>
                        </div>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-yellow-400 text-[15px]"
                              style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-[14px] text-gray-600">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
