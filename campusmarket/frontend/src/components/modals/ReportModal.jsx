import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const reasons = [
  'Fake item / Scam',
  'Wrong price',
  'Spam',
  'Offensive content',
  'Other',
];

const ReportModal = ({ listing, onClose }) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!reason) {
      showToast('Please select a reason', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Report submitted. We will review it shortly.', 'success');
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-[20px]">flag</span>
            </div>
            <div>
              <h2 className="font-black text-[16px] text-[#1b1c1c]">Report Listing</h2>
              {listing && (
                <p className="text-[12px] text-gray-400 truncate max-w-[200px]">{listing.title}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[#1b1c1c] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-3">
              Reason for Report
            </label>
            <div className="flex flex-col gap-2">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    reason === r
                      ? 'border-[#ff6b1a] bg-orange-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[#ff6b1a]"
                  />
                  <span className={`text-[14px] font-semibold ${reason === r ? 'text-[#ff6b1a]' : 'text-[#1b1c1c]'}`}>
                    {r}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in more detail..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] resize-none"
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
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-[14px] hover:bg-red-700 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
