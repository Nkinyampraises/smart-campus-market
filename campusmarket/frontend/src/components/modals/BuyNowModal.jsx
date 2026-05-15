import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatFCFA } from '../../data/listings';
import { mockNotifications } from '../../data/mockData';

const campusZones = [
  'Engineering Block',
  'Science Block',
  'Arts Block',
  'Main Dorms',
  'Student Union',
  'Medical Block',
  'Main Campus Library',
  'South Campus Quad',
  'North Campus Gate',
];

const BuyNowModal = ({ listing, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [zone, setZone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!zone) {
      showToast('Please select your campus zone', 'error');
      return;
    }
    setLoading(true);

    setTimeout(() => {
      // Push a seller notification into the mock notifications array
      const newNotif = {
        id: `buy_${Date.now()}`,
        type: 'buy_request',
        icon: 'shopping_bag',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        title: 'New buy request!',
        description: `${user?.name || 'A student'} wants to buy "${listing.title}" — delivering to ${zone}${landmark ? `, ${landmark}` : ''}.`,
        time: 'Just now',
        read: false,
        link: '/inbox',
      };
      mockNotifications.unshift(newNotif);

      setLoading(false);
      setSubmitted(true);
    }, 900);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-center p-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-emerald-600 text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h2 className="font-[Epilogue] text-[22px] font-black text-[#1b1c1c] mb-2">Request Sent!</h2>
          <p className="text-[14px] text-gray-500 mb-1">
            The seller has been notified that you want to buy
          </p>
          <p className="text-[15px] font-bold text-[#1b1c1c] mb-5">"{listing.title}"</p>

          <div className="bg-[#f6f3f2] rounded-xl p-4 text-left mb-6">
            <p className="text-[11px] font-black tracking-widest uppercase text-gray-400 mb-2">Your delivery location</p>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[18px] mt-0.5">location_on</span>
              <div>
                <p className="text-[14px] font-bold text-[#1b1c1c]">{zone}</p>
                {landmark && <p className="text-[13px] text-gray-500">{landmark}</p>}
              </div>
            </div>
          </div>

          <p className="text-[13px] text-gray-400 mb-6">
            The seller will contact you via chat to confirm the meetup. Check your inbox for updates.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); navigate('/inbox'); }}
              className="flex-1 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Open Inbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-[18px]">Buy Now</h2>
            <p className="text-white/80 text-[13px] mt-0.5 truncate max-w-[260px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Price summary */}
          <div className="bg-[#f6f3f2] rounded-xl p-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={listing.images?.[0] || listing.image}
                alt={listing.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div>
                <p className="text-[13px] font-bold text-[#1b1c1c] line-clamp-1">{listing.title}</p>
                <p className="text-[11px] text-gray-400">{listing.condition}</p>
              </div>
            </div>
            <span className="text-[20px] font-black text-[#ff6b1a]">
              {formatFCFA(listing.priceFCFA)}
            </span>
          </div>

          {/* Location section */}
          <div className="mb-1">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-1.5">
              Your Campus Zone <span className="text-red-400">*</span>
            </label>
            <p className="text-[12px] text-gray-400 mb-2">
              Tell the seller where you are on campus so they can deliver to you.
            </p>
          </div>

          <div className="mb-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ff6b1a] text-[20px]">
                location_on
              </span>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={`w-full appearance-none pl-10 pr-10 py-3 border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition-all ${!zone ? 'border-gray-200 text-gray-400' : 'border-emerald-400 text-[#1b1c1c] font-medium'}`}
              >
                <option value="">Select your zone…</option>
                {campusZones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
              Specific Spot (optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near the library entrance, Bench 12, Block A lobby…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
              Note to Seller (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I'm available from 2pm today, please bring the charger…"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
            />
          </div>

          {/* Info pill */}
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
            <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5 flex-shrink-0">info</span>
            <p className="text-[12px] text-emerald-700 leading-relaxed">
              The seller will be notified instantly. Payment is made in person at your campus location upon delivery.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-[14px] hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  Send Buy Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyNowModal;
