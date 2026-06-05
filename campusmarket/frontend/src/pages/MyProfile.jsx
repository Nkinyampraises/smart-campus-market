import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';

const ZONES = ['Canteen', 'Chumbuw Hall', 'Eric Mbarika', 'George Mbarika', 'Pondi Hall', 'Linda Terry Hall', 'IT Hall', 'Chapel', 'French Hall', 'Cisco Lab', 'Computer Lab'];

const MyProfile = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', campusZone: '', bio: '',
  });
  const [avatar, setAvatar]   = useState(null);   // base64 preview
  const [banner, setBanner]   = useState(null);   // base64 preview
  const [saving, setSaving]   = useState(false);
  const [reviews, setReviews] = useState([]);
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName:   user.first_name  || '',
      lastName:    user.last_name   || '',
      phone:       user.phone       || '',
      campusZone:  user.campus_zone || '',
      bio:         user.bio         || '',
    });
    setAvatar(user.avatar_url || null);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    api.getUser(user.id).then((p) => setReviews(p?.reviews || [])).catch(() => {});
    api.getMyListings().catch(() => {});
  }, [user?.id]);

  const handleImageFile = (file, setter) => {
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateMe({
        first_name:  form.firstName,
        last_name:   form.lastName,
        phone:       form.phone,
        campus_zone: form.campusZone,
        bio:         form.bio,
        avatar_url:  avatar || user?.avatar_url || null,
      });
      await updateUser({
        first_name: form.firstName, last_name: form.lastName,
        campus_zone: form.campusZone, bio: form.bio, phone: form.phone,
        avatar_url: avatar || user?.avatar_url || null,
      });
      showToast('Profile updated!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${form.firstName} ${form.lastName}`.trim() || user?.email?.split('@')[0] || 'User';
  const initials = ((form.firstName?.[0] || '') + (form.lastName?.[0] || '')).toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Topbar activePage="my-profile" />

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Profile Card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6">

          {/* Banner */}
          <div
            className="relative h-40 cursor-pointer group"
            style={{
              background: banner
                ? `url(${banner}) center/cover no-repeat`
                : 'linear-gradient(135deg, #ff6b1a 0%, #a43e00 100%)',
              backgroundSize: 'cover',
            }}
            onClick={() => bannerRef.current?.click()}
          >
            {/* Dot pattern overlay */}
            {!banner && (
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-[13px] font-bold flex items-center gap-1 bg-black/40 px-3 py-1.5 rounded-full transition-all">
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                Change Banner
              </span>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files[0] && handleImageFile(e.target.files[0], setBanner)} />
          </div>

          {/* Avatar + Info */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Avatar */}
              <div className="relative group cursor-pointer" onClick={() => avatarRef.current?.click()}>
                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-[#ff6b1a] flex items-center justify-center">
                  {avatar ? (
                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-[28px]">{initials}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-2xl transition-all flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[20px] opacity-0 group-hover:opacity-100 transition-all">photo_camera</span>
                </div>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files[0] && handleImageFile(e.target.files[0], setAvatar)} />
              </div>

              {/* Edit button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-[#ff6b1a] text-white rounded-full font-bold text-[13px] hover:bg-[#e05f15] transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[16px]">save</span>}
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>

            <h1 className="text-[22px] font-black text-[#1b1c1c]">{fullName}</h1>
            <div className="flex items-center gap-1 mt-0.5 mb-3">
              <span className="material-symbols-outlined text-[14px] text-[#ff6b1a]">diamond</span>
              <span className="text-[13px] text-gray-500">{user?.email}</span>
            </div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((s) => (
                <span key={s} className={`material-symbols-outlined text-[16px] ${s <= Math.round(user?.rating || 0) ? 'text-yellow-400' : 'text-gray-200'}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              ))}
              <span className="text-[12px] text-gray-400 ml-1">{Number(user?.rating || 0).toFixed(2)} ({reviews.length} reviews)</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-5">
          {[
            { id: 'info',    label: 'Edit Info' },
            { id: 'reviews', label: `Reviews (${reviews.length})` },
            { id: 'stats',   label: 'Stats' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${tab === t.id ? 'bg-[#ff6b1a] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#ff6b1a]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        {tab === 'info' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-black text-[16px] text-[#1b1c1c] mb-4">Personal Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1.5">First Name</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="First name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]" />
              </div>
              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1.5">Last Name</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Last name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+237 6XX XXX XXX"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]" />
            </div>

            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1.5">Campus Zone</label>
              <select value={form.campusZone} onChange={(e) => setForm({ ...form, campusZone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white">
                <option value="">Select zone…</option>
                {ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell buyers a bit about yourself…"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none" />
            </div>

            <div className="pt-2 flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:bg-[#e05f15] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => navigate('/browse')}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                <span className="material-symbols-outlined text-[48px] mb-3 block">star_border</span>
                <p className="font-semibold">No reviews yet</p>
                <p className="text-[13px] mt-1">Complete sales to receive reviews from buyers</p>
              </div>
            ) : reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#ff6b1a] flex items-center justify-center text-white font-black text-[12px]">
                    {(r.reviewer_first?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[14px]">{r.reviewer_first} {r.reviewer_last}</p>
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={`material-symbols-outlined text-[13px] ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-[12px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-[13px] text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'stats' && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Active Listings', value: user?.active_listings ?? 0, icon: 'storefront', color: 'text-[#ff6b1a] bg-orange-50' },
              { label: 'Items Sold',      value: user?.sold_items ?? 0,      icon: 'sell',       color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Rating',          value: `${Number(user?.rating || 0).toFixed(1)} ★`,  icon: 'star', color: 'text-yellow-600 bg-yellow-50' },
              { label: 'Reviews',         value: reviews.length,             icon: 'reviews',    color: 'text-blue-600 bg-blue-50' },
              { label: 'Member Since',    value: user?.member_since || '—',  icon: 'calendar_month', color: 'text-purple-600 bg-purple-50' },
              { label: 'Campus Zone',     value: user?.campus_zone || '—',  icon: 'location_on', color: 'text-gray-600 bg-gray-100' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </div>
                <div>
                  <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{s.label}</p>
                  <p className="text-[20px] font-black text-[#1b1c1c]">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProfile;
