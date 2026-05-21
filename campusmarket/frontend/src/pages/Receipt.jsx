import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import RateSellerModal from '../components/modals/RateSellerModal';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Receipt = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [showRateModal, setShowRateModal] = useState(false);
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTransactions().then((data) => {
      const all = [...(data.sold || []), ...(data.bought || [])];
      const found = all.find((t) => String(t.id) === String(transactionId));
      setTxn(found || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [transactionId]);

  const handleDownload = () => {
    showToast('Receipt downloaded!', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="min-h-screen bg-[#fcf9f8]">
        <Topbar />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-gray-400 font-bold">Transaction not found</p>
        </div>
      </div>
    );
  }

  const isBuyer = txn.buyer_id === user?.id;

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate('/transactions')}
          className="text-[13px] text-gray-400 font-bold flex items-center gap-1 hover:text-[#ff6b1a] transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Transactions
        </button>

        {/* Header */}
        <div className="relative rounded-3xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, #ff6b1a 0%, #a43e00 100%)', padding: '40px 32px' }}>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <p className="text-white/70 text-[12px] font-black tracking-widest uppercase">Transaction Complete</p>
              <h1 className="text-white font-black text-[26px]">Receipt</h1>
              <p className="text-white/80 text-[13px]">#{String(txn.id).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {/* Item preview */}
          <div className="flex gap-4 p-6 border-b border-gray-100">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <img src={Array.isArray(txn.images) ? txn.images[0] : txn.image || ''} alt={txn.title} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-widest text-[#ff6b1a] uppercase">{txn.category || 'Item'}</p>
              <h3 className="font-bold text-[16px] text-[#1b1c1c]">{txn.title || 'Listing'}</h3>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {[
              { label: isBuyer ? 'Seller' : 'Buyer', value: isBuyer ? `${txn.seller_first} ${txn.seller_last}` : `${txn.buyer_first} ${txn.buyer_last}` },
              { label: 'Date', value: new Date(txn.completed_at).toLocaleDateString() },
              { label: 'Status', value: 'Completed' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-[12px] font-black tracking-widest text-gray-400 uppercase">{label}</span>
                <span className="text-[14px] font-bold text-[#1b1c1c]">{value}</span>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between items-center py-3 bg-[#fcf9f8] rounded-xl px-4 mt-2">
              <span className="text-[12px] font-black tracking-widest text-gray-400 uppercase">Total</span>
              <span className={`text-[22px] font-black ${isBuyer ? 'text-[#ff6b1a]' : 'text-emerald-600'}`}>
                {isBuyer ? '' : '+'}{formatFCFA(txn.final_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isBuyer && (
            <button
              onClick={() => setShowRateModal(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-yellow-600 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">star</span>
              Rate Seller
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-[#1b1c1c] py-3.5 rounded-xl font-bold text-[14px] hover:bg-gray-50 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b1a] text-white py-3.5 rounded-xl font-bold text-[14px] hover:shadow-lg transition-all"
          >
            All Transactions
          </button>
        </div>
      </div>

      {showRateModal && (
        <RateSellerModal
          seller={{ name: isBuyer ? `${txn.seller_first} ${txn.seller_last}` : `${txn.buyer_first} ${txn.buyer_last}` }}
          transaction={txn}
          onClose={() => setShowRateModal(false)}
        />
      )}
    </div>
  );
};

export default Receipt;
