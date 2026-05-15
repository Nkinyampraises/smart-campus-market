import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useToast } from '../context/ToastContext';
import { listings } from '../data/listings';

const CATEGORIES = ['Textbooks', 'Electronics', 'Housing', 'Clothing', 'Services', 'Accessories'];
const CONDITIONS = ['New / Unopened', 'Excellent Condition', 'Good Condition', 'Used', 'For Parts'];

const EditListing = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();

  const getListing = () => {
    const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
    const all = [...stored, ...listings];
    return all.find((l) => String(l.id) === String(id));
  };

  const source = getListing();

  const [form, setForm] = useState({
    title: source?.title || '',
    description: source?.description || '',
    category: source?.category || 'Textbooks',
    condition: source?.condition || 'Good Condition',
    price: source?.priceFCFA || source?.price || '',
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      // Update in localStorage
      const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
      const updated = stored.map((l) =>
        String(l.id) === String(id)
          ? { ...l, ...form, priceFCFA: Number(form.price), price: Number(form.price) }
          : l
      );
      localStorage.setItem('campustrade_listings', JSON.stringify(updated));
      setLoading(false);
      showToast('Listing updated!', 'success');
      navigate('/my-listings');
    }, 800);
  };

  const handleMarkSold = () => {
    const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
    const updated = stored.map((l) =>
      String(l.id) === String(id) ? { ...l, status: 'Sold' } : l
    );
    localStorage.setItem('campustrade_listings', JSON.stringify(updated));
    showToast('Listing marked as Sold!', 'success');
    navigate('/my-listings');
  };

  const handleDelete = () => {
    const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
    const updated = stored.filter((l) => String(l.id) !== String(id));
    localStorage.setItem('campustrade_listings', JSON.stringify(updated));
    showToast('Listing deleted', 'neutral');
    navigate('/my-listings');
  };

  const stats = [
    { label: 'Views', value: source?.views || 0, icon: 'visibility' },
    { label: 'Wishlists', value: source?.saves || 0, icon: 'favorite' },
    { label: 'Offers', value: source?.inquiries || 0, icon: 'local_offer' },
    { label: 'Days Left', value: 28, icon: 'timer' },
  ];

  if (!source) {
    return (
      <div className="min-h-screen bg-[#fcf9f8]">
        <Topbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <p className="text-[18px] font-bold text-gray-400">Listing not found</p>
            <button onClick={() => navigate('/my-listings')} className="mt-4 text-[#ff6b1a] font-bold">
              Back to My Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate('/my-listings')}
              className="text-[13px] text-gray-400 font-bold flex items-center gap-1 hover:text-[#ff6b1a] transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              My Listings
            </button>
            <h1 className="text-[28px] font-black text-[#1b1c1c]">Edit Listing</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkSold}
              className="px-5 py-2.5 border-2 border-emerald-500 text-emerald-600 rounded-xl font-bold text-[13px] hover:bg-emerald-50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">sell</span>
              Mark as Sold
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-5 py-2.5 border-2 border-red-400 text-red-500 rounded-xl font-bold text-[13px] hover:bg-red-50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => set('category', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Condition</label>
                  <div className="relative">
                    <select
                      value={form.condition}
                      onChange={(e) => set('condition', e.target.value)}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10"
                    >
                      {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">Price (FCFA)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[13px]">FCFA</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    className="w-full pl-16 pr-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => navigate('/my-listings')}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-bold text-[13px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Saving…' : 'Save Changes'}
                {!loading && <span className="material-symbols-outlined text-[18px]">save</span>}
              </button>
            </div>
          </div>

          {/* Listing Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
            <h3 className="font-bold text-[15px] text-[#1b1c1c] mb-4">Listing Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-[#fcf9f8] rounded-xl p-4 text-center">
                  <span className="material-symbols-outlined text-[#ff6b1a] text-[22px] mb-1 block">{s.icon}</span>
                  <p className="text-[22px] font-black text-[#1b1c1c]">{s.value}</p>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {source.image && (
              <div className="mt-5 rounded-xl overflow-hidden" style={{ height: '160px' }}>
                <img
                  src={source.images?.[0] || source.image}
                  alt={source.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-red-500 text-[32px]">delete_forever</span>
            </div>
            <h3 className="font-bold text-[18px] text-[#1b1c1c] mb-2">Delete this listing?</h3>
            <p className="text-[14px] text-gray-500 mb-6">
              This action cannot be undone. Your listing will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-[14px] hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditListing;
