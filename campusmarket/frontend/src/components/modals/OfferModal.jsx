import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { formatFCFA } from '../../data/listings';

const OfferModal = ({ listing, onClose, mode = 'offer' }) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!amount || Number(amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast(mode === 'counter' ? 'Counter offer sent!' : 'Offer sent!', 'success');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ff6b1a] to-[#e55a10] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-[18px]">
              {mode === 'counter' ? 'Counter Offer' : 'Make an Offer'}
            </h2>
            {listing && (
              <p className="text-white/80 text-[13px] mt-0.5">{listing.title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {listing?.priceFCFA && (
            <div className="bg-[#fcf9f8] rounded-xl p-4 mb-5 flex items-center justify-between">
              <span className="text-[13px] text-gray-500 font-medium">Listed Price</span>
              <span className="text-[20px] font-black text-[#ff6b1a]">
                {formatFCFA(listing.priceFCFA)}
              </span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
              Your Offer (FCFA)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[14px]">
                FCFA
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-16 pr-4 py-3 border border-gray-200 rounded-xl text-[16px] font-bold focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a message to the seller..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none transition-all"
            />
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
              className="flex-1 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;
