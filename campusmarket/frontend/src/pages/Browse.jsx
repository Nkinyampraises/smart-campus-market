import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { api } from '../services/api';
import { formatFCFA } from '../utils/format';

const CATEGORY_IMAGES = {
  Electronics:   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop',
  Clothing:      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&h=400&fit=crop',
  Services:      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
  Accessories:   'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop',
  Cosmetics:     'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop',
  Perfumes:      'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&h=400&fit=crop',
  Bracelets:     'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=400&fit=crop',
  'Fruit Salad': 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&h=400&fit=crop',
  Juice:         'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&h=400&fit=crop',
  'Pancake/Cake':'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&h=400&fit=crop',
  Shawarma:      'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600&h=400&fit=crop',
  Shoes:         'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=400&fit=crop',
  'Liquid Soap': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&h=400&fit=crop',
  default:       'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop',
};

const CATEGORIES = [
  { name: 'Electronics',   icon: 'devices' },
  { name: 'Clothing',      icon: 'checkroom' },
  { name: 'Services',      icon: 'construction' },
  { name: 'Accessories',   icon: 'watch' },
  { name: 'Cosmetics',     icon: 'face' },
  { name: 'Perfumes',      icon: 'spa' },
  { name: 'Bracelets',     icon: 'diamond' },
  { name: 'Fruit Salad',   icon: 'restaurant' },
  { name: 'Juice',         icon: 'local_bar' },
  { name: 'Pancake/Cake',  icon: 'cake' },
  { name: 'Shawarma',      icon: 'kebab_dining' },
  { name: 'Shoes',         icon: 'hiking' },
  { name: 'Liquid Soap',   icon: 'soap' },
];

const CONDITIONS = ['All', 'New', 'Used'];
const SORT_OPTIONS = ['Newest', 'Oldest', 'Price: Low to High', 'Price: High to Low'];

const ListingGridCard = ({ listing, onClick, onWishlist, isWishlisted }) => {
  const image  = listing.images?.[0] || listing.image ||
    CATEGORY_IMAGES[listing.category] || CATEGORY_IMAGES.default;
  const price  = listing.price_fcfa || listing.priceFCFA || listing.price || 0;
  const seller = listing.seller || {};

  return (
    <div onClick={onClick} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-gray-100">
      <div className="relative overflow-hidden" style={{ height: '200px' }}>
        <img src={image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <button
          onClick={(e) => { e.stopPropagation(); onWishlist && onWishlist(listing); }}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]"
            style={{ color: isWishlisted ? '#ff6b1a' : '#9ca3af', fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0" }}>
            favorite
          </span>
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black tracking-wider uppercase" style={{ color: '#00af74' }}>
            {listing.category || listing.categoryGroup}
          </span>
          <span className="text-[20px] font-black text-[#ff6b1a]">
            {typeof price === 'number' ? formatFCFA(price) : price}
          </span>
        </div>
        <h3 className="text-[15px] font-bold text-[#1b1c1c] mb-2 leading-snug line-clamp-2">{listing.title}</h3>
        <div className="flex items-center gap-1 text-[12px] text-gray-400 mb-3">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          <span>{listing.location || listing.campus_zone}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black"
              style={{ backgroundColor: seller.color || '#ff6b1a' }}>
              {seller.initials || (listing.seller_name ? listing.seller_name[0] : 'U')}
            </div>
            <span className="text-[12px] font-medium text-[#1b1c1c]">{seller.name || listing.seller_name || 'Seller'}</span>
          </div>
          <span className="text-[11px] text-gray-400">{listing.postedAgo || listing.created_at ? new Date(listing.created_at).toLocaleDateString() : ''}</span>
        </div>
      </div>
    </div>
  );
};

const Browse = () => {
  const navigate = useNavigate();
  const [listings, setListings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setCategory] = useState('Electronics');
  const [condition, setCondition]     = useState('All');
  const [maxPrice, setMaxPrice]       = useState(500);
  const [sort, setSort]               = useState('Newest');
  const [wishlist, setWishlist]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    setLoading(true);
    const params = { category: activeCategory };
    if (condition !== 'All') params.condition = condition === 'New' ? 'Excellent Condition' : 'Used';
    api.getListings(params)
      .then((data) => {
        let sorted = Array.isArray(data) ? data : [];
        if (sort === 'Price: Low to High') sorted = [...sorted].sort((a, b) => (a.price_fcfa || 0) - (b.price_fcfa || 0));
        if (sort === 'Price: High to Low') sorted = [...sorted].sort((a, b) => (b.price_fcfa || 0) - (a.price_fcfa || 0));
        if (sort === 'Oldest') sorted = [...sorted].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setListings(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCategory, condition, sort]);

  const toggleWishlist = (listing) => {
    const exists = wishlist.some((w) => String(w.id) === String(listing.id));
    const updated = exists
      ? wishlist.filter((w) => String(w.id) !== String(listing.id))
      : [...wishlist, listing];
    setWishlist(updated);
    localStorage.setItem('campustrade_wishlist', JSON.stringify(updated));
  };

  const isWishlisted = (id) => wishlist.some((w) => String(w.id) === String(id));

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Topbar activePage="browse" />

      <div className="flex max-w-[1400px] mx-auto">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="w-[240px] flex-shrink-0 bg-white min-h-[calc(100vh-64px)] border-r border-gray-100 flex flex-col">
          <div className="p-6 flex-1">
            {/* Categories */}
            <div className="mb-8">
              <p className="text-[13px] font-black text-[#ff6b1a] uppercase tracking-widest mb-1">Categories</p>
              <p className="text-[12px] text-gray-400 mb-4">Browse Campus</p>
              <ul className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <li key={cat.name}>
                    <button
                      onClick={() => setCategory(cat.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                        activeCategory === cat.name
                          ? 'bg-[#fff5f0] text-[#ff6b1a] font-bold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#ff6b1a]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filters */}
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Filters</p>

              <div className="mb-5">
                <p className="text-[13px] font-bold text-[#1b1c1c] mb-2">Condition</p>
                <div className="flex gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                        condition === c
                          ? 'bg-[#ff6b1a] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-bold text-[#1b1c1c] mb-2">Price Range</p>
                <input
                  type="range" min="0" max="1000" value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#ff6b1a]"
                />
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>0 FCFA</span>
                  <span>{maxPrice >= 1000 ? '1000k+' : `${maxPrice}k`} FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom links */}
          <div className="border-t border-gray-100 p-4 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-gray-500 hover:bg-gray-50 transition-all">
              <span className="material-symbols-outlined text-[18px]">settings</span>
              Settings
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-gray-500 hover:bg-gray-50 transition-all">
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
              Help
            </button>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <main className="flex-1 p-8">
          {/* Header row */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-[28px] font-black text-[#1b1c1c]">{activeCategory}</h1>
              <p className="text-[14px] text-gray-400 mt-1">
                {loading ? 'Loading…' : `Showing ${listings.length} item${listings.length !== 1 ? 's' : ''} near your campus`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-gray-500">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-[13px] font-semibold focus:outline-none focus:border-[#ff6b1a] bg-white"
              >
                {SORT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-32">
              <div className="w-10 h-10 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-32 text-gray-400">
              <span className="material-symbols-outlined text-[64px] mb-4 block">search_off</span>
              <p className="text-[18px] font-bold mb-2">No listings yet in {activeCategory}</p>
              <p className="text-[14px] mb-6">Be the first to post something!</p>
              <button
                onClick={() => navigate('/create-listing')}
                className="px-6 py-3 bg-[#ff6b1a] text-white rounded-xl font-bold text-[14px] hover:bg-[#e05f15] transition-all"
              >
                Post a Listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((l) => (
                <ListingGridCard
                  key={l.id}
                  listing={l}
                  isWishlisted={isWishlisted(l.id)}
                  onWishlist={toggleWishlist}
                  onClick={() => navigate(`/listing/${l.id}`)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Browse;
