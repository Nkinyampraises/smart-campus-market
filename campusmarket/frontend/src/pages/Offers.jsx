import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import OfferModal from '../components/modals/OfferModal';
import { mockOffers } from '../data/mockData';
import { formatFCFA } from '../data/listings';
import { useToast } from '../context/ToastContext';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-600' },
  countered: { label: 'Countered', color: 'bg-blue-100 text-blue-700' },
};

const Offers = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('Received');
  const [offers, setOffers] = useState(mockOffers);
  const [counterTarget, setCounterTarget] = useState(null);

  const received = offers.filter((o) => o.direction === 'received');
  const sent = offers.filter((o) => o.direction === 'sent');
  const shown = activeTab === 'Received' ? received : sent;

  const accept = (id) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status: 'accepted' } : o));
    showToast('Offer accepted! Listing is now Reserved.', 'success');
    setTimeout(() => navigate('/inbox'), 1500);
  };

  const decline = (id) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status: 'declined' } : o));
    showToast('Offer declined.', 'neutral');
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="offers" />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[32px] font-black text-[#1b1c1c]">Offers</h1>
          <p className="text-[14px] text-gray-400 mt-1">Manage price negotiations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { label: 'Received', count: received.filter((o) => o.status === 'pending').length },
            { label: 'Sent', count: 0 },
          ].map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`px-6 py-2.5 rounded-full font-bold text-[13px] flex items-center gap-2 transition-all ${
                activeTab === label
                  ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff6b1a] hover:text-[#ff6b1a]'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="bg-white/30 text-xs font-black px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Offer Cards */}
        <div className="flex flex-col gap-5">
          {shown.map((offer) => {
            const listing = offer.listing;
            const person = offer.buyer || offer.seller;
            const status = statusConfig[offer.status] || statusConfig.pending;

            return (
              <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-[15px] text-[#1b1c1c]">{listing.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black"
                            style={{ backgroundColor: person.color }}
                          >
                            {person.initials}
                          </div>
                          <span className="text-[12px] text-gray-500">{person.name}</span>
                          <span className="text-[11px] text-gray-400">· {offer.date}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Price comparison */}
                    <div className="bg-[#fcf9f8] rounded-xl p-3 flex items-center gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                          {activeTab === 'Received' ? 'Your Price' : 'Listed Price'}
                        </p>
                        <p className="text-[15px] font-black text-[#1b1c1c]">{formatFCFA(listing.yourPrice)}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 text-[20px]">arrow_forward</span>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                          {activeTab === 'Received' ? 'Their Offer' : 'Your Offer'}
                        </p>
                        <p className="text-[15px] font-black text-[#ff6b1a]">{formatFCFA(offer.offerAmount)}</p>
                      </div>
                      {offer.counterAmount && (
                        <>
                          <span className="material-symbols-outlined text-gray-300 text-[20px]">arrow_forward</span>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Counter</p>
                            <p className="text-[15px] font-black text-blue-600">{formatFCFA(offer.counterAmount)}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {offer.note && (
                      <p className="text-[13px] text-gray-500 italic mb-3">"{offer.note}"</p>
                    )}

                    {/* Actions for received pending */}
                    {offer.direction === 'received' && offer.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => accept(offer.id)}
                          className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-[12px] hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Accept
                        </button>
                        <button
                          onClick={() => setCounterTarget(offer)}
                          className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-[12px] hover:bg-blue-700 transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">reply</span>
                          Counter
                        </button>
                        <button
                          onClick={() => decline(offer.id)}
                          className="px-5 py-2 border-2 border-red-300 text-red-500 rounded-xl font-bold text-[12px] hover:bg-red-50 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {shown.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-[52px] mb-3 block">local_offer</span>
              <p className="font-bold text-[16px]">No {activeTab.toLowerCase()} offers</p>
            </div>
          )}
        </div>
      </div>

      {counterTarget && (
        <OfferModal
          listing={{ title: counterTarget.listing.title, priceFCFA: counterTarget.offerAmount }}
          mode="counter"
          onClose={() => setCounterTarget(null)}
        />
      )}
    </div>
  );
};

export default Offers;
