import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';
import { useToast } from '../context/ToastContext';

const Offers = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState('received');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = () => {
    setLoading(true);
    api.getMyOffers(tab).then((data) => {
      setOffers(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchOffers(); }, [tab]);

  const handleAction = async (id, action) => {
    try {
      await api.updateOffer(id, { action });
      showToast(`Offer ${action}ed`, 'success');
      fetchOffers();
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="offers" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-8 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ff6b1a]">local_offer</span>
          Offers
        </h1>
        <div className="flex gap-2 mb-6">
          {['received', 'sent'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full font-bold text-[13px] capitalize transition-all ${tab === t ? 'bg-[#ff6b1a] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : offers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">local_offer</span>
            <p className="font-semibold">No {tab} offers yet</p>
            <p className="text-[14px] mt-1">{tab === 'received' ? 'Offers from buyers will appear here' : 'Browse listings and make an offer'}</p>
            {tab === 'sent' && (
              <button onClick={() => navigate('/browse')} className="mt-4 px-6 py-2.5 bg-[#ff6b1a] text-white rounded-full font-bold text-[14px]">Browse Listings</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {offers.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[14px] text-[#1b1c1c]">{o.listing_title || 'Listing'}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">{tab === 'received' ? `From: ${o.buyer_first} ${o.buyer_last}` : `To seller: ${o.seller_first} ${o.seller_last}`}</p>
                  <p className="text-[18px] font-black text-[#ff6b1a] mt-2">{formatFCFA(o.amount)}</p>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block ${
                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    o.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'declined' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{o.status}</span>
                </div>
                {tab === 'received' && o.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(o.id, 'accept')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-[12px] hover:bg-emerald-700">Accept</button>
                    <button onClick={() => handleAction(o.id, 'decline')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-[12px] hover:bg-gray-50">Decline</button>
                  </div>
                )}
                {tab === 'sent' && o.status === 'pending' && (
                  <button onClick={() => handleAction(o.id, 'withdraw')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-[12px] hover:bg-gray-50">Withdraw</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Offers;
