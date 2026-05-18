import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import ListingCard from '../components/ListingCard';
import { api } from '../services/api';

const CATEGORIES = ['All', 'Electronics', 'Textbooks', 'Housing', 'Clothing', 'Accessories', 'Services'];
const CONDITIONS  = ['All', 'Excellent Condition', 'Like New', 'Good Condition', 'Used'];

const Browse = () => {
  const navigate = useNavigate();
  const [listings, setListings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('All');
  const [condition, setCondition] = useState('All');
  const [minPrice, setMinPrice]   = useState('');
  const [maxPrice, setMaxPrice]   = useState('');

  const fetchListings = () => {
    setLoading(true);
    const params = {};
    if (category !== 'All') params.category = category;
    if (condition !== 'All') params.condition = condition;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    api.getListings(params).then(setListings).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, [category, condition]);

  const getWishlist = () => { try { return JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]'); } catch { return []; } };
  const isWishlisted = (id) => getWishlist().some((w) => String(w.id) === String(id));
  const toggleWishlist = (listing) => {
    const cur = getWishlist();
    const exists = cur.some((w) => String(w.id) === String(listing.id));
    localStorage.setItem('campustrade_wishlist', JSON.stringify(exists ? cur.filter((w) => String(w.id) !== String(listing.id)) : [...cur, listing]));
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="browse" />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-[28px] font-black text-[#1b1c1c] mb-6">Browse Listings</h1>
        <div className="flex flex-wrap gap-3 mb-8">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${category === c ? 'bg-[#ff6b1a] text-white border-[#ff6b1a]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#ff6b1a]'}`}>
              {c}
            </button>
          ))}
          <select value={condition} onChange={(e) => setCondition(e.target.value)}
            className="px-4 py-2 rounded-full text-[13px] font-bold border border-gray-200 bg-white focus:outline-none focus:border-[#ff6b1a]">
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Min FCFA" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            className="w-28 px-3 py-2 rounded-full text-[13px] border border-gray-200 focus:outline-none focus:border-[#ff6b1a]" />
          <input type="number" placeholder="Max FCFA" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            className="w-28 px-3 py-2 rounded-full text-[13px] border border-gray-200 focus:outline-none focus:border-[#ff6b1a]" />
          <button onClick={fetchListings} className="px-4 py-2 bg-[#1b1c1c] text-white rounded-full text-[13px] font-bold hover:bg-black transition-all">
            Apply
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">search_off</span>
            <p className="font-semibold">No listings found</p>
            <p className="text-[14px]">Try adjusting your filters or be the first to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((l) => (
              <ListingCard key={l.id}
                listing={{ ...l, priceFCFA: l.price_fcfa, location: l.campus_zone }}
                isWishlisted={isWishlisted(l.id)} onWishlist={toggleWishlist}
                onClick={() => navigate(`/listing/${l.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
