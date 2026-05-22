import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { formatFCFA } from '../utils/format';
import { api } from '../services/api';

const TAB_FILTERS = ['active', 'reserved', 'sold', 'expired'];

const getStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'reserved': return 'bg-blue-100 text-blue-700';
    case 'sold': return 'bg-gray-100 text-gray-600';
    case 'expired': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const MyListings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [listings, setListings]   = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.getMyListings()
      .then((data) => setListings(data.map((l) => ({
        ...l,
        status: (l.status || 'active').toLowerCase(),
        priceFCFA: l.price_fcfa,
        location: l.campus_zone,
        image: l.images?.[0],
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));

    api.getTransactions().then((data) => {
      const sold = data?.sold || [];
      const total = sold.reduce((sum, t) => sum + Number(t.final_price || 0), 0);
      setTotalSales(total);
    }).catch(() => {});
  }, []);

  const filtered = listings.filter((l) => (l.status || 'active') === activeTab);

  const counts = {
    active:   listings.filter((l) => (l.status || 'active') === 'active').length,
    reserved: listings.filter((l) => l.status === 'reserved').length,
    sold:     listings.filter((l) => l.status === 'sold').length,
    expired:  listings.filter((l) => l.status === 'expired').length,
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="my-listings" />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <span className="text-[11px] font-black tracking-wider text-[#ff6b1a] mb-2 block uppercase">Seller Dashboard</span>
            <h1 className="text-[40px] font-black text-[#1b1c1c]">My Listings</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-[#e2bfb2] px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[#ff6b1a]">trending_up</span>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Sales</p>
                <p className="text-[16px] font-bold">{formatFCFA(totalSales)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/create-listing')}
              className="bg-[#ff6b1a] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              Post Listing
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 flex items-center gap-6 overflow-x-auto mb-8">
          {TAB_FILTERS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-medium text-[15px] whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-[#ff6b1a] border-b-2 border-[#ff6b1a] font-bold'
                  : 'text-gray-500 hover:text-[#ff6b1a]'
              }`}
            >
              {tab}
              <span className="ml-1.5 text-[12px] opacity-60">({counts[tab] || 0})</span>
            </button>
          ))}
        </div>

        {/* Listings */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {filtered.map((listing) => (
              <div
                key={listing.id}
                className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row gap-5 hover:shadow-[0px_4px_20px_rgba(0,0,0,0.06)] transition-all group"
              >
                {/* Image */}
                <div className="w-full md:w-44 h-44 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={listing.image || listing.images?.[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`${getStatusColor(listing.status || 'Active')} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                      {listing.status || 'active'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                        {listing.category} {listing.subcategory ? `· ${listing.subcategory}` : ''}
                      </span>
                      <span className="text-[22px] font-black text-[#ff6b1a]">
                        {formatFCFA(listing.priceFCFA || listing.price || 0)}
                      </span>
                    </div>
                    <h3 className="text-[22px] font-bold text-[#1b1c1c] mb-2">{listing.title}</h3>
                    <p className="text-[13px] text-gray-500 line-clamp-2">{listing.description}</p>
                  </div>

                  {/* Stats & Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span className="text-[12px] font-medium">{listing.views || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="material-symbols-outlined text-[16px]">favorite</span>
                      <span className="text-[12px] font-medium">{listing.saves || 0} saves</span>
                    </div>
                    {(listing.inquiries || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        <span className="text-[12px] font-medium">{listing.inquiries} messages</span>
                      </div>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => navigate(`/edit-listing/${listing.id}`)}
                        className="p-2 border border-gray-100 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-[#ff6b1a] transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      {listing.status === 'reserved' ? (
                        <button
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          className="bg-[#ff6b1a] text-white px-6 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all active:scale-95"
                        >
                          Mark as Sold
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          className="bg-[#ff6b1a]/10 text-[#ff6b1a] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#ff6b1a] hover:text-white transition-all"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[60px] text-gray-200 mb-4">inventory_2</span>
            <h3 className="text-[20px] font-bold text-[#1b1c1c] mb-2">No {activeTab} listings</h3>
            <p className="text-[14px] text-gray-400 mb-6">
              {activeTab === 'active' ? 'Post your first listing and start selling!' : `You have no ${activeTab} listings.`}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => navigate('/create-listing')}
                className="bg-[#ff6b1a] text-white px-8 py-3 rounded-full font-bold text-[14px] hover:shadow-lg transition-all"
              >
                Post a Listing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;
