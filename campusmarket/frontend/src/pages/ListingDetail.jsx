import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listings, featuredListing, similarItems, formatFCFA } from '../data/listings';
import Topbar from '../components/Topbar';
import OfferModal from '../components/modals/OfferModal';
import ReportModal from '../components/modals/ReportModal';
import BuyNowModal from '../components/modals/BuyNowModal';
import { useToast } from '../context/ToastContext';

const ListingDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();

  const listing = listings.find((l) => l.id === Number(id)) || featuredListing;

  const [activeImage, setActiveImage] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const getWishlist = () => {
    try { return JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]'); } catch { return []; }
  };
  const isInWishlist = getWishlist().some((w) => String(w.id) === String(id));
  const [saved, setSaved] = useState(isInWishlist);

  const toggleWishlist = () => {
    const current = getWishlist();
    if (saved) {
      localStorage.setItem('campustrade_wishlist', JSON.stringify(current.filter((w) => String(w.id) !== String(id))));
      setSaved(false);
      showToast('Removed from wishlist', 'neutral');
    } else {
      localStorage.setItem('campustrade_wishlist', JSON.stringify([
        ...current,
        { id: listing.id, listingId: listing.id, title: listing.title, priceFCFA: listing.priceFCFA, image: listing.images[0], category: listing.category, location: listing.location },
      ]));
      setSaved(true);
      showToast('Added to wishlist!', 'success');
    }
  };

  const conditionColor =
    listing.condition === 'Excellent Condition' || listing.condition === 'Like New'
      ? 'bg-emerald-500 text-white'
      : listing.condition === 'Good Condition'
      ? 'bg-yellow-500 text-white'
      : 'bg-gray-200 text-gray-700';

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-8">
          <button onClick={() => navigate('/home')} className="hover:text-[#ff6b1a] transition-colors">Home</button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <button onClick={() => navigate('/browse')} className="hover:text-[#ff6b1a] transition-colors">
            {listing.categoryGroup || listing.category}
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#1b1c1c]">Listing Detail</span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Left — Images */}
          <div>
            <div className="rounded-2xl overflow-hidden bg-gray-100 mb-4" style={{ height: '420px' }}>
              <img src={listing.images[activeImage]} alt={listing.title} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {listing.images.slice(0, 3).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#ff6b1a]' : 'border-transparent'}`}
                  style={{ height: '90px' }}
                >
                  <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {listing.images.length > 3 && (
                <button
                  onClick={() => setActiveImage(3)}
                  className="rounded-xl overflow-hidden border-2 border-transparent relative"
                  style={{ height: '90px' }}
                >
                  <img src={listing.images[3]} alt="More" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-black text-[14px]">+{listing.images.length - 3} More</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Right — Details */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-4 py-1.5 rounded-full text-[12px] font-black ${conditionColor}`}>
                {listing.condition}
              </span>
              <span className="text-[13px] text-gray-400">Posted {listing.postedAgo}</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={toggleWishlist}
                  className="p-2 border border-gray-200 rounded-xl hover:border-[#ff6b1a] transition-all"
                  title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ color: saved ? '#ff6b1a' : '#9ca3af', fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 border border-gray-200 rounded-xl hover:border-red-300 hover:text-red-500 transition-all text-gray-400"
                  title="Report listing"
                >
                  <span className="material-symbols-outlined text-[22px]">flag</span>
                </button>
              </div>
            </div>

            <h1 className="text-[34px] font-black text-[#1b1c1c] leading-tight mb-4">{listing.title}</h1>
            <p className="text-[30px] font-black text-[#ff6b1a] mb-6">{formatFCFA(listing.priceFCFA)}</p>

            {/* Seller Card */}
            <div
              className="bg-[#f6f3f2] rounded-2xl p-4 flex items-center justify-between mb-6 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => navigate(`/profile/${listing.seller?.id || 'u002'}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  {listing.seller?.avatar ? (
                    <img src={listing.seller.avatar} alt={listing.seller.name} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white font-black text-[15px]"
                      style={{ backgroundColor: listing.seller?.color || '#ff6b1a' }}
                    >
                      {listing.seller?.initials}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-[#1b1c1c] text-[15px]">{listing.seller?.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-yellow-400 text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-[13px] text-gray-500">{listing.seller?.rating} ({listing.seller?.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              <span className="text-[#ff6b1a] font-bold text-[13px] hover:underline">View Profile</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mb-8">
              <button
                onClick={() => setShowBuyModal(true)}
                className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                Buy Now
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/inbox')}
                  className="bg-[#ff6b1a] text-white py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  Chat with Seller
                </button>
                <button
                  onClick={() => setShowOfferModal(true)}
                  className="bg-white border-2 border-[#1b1c1c] text-[#1b1c1c] py-3.5 rounded-xl font-bold text-[15px] hover:bg-gray-50 transition-all active:scale-95"
                >
                  Make an Offer
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-[18px] font-black text-[#1b1c1c] mb-3">Description</h3>
              <p className="text-[14px] text-[#5c5f60] leading-relaxed">{listing.description}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {listing.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 bg-gray-100 text-[#1b1c1c] rounded-full text-[13px] font-semibold hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Meeting Location */}
            <div className="flex items-center gap-2 text-[14px] text-[#5c5f60]">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[20px]">location_on</span>
              <span>Meeting at: <span className="font-bold text-[#1b1c1c]">{listing.meetingAt}</span></span>
            </div>
          </div>
        </div>

        {/* Similar Items */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-black text-[#1b1c1c]">Similar to this item</h2>
            <button
              onClick={() => navigate('/browse')}
              className="text-[#ff6b1a] font-bold text-[14px] flex items-center gap-1 hover:underline"
            >
              See all
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {similarItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/listing/${item.id}`)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="relative overflow-hidden" style={{ height: '160px' }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[18px] font-black text-[#ff6b1a] mb-1">{formatFCFA(item.priceFCFA)}</p>
                  <h3 className="text-[14px] font-bold text-[#1b1c1c] mb-1 leading-snug truncate">{item.title}</h3>
                  <p className="text-[12px] text-gray-400">{item.category} · {item.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-[13px] text-gray-400">
          © 2025 CampusTrade. For ICT University students.
        </div>
      </footer>

      {/* Modals */}
      {showBuyModal && (
        <BuyNowModal listing={listing} onClose={() => setShowBuyModal(false)} />
      )}
      {showOfferModal && (
        <OfferModal listing={listing} onClose={() => setShowOfferModal(false)} />
      )}
      {showReportModal && (
        <ReportModal listing={listing} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
};

export default ListingDetail;
