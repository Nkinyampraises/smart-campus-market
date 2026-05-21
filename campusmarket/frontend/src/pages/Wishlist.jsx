import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';

const Wishlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWishlist().then((data) => {
      setItems(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    await api.removeWishlist(id).catch(() => {});
    setItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
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

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
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
                className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden flex gap-0 hover:shadow-md transition-all group"
              >
                {/* Thumbnail */}
                <div
                  className="w-40 h-36 flex-shrink-0 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/listing/${item.id}`)}
                >
                  <img
                    src={Array.isArray(item.images) ? item.images[0]?.url || item.images[0] : item.image || ''}
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
                    </div>
                    <h3 className="font-bold text-[16px] text-[#1b1c1c] mb-1 leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-1 text-[12px] text-gray-400">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{item.campus_zone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[20px] font-black text-[#ff6b1a]">{formatFCFA(item.price_fcfa || item.priceFCFA || 0)}</span>
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
                    onClick={() => navigate(`/listing/${item.id}`)}
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
