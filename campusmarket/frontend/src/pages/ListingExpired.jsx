import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listings, formatFCFA } from '../data/listings';

const ListingExpired = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const similarItems = listings.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope]">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/home" className="text-[22px] font-black tracking-tighter text-[#ff6b1a] no-underline">
            CampusTrade
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-yellow-600 text-[52px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            hourglass_empty
          </span>
        </div>

        <h1 className="font-[Epilogue] text-[30px] font-bold text-[#1b1c1c] mb-2">Listing Expired</h1>
        <p className="text-[15px] text-gray-500 mb-8 max-w-sm mx-auto">
          This listing is no longer active. It may have been sold or expired after 30 days.
        </p>

        <div className="flex justify-center gap-3 mb-16">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-7 py-3 border-2 border-gray-200 text-[#1b1c1c] rounded-full font-bold text-[14px] hover:bg-gray-50 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Go Back
          </button>
          <Link
            to="/browse"
            className="flex items-center gap-2 px-7 py-3 bg-[#ff6b1a] text-white rounded-full font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all no-underline"
          >
            Browse Similar
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Similar Items */}
        <div className="text-left">
          <h2 className="text-[20px] font-black text-[#1b1c1c] mb-5">Similar Listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {similarItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/listing/${item.id}`)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-black text-[#ff6b1a] uppercase tracking-wider mb-1">{item.category}</p>
                  <h3 className="font-bold text-[14px] text-[#1b1c1c] leading-snug mb-2 truncate">{item.title}</h3>
                  <p className="font-black text-[16px] text-[#ff6b1a]">{formatFCFA(item.priceFCFA)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingExpired;
