import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';

const Offers = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('received');

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
        <div className="text-center py-20 text-gray-400">
          <span className="material-symbols-outlined text-[48px] mb-3 block">local_offer</span>
          <p className="font-semibold">No {tab} offers yet</p>
          <p className="text-[14px] mt-1">{tab === 'received' ? 'Offers from buyers will appear here' : 'Browse listings and make an offer'}</p>
          {tab === 'sent' && (
            <button onClick={() => navigate('/browse')} className="mt-4 px-6 py-2.5 bg-[#ff6b1a] text-white rounded-full font-bold text-[14px]">Browse Listings</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Offers;
