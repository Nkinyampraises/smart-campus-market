import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listings, formatFCFA } from '../data/listings';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { useToast } from '../context/ToastContext';

const conditionColors = {
  'Excellent Condition': 'bg-emerald-100 text-emerald-700',
  'Like New': 'bg-blue-100 text-blue-700',
  'Good Condition': 'bg-yellow-100 text-yellow-700',
  Used: 'bg-gray-100 text-gray-600',
};

const Browse = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'All';

  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [priceRange, setPriceRange] = useState(100);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const getWishlist = () => {
    try { return JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]'); } catch { return []; }
  };

  const [savedItems, setSavedItems] = useState(() => getWishlist().map((i) => i.id));

  const toggleSave = (e, item) => {
    e.stopPropagation();
    const current = getWishlist();
    const isIn = current.some((w) => String(w.id) === String(item.id));
    let updated;
    if (isIn) {
      updated = current.filter((w) => String(w.id) !== String(item.id));
      showToast('Removed from wishlist', 'neutral');
    } else {
      updated = [...current, { id: item.id, listingId: item.id, title: item.title, priceFCFA: item.priceFCFA, image: item.images[0], category: item.category, location: item.location }];
      showToast('Added to wishlist!', 'success');
    }
    localStorage.setItem('campustrade_wishlist', JSON.stringify(updated));
    setSavedItems(updated.map((w) => w.id));
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    if (cat !== 'All') {
      setSearchParams({ category: cat });
    } else {
      setSearchParams({});
    }
    setCurrentPage(1);
  };

  const filtered = listings.filter((item) => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory || item.categoryGroup === activeCategory;
    const maxPrice = priceRange === 100 ? Infinity : priceRange * 3000;
    const matchPrice = item.priceFCFA <= maxPrice;
    return matchCat && matchPrice;
  });

  const categoryLabel = activeCategory === 'All' ? 'All Listings' : activeCategory;

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="browse" />

      <div className="max-w-7xl mx-auto flex">
        <Sidebar activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          {/* Page Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[30px] font-black text-[#1b1c1c] leading-tight">{categoryLabel}</h1>
              <p className="text-[14px] text-[#5c5f60] mt-1">
                Showing {filtered.length} items near your campus
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Price filter */}
              <div className="hidden md:block w-48">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #ff6b1a ${priceRange}%, #e5e7eb ${priceRange}%)` }}
                />
                <p className="text-[11px] text-gray-400 mt-1 text-right">
                  {priceRange === 100 ? 'No limit' : `Max: ${(priceRange * 3000).toLocaleString('fr-FR')} FCFA`}
                </p>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-[13px] font-semibold text-[#1b1c1c] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_low">Price: Low–High</option>
                  <option value="price_high">Price: High–Low</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-500 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/listing/${item.id}`)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0px_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.10)] transition-all cursor-pointer group"
              >
                {/* Image */}
                <div className="relative overflow-hidden" style={{ height: '200px' }}>
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <button
                    onClick={(e) => toggleSave(e, item)}
                    className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={{
                        color: savedItems.includes(item.id) ? '#ff6b1a' : '#9ca3af',
                        fontVariationSettings: savedItems.includes(item.id) ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      favorite
                    </span>
                  </button>
                  <span className="absolute top-3 left-3 bg-white/90 text-[#1b1c1c] text-[10px] font-black px-2.5 py-1 rounded-full">
                    {item.condition}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black tracking-widest text-[#ff6b1a] uppercase">
                      {item.category}
                    </span>
                    <span className="text-[20px] font-black text-[#ff6b1a]">
                      {formatFCFA(item.priceFCFA)}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1b1c1c] mb-1.5 leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[13px] text-gray-400 mb-4">
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                    <span>{item.location}</span>
                  </div>

                  {/* Seller Row */}
                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                        style={{ backgroundColor: item.seller.color }}
                      >
                        {item.seller.initials}
                      </div>
                      <span className="text-[13px] font-medium text-[#1b1c1c]">{item.seller.name}</span>
                    </div>
                    <span className="text-[12px] text-gray-400">{item.postedAgo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-[52px] mb-3 block">search_off</span>
              <p className="font-bold text-[16px]">No listings in this category</p>
              <button onClick={() => handleCategoryChange('All')} className="mt-4 text-[#ff6b1a] font-bold hover:underline">
                Show all listings
              </button>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-full font-bold text-[15px] transition-all ${
                  currentPage === page ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Browse;
