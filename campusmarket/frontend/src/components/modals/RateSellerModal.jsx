import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const RateSellerModal = ({ seller, transaction, onClose }) => {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleSubmit = () => {
    if (rating === 0) {
      showToast('Please select a star rating', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Rating submitted! Thank you for your feedback.', 'success');
      onClose();
    }, 800);
  };

  const displayRating = hovered || rating;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-[18px]">Rate Your Seller</h2>
            {seller && (
              <p className="text-white/90 text-[13px] mt-0.5">How was your experience with {seller.name}?</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          {/* Seller Avatar */}
          {seller && (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[20px] font-black mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: seller.color || '#ff6b1a' }}
            >
              {seller.initials}
            </div>
          )}

          {/* Stars */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform hover:scale-110"
              >
                <span
                  className="material-symbols-outlined text-[40px]"
                  style={{
                    color: star <= displayRating ? '#f59e0b' : '#e5e7eb',
                    fontVariationSettings: star <= displayRating ? "'FILL' 1" : "'FILL' 0",
                    transition: 'color 0.1s',
                  }}
                >
                  star
                </span>
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <p className="text-[14px] font-bold text-yellow-600 mb-5">{labels[displayRating]}</p>
          )}

          {/* Comment */}
          <div className="text-left mb-6">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
              Leave a comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-[14px] text-[#1b1c1c] hover:bg-gray-50 transition-all"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold text-[14px] hover:bg-yellow-600 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateSellerModal;
