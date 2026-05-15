import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { listings, formatFCFA } from '../data/listings';
import { trendingListings } from '../data/mockData';

const allListings = [...listings, ...trendingListings.map((t) => ({
  ...t,
  id: t.id,
  images: [t.image],
  priceFCFA: t.priceFCFA,
}))];

const CATEGORIES = ['All', 'Textbooks', 'Electronics', 'Housing', 'Clothing', 'Services', 'Accessories'];

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [activeCategory, setActiveCategory] = useState('All');
  const [newOnly, setNewOnly] = useState(false);
  const [under10k, setUnder10k] = useState(false);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return allListings.filter((item) => {
      const matchQuery =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);
      const matchCategory =
        activeCategory === 'All' ||
        item.category === activeCategory ||
        item.categoryGroup === activeCategory;
      const matchNew =
        !newOnly ||
        item.condition === 'Like New' ||
        item.condition === 'New / Unopened' ||
        item.condition === 'Excellent Condition';
      const matchPrice = !under10k || (item.priceFCFA || 0) < 10000;
      return matchQuery && matchCategory && matchNew && matchPrice;
    });
  }, [query, activeCategory, newOnly, under10k]);

  const image = (item) => item.images?.[0] || item.image || '';

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Heading */}
        <div className="mb-6">
          {query ? (
            <>
              <h1 className="text-[28px] font-black text-[#1b1c1c]">
                Results for{' '}
                <span className="text-[#ff6b1a]">"{query}"</span>
              </h1>
              <p className="text-[14px] text-gray-400 mt-1">
                {results.length} listing{results.length !== 1 ? 's' : ''} found
              </p>
            </>
          ) : (
            <h1 className="text-[28px] font-black text-[#1b1c1c]">Browse All Listings</h1>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff6b1a] hover:text-[#ff6b1a]'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setNewOnly((v) => !v)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${
              newOnly
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            New Only
          </button>
          <button
            onClick={() => setUnder10k((v) => !v)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold border transition-all ${
              under10k
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
            }`}
          >
            Under 10 000 FCFA
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="flex flex-col gap-4">
            {results.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex gap-5 p-4 cursor-pointer group"
                onClick={() => navigate(`/listing/${item.id}`)}
              >
                {/* Thumbnail */}
                <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={image(item)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-black tracking-widest text-[#ff6b1a] uppercase">
                        {item.category || item.categoryGroup}
                      </span>
                      {item.condition && (
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {item.condition}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[17px] font-bold text-[#1b1c1c] mb-1 leading-snug">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[12px] text-gray-400">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      <span>{item.location}</span>
                    </div>
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="flex flex-col items-end justify-between py-1">
                  <span className="text-[20px] font-black text-[#ff6b1a]">
                    {formatFCFA(item.priceFCFA || 0)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/listing/${item.id}`); }}
                    className="text-[#ff6b1a] font-bold text-[13px] flex items-center gap-1 hover:underline"
                  >
                    View
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[64px] text-gray-200 mb-4">search_off</span>
            <h3 className="text-[22px] font-bold text-[#1b1c1c] mb-2">No results found</h3>
            <p className="text-[14px] text-gray-400 mb-8 max-w-sm">
              We couldn't find anything matching "{query}". Try different keywords or browse by category.
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="bg-[#ff6b1a] text-white px-8 py-3 rounded-full font-bold text-[14px] hover:shadow-lg transition-all"
            >
              Browse All Listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
