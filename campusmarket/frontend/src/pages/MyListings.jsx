import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { formatFCFA } from '../data/listings';

const hardcodedListings = [
  {
    id: 1,
    title: 'Homemade Fried Chicken Wings',
    category: 'Food',
    subcategory: 'Main Course',
    priceFCFA: 3500,
    price: 3500,
    status: 'Active',
    views: 142,
    saves: 12,
    inquiries: 3,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cda1ec?w=400&h=300&fit=crop',
    description: 'Crispy golden fried chicken wings. Made fresh daily. Perfect for lunch on campus.',
  },
  {
    id: 2,
    title: 'Fresh Fruit Salad - Mixed Berries',
    category: 'Food',
    subcategory: 'Fruit',
    priceFCFA: 2500,
    price: 2500,
    status: 'Active',
    views: 87,
    saves: 18,
    inquiries: 2,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    description: 'Fresh mixed berries fruit salad. Healthy and delicious. Available daily.',
  },
  {
    id: 3,
    title: 'Greek Yogurt with Honey',
    category: 'Food',
    subcategory: 'Dairy',
    priceFCFA: 2200,
    price: 2200,
    status: 'Active',
    views: 156,
    saves: 28,
    inquiries: 5,
    image: 'https://images.unsplash.com/photo-1488477181946-85a4c60d4fe6?w=400&h=300&fit=crop',
    description: 'Creamy Greek yogurt with organic honey. Rich protein content. Great for breakfast.',
  },
  {
    id: 4,
    title: 'Fresh Orange Juice - 1L',
    category: 'Beverages',
    subcategory: 'Juice',
    priceFCFA: 1500,
    price: 1500,
    status: 'Reserved',
    views: 203,
    saves: 45,
    inquiries: 8,
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
    description: 'Fresh squeezed orange juice. No additives. Reserved until Friday.',
  },
  {
    id: 5,
    title: 'Beaded Bracelets Set',
    category: 'Accessories',
    subcategory: 'Jewelry',
    priceFCFA: 5000,
    price: 5000,
    status: 'Active',
    views: 92,
    saves: 34,
    inquiries: 0,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=300&fit=crop',
    description: 'Handmade beaded bracelets. Colorful designs. Perfect for summer campus looks.',
  },
  {
    id: 6,
    title: 'Organic Strawberry Pastry',
    category: 'Food',
    subcategory: 'Bakery',
    priceFCFA: 3800,
    price: 3800,
    status: 'Active',
    views: 65,
    saves: 22,
    inquiries: 1,
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
    description: 'Fresh strawberry pastry. Baked daily. Best enjoyed fresh. Great for dessert.',
  },
  {
    id: 7,
    title: 'Lipgloss Collection - 5 Colors',
    category: 'Accessories',
    subcategory: 'Beauty',
    priceFCFA: 7500,
    price: 7500,
    status: 'Active',
    views: 234,
    saves: 56,
    inquiries: 7,
    image: 'https://images.unsplash.com/photo-1631857786934-5e81c228d1b7?w=400&h=300&fit=crop',
    description: 'Premium lipgloss collection. 5 trendy colors. Long-lasting formula.',
  },
  {
    id: 8,
    title: 'USB-C Phone Charger - Fast',
    category: 'Electronics',
    subcategory: 'Charging',
    priceFCFA: 9500,
    price: 9500,
    status: 'Active',
    views: 178,
    saves: 42,
    inquiries: 3,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=300&fit=crop',
    description: 'Fast USB-C charger. Compatible with most devices. Gently used. Perfect condition.',
  },
];

const TAB_FILTERS = ['Active', 'Reserved', 'Sold', 'Expired', 'Drafts'];

const getStatusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Reserved': return 'bg-blue-100 text-blue-700';
    case 'Sold': return 'bg-gray-100 text-gray-600';
    case 'Expired': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const MyListings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Active');
  const [listings, setListings] = useState(() => {
    const stored = JSON.parse(localStorage.getItem('campustrade_listings') || '[]');
    const storedIds = new Set(stored.map((l) => String(l.id)));
    const base = hardcodedListings.filter((l) => !storedIds.has(String(l.id)));
    return [...stored, ...base];
  });

  const filtered = listings.filter((l) => {
    const s = l.status || 'Active';
    if (activeTab === 'Active') return s === 'Active';
    if (activeTab === 'Reserved') return s === 'Reserved';
    if (activeTab === 'Sold') return s === 'Sold';
    if (activeTab === 'Expired') return s === 'Expired';
    if (activeTab === 'Drafts') return s === 'Draft';
    return true;
  });

  const counts = {
    Active: listings.filter((l) => (l.status || 'Active') === 'Active').length,
    Reserved: listings.filter((l) => l.status === 'Reserved').length,
    Sold: listings.filter((l) => l.status === 'Sold').length,
    Expired: listings.filter((l) => l.status === 'Expired').length,
    Drafts: listings.filter((l) => l.status === 'Draft').length,
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="my-listings" />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <span className="text-[11px] font-black tracking-wider text-[#ff6b1a] mb-2 block uppercase">Seller Dashboard</span>
            <h1 className="text-[40px] font-black text-[#1b1c1c]">My Listings</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-[#e2bfb2] px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[#ff6b1a]">trending_up</span>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Sales</p>
                <p className="text-[16px] font-bold">1,240,000 FCFA</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/create-listing')}
              className="bg-[#ff6b1a] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              Post Listing
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 flex items-center gap-6 overflow-x-auto mb-8">
          {TAB_FILTERS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 font-medium text-[15px] whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-[#ff6b1a] border-b-2 border-[#ff6b1a] font-bold'
                  : 'text-gray-500 hover:text-[#ff6b1a]'
              }`}
            >
              {tab}
              <span className="ml-1.5 text-[12px] opacity-60">({counts[tab] || 0})</span>
            </button>
          ))}
        </div>

        {/* Listings */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {filtered.map((listing) => (
              <div
                key={listing.id}
                className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row gap-5 hover:shadow-[0px_4px_20px_rgba(0,0,0,0.06)] transition-all group"
              >
                {/* Image */}
                <div className="w-full md:w-44 h-44 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img
                    src={listing.image || listing.images?.[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`${getStatusColor(listing.status || 'Active')} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                      {listing.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                        {listing.category} {listing.subcategory ? `· ${listing.subcategory}` : ''}
                      </span>
                      <span className="text-[22px] font-black text-[#ff6b1a]">
                        {formatFCFA(listing.priceFCFA || listing.price || 0)}
                      </span>
                    </div>
                    <h3 className="text-[22px] font-bold text-[#1b1c1c] mb-2">{listing.title}</h3>
                    <p className="text-[13px] text-gray-500 line-clamp-2">{listing.description}</p>
                  </div>

                  {/* Stats & Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span className="text-[12px] font-medium">{listing.views || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="material-symbols-outlined text-[16px]">favorite</span>
                      <span className="text-[12px] font-medium">{listing.saves || 0} saves</span>
                    </div>
                    {(listing.inquiries || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        <span className="text-[12px] font-medium">{listing.inquiries} messages</span>
                      </div>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => navigate(`/edit-listing/${listing.id}`)}
                        className="p-2 border border-gray-100 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-[#ff6b1a] transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      {listing.status === 'Reserved' ? (
                        <button
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          className="bg-[#ff6b1a] text-white px-6 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all active:scale-95"
                        >
                          Mark as Sold
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          className="bg-[#ff6b1a]/10 text-[#ff6b1a] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#ff6b1a] hover:text-white transition-all"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[60px] text-gray-200 mb-4">inventory_2</span>
            <h3 className="text-[20px] font-bold text-[#1b1c1c] mb-2">No {activeTab.toLowerCase()} listings</h3>
            <p className="text-[14px] text-gray-400 mb-6">
              {activeTab === 'Active' ? 'Post your first listing and start selling!' : `You have no ${activeTab.toLowerCase()} listings.`}
            </p>
            {activeTab === 'Active' && (
              <button
                onClick={() => navigate('/create-listing')}
                className="bg-[#ff6b1a] text-white px-8 py-3 rounded-full font-bold text-[14px] hover:shadow-lg transition-all"
              >
                Post a Listing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;
