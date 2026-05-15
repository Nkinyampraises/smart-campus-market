import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import AdminSidebar from '../components/AdminSidebar';
import { adminAllListings } from '../data/mockData';
import { formatFCFA } from '../data/listings';
import { useToast } from '../context/ToastContext';

const FILTERS = ['All', 'Active', 'Hidden', 'Flagged', 'Expired'];

const statusConfig = {
  Active: 'bg-emerald-100 text-emerald-700',
  Hidden: 'bg-gray-100 text-gray-600',
  Flagged: 'bg-red-100 text-red-600',
  Expired: 'bg-yellow-100 text-yellow-700',
};

const AdminListings = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [listings, setListings] = useState(adminAllListings);
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = listings.filter((l) => activeFilter === 'All' || l.status === activeFilter);

  const removeListing = (id) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    showToast('Listing removed.', 'success');
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />
      <div className="max-w-7xl mx-auto flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-[32px] font-black text-[#1b1c1c]">Marketplace Listings</h1>
            <p className="text-[14px] text-gray-400 mt-1">{listings.length} total listings</p>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full font-bold text-[12px] transition-all ${
                  activeFilter === f
                    ? 'bg-[#ff6b1a] text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff6b1a]'
                }`}
              >
                {f}
                <span className="ml-1 opacity-70">
                  ({f === 'All' ? listings.length : listings.filter((l) => l.status === f).length})
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
              {['Item', 'Seller', 'Price', 'Category', 'Status', 'Reports', 'Actions'].map((h) => (
                <span key={h} className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{h}</span>
              ))}
            </div>

            {filtered.map((listing) => (
              <div
                key={listing.id}
                className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-gray-50 items-center ${
                  listing.status === 'Flagged' ? 'bg-red-50/30' : 'hover:bg-gray-50/40'
                } transition-colors`}
              >
                {/* Item */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={listing.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <p className="font-bold text-[13px] text-[#1b1c1c] line-clamp-2">{listing.title}</p>
                </div>

                <p className="text-[12px] text-gray-600">{listing.seller}</p>

                <p className="font-bold text-[13px] text-[#ff6b1a]">{formatFCFA(listing.priceFCFA)}</p>

                <p className="text-[12px] text-gray-600">{listing.category}</p>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${statusConfig[listing.status] || 'bg-gray-100 text-gray-600'}`}>
                  {listing.status}
                </span>

                <span className={`font-bold text-[13px] ${listing.reports > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {listing.reports}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/listing/${listing.id}`)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    View
                  </button>
                  <button
                    onClick={() => removeListing(listing.id)}
                    className="px-3 py-1.5 border border-red-300 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-[48px] mb-3 block">store</span>
                <p className="font-semibold">No listings found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminListings;
