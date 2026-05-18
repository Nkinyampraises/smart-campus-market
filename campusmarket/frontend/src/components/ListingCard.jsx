import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFCFA } from '../utils/format';

const ListingCard = ({ listing, onWishlist, isWishlisted, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(listing);
    } else {
      navigate(`/listing/${listing.id}`);
    }
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    if (onWishlist) onWishlist(listing);
  };

  const image = listing.images?.[0] || listing.image || 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&h=400&fit=crop';
  const price = listing.priceFCFA || listing.price || 0;
  const seller = listing.seller || {};

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0px_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.10)] transition-all cursor-pointer group"
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: '200px' }}>
        <img
          src={image}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{
              color: isWishlisted ? '#ff6b1a' : '#9ca3af',
              fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            favorite
          </span>
        </button>
        {listing.condition && (
          <span className="absolute top-3 left-3 bg-white/90 text-[#1b1c1c] text-[10px] font-black px-2.5 py-1 rounded-full">
            {listing.condition}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black tracking-widest text-[#ff6b1a] uppercase">
            {listing.category || listing.categoryGroup}
          </span>
          <span className="text-[18px] font-black text-[#ff6b1a]">
            {typeof price === 'number' ? formatFCFA(price) : price}
          </span>
        </div>
        <h3 className="text-[15px] font-bold text-[#1b1c1c] mb-1.5 leading-snug line-clamp-2">
          {listing.title}
        </h3>
        <div className="flex items-center gap-1 text-[12px] text-gray-400 mb-3">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          <span>{listing.location}</span>
        </div>

        {/* Seller Row */}
        <div className="flex items-center justify-between border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
              style={{ backgroundColor: seller.color || '#ff6b1a' }}
            >
              {seller.initials || '?'}
            </div>
            <span className="text-[12px] font-medium text-[#1b1c1c]">{seller.name || 'Seller'}</span>
          </div>
          <span className="text-[11px] text-gray-400">{listing.postedAgo || ''}</span>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
