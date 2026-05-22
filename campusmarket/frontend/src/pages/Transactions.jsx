import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatFCFA } from '../utils/format';

const Transactions = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTransactions()
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter((t) => {
    if (tab === 'all') return true;
    if (tab === 'sold') return t.role === 'seller';
    if (tab === 'bought') return t.role === 'buyer';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="transactions" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ff6b1a]">receipt_long</span>
          Transactions
        </h1>
        <div className="flex gap-2 mb-6">
          {['all', 'sold', 'bought'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full font-bold text-[13px] capitalize transition-all ${tab === t ? 'bg-[#ff6b1a] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {t}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">receipt_long</span>
            <p className="font-semibold">No transactions yet</p>
            <p className="text-[14px] mt-1">Completed deals will appear here</p>
            <button onClick={() => navigate('/browse')} className="mt-4 px-6 py-2.5 bg-[#ff6b1a] text-white rounded-full font-bold text-[14px]">Start Shopping</button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-5 shadow-[0px_4px_40px_rgba(0,0,0,0.06)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${t.role === 'seller' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    <span className="material-symbols-outlined">{t.role === 'seller' ? 'arrow_upward' : 'arrow_downward'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-[#1b1c1c] text-[15px]">{t.listing_title || 'Unknown item'}</p>
                    <p className="text-[13px] text-gray-500">{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-[#1b1c1c] text-[16px]">{formatFCFA(t.final_price || 0)}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${t.role === 'seller' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.role === 'seller' ? 'Sold' : 'Bought'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
