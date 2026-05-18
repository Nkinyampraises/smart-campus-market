import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import ListingCard from '../components/ListingCard';
import { api } from '../services/api';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    api.search({ q: query }).then((data) => setResults(data.results || data)).catch(console.error).finally(() => setLoading(false));
  }, [query]);

  const getWishlist = () => { try { return JSON.parse(localStorage.getItem('campustrade_wishlist') || '[]'); } catch { return []; } };
  const isWishlisted = (id) => getWishlist().some((w) => String(w.id) === String(id));
  const toggleWishlist = (listing) => {
    const cur = getWishlist();
    const exists = cur.some((w) => String(w.id) === String(listing.id));
    localStorage.setItem('campustrade_wishlist', JSON.stringify(exists ? cur.filter((w) => String(w.id) !== String(listing.id)) : [...cur, listing]));
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-[24px] font-black text-[#1b1c1c] mb-2">{query ? `Results for "${query}"` : 'Search listings'}</h1>
        {!loading && results.length > 0 && <p className="text-[14px] text-gray-400 mb-8">{results.length} listing{results.length !== 1 ? 's' : ''} found</p>}
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff6b1a] border-t-transparent rounded-full animate-spin" /></div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-[48px] mb-3 block">search_off</span>
            <p className="font-semibold">No results for "{query}"</p>
            <button onClick={() => navigate('/browse')} className="mt-4 px-6 py-2.5 bg-[#ff6b1a] text-white rounded-full font-bold text-[14px]">Browse All</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {results.map((l) => (
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

export default Search;
