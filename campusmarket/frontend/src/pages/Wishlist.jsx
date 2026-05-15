import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { mockWishlistItems } from '../data/mockData';
import { formatFCFA } from '../data/listings';

const Wishlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]');
      // Merge stored with mock
      const mockIds = mockWishlistItems.map((m) => String(m.id));
      const extra = stored.filter((s) => !mockIds.includes(String(s.id)));
      return [...mockWishlistItems, ...extra];
    } catch {
      return mockWishlistItems;
    }
  });

  const remove = (id) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    try {
      const stored = JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]');
      localStorage.setItem(
        'campustrade_wishlist',
        JSON.stringify(stored.filter((s) => String(s.id) !== String(id)))
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="wishlist" />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-black text-[#1b1c1c] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              My Wishlist
            </h1>
            <p className="text-[14px] text-gray-400 mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[44px]">favorite_border</span>
            </div>
            <h3 className="text-[22px] font-bold text-[#1b1c1c] mb-2">Your wishlist is empty</h3>
            <p className="text-[14px] text-gray-400 mb-8 max-w-sm">
              Save items you love and we'll notify you when the price drops.
            </p>
            <Link
              to="/browse"
              className="bg-[#ff6b1a] text-white px-8 py-3 rounded-full font-bold text-[14px] hover:shadow-lg transition-all no-underline"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden flex gap-0 hover:shadow-md transition-all group ${
                  item.priceDrop ? 'border-emerald-300' : 'border-gray-100'
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="w-40 h-36 flex-shrink-0 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/listing/${item.listingId || item.id}`)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-black tracking-widest text-[#ff6b1a] uppercase">
                        {item.category}
                      </span>
                      {item.priceDrop && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                          PRICE DROP
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-[16px] text-[#1b1c1c] mb-1 leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-1 text-[12px] text-gray-400">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{item.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    {item.priceDrop && item.originalPriceFCFA ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[20px] font-black text-[#ff6b1a]">{formatFCFA(item.priceFCFA)}</span>
                        <span className="text-[14px] text-gray-400 line-through">{formatFCFA(item.originalPriceFCFA)}</span>
                      </div>
                    ) : (
                      <span className="text-[20px] font-black text-[#ff6b1a]">{formatFCFA(item.priceFCFA)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end justify-between p-5 flex-shrink-0">
                  <button
                    onClick={() => remove(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                    title="Remove"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                  <button
                    onClick={() => navigate(`/listing/${item.listingId || item.id}`)}
                    className="flex items-center gap-1 text-[#ff6b1a] font-bold text-[13px] hover:underline"
                  >
                    View
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Browse more CTA */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center text-center mt-2">
              <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">bookmarks</span>
              <h3 className="text-[18px] font-bold text-[#1b1c1c] mb-1">Want to save more?</h3>
              <p className="text-[13px] text-gray-400 mb-5 max-w-xs">
                Browse the marketplace and heart any item to add it here.
              </p>
              <Link
                to="/browse"
                className="bg-[#ff6b1a] text-white px-7 py-3 rounded-full font-bold text-[14px] hover:shadow-lg transition-all no-underline"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
