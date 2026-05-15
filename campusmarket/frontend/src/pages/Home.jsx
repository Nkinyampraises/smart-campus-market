import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { trendingListings } from '../data/mockData';
import { formatFCFA } from '../data/listings';
import { useAuth } from '../context/AuthContext';

const heroStats = [
  { label: 'Active Listings', value: '15k+' },
  { label: 'Campuses Connected', value: '50+' },
  { label: 'Average Sell Time', value: '24h' },
  { label: 'Verified Users', value: '99%' },
];

const recentListings = [
  {
    id: 'r1',
    title: 'TI-84 Plus CE Graphing',
    category: 'Electronics',
    priceFCFA: 35000,
    location: 'Engineering Block',
    postedAgo: '2 min ago',
    images: ['https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop'],
  },
  {
    id: 'r2',
    title: '27" 4K LG Monitor',
    category: 'Electronics',
    priceFCFA: 95000,
    location: 'Student Union',
    postedAgo: '15 min ago',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=400&fit=crop'],
  },
  {
    id: 'r3',
    title: 'Fujifilm X-T30 II + 35mm',
    category: 'Electronics',
    priceFCFA: 285000,
    location: 'Arts Block',
    postedAgo: '42 min ago',
    images: ['https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=600&h=400&fit=crop'],
  },
  {
    id: 'r4',
    title: 'Bose QuietComfort 35',
    category: 'Electronics',
    priceFCFA: 55000,
    location: 'Science Block',
    postedAgo: '1 hour ago',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop'],
  },
];

const HomeCard = ({ listing, onClick, showTime = false }) => {
  const image = listing.images?.[0] || listing.image || '';
  const price = listing.priceFCFA || listing.price || 0;

  return (
    <div
      onClick={() => onClick && onClick(listing)}
      className="bg-white rounded-2xl overflow-hidden shadow-[0px_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0px_8px_28px_rgba(0,0,0,0.10)] transition-all cursor-pointer group border border-gray-100"
    >
      <div className="relative overflow-hidden h-[180px]">
        <img
          src={image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 left-3 bg-white text-[#1b1c1c] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
          {listing.category}
        </span>
        {showTime && listing.postedAgo && (
          <span className="absolute bottom-3 left-3 bg-[#1b1c1c]/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            {listing.postedAgo}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-[14px] font-bold text-[#1b1c1c] mb-2 line-clamp-2 leading-snug">
          {listing.title}
        </h3>
        <p className="text-[17px] font-black text-[#00af74] mb-2">
          {typeof price === 'number' ? formatFCFA(price) : price}
        </p>
        <div className="flex items-center gap-1 text-[12px] text-gray-400">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          <span>{listing.location}</span>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Textbooks', 'Tech'];

  const filteredRecent =
    activeTab === 'All'
      ? recentListings
      : activeTab === 'Textbooks'
      ? recentListings.filter((l) => l.category === 'Textbooks')
      : recentListings.filter((l) => l.category === 'Electronics');

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar activePage="home" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16 mb-4">
          <div>
            <span className="inline-flex items-center text-[11px] font-black tracking-widest text-[#ff6b1a] uppercase border border-[#ff6b1a]/30 bg-[#fff5f0] px-4 py-1.5 rounded-full mb-6">
              Exclusively for students
            </span>
            <h1 className="font-[Epilogue] text-[44px] md:text-[52px] font-black leading-[1.1] text-[#1b1c1c] mb-5">
              Upgrade your{' '}
              <span className="text-[#ff6b1a]">campus</span>
              <br />
              <span className="text-[#ff6b1a]">life</span> with premium gear
            </h1>
            <p className="text-[16px] text-gray-500 leading-relaxed mb-8 max-w-lg">
              The trusted marketplace for university students to buy, sell, and trade textbooks, electronics, and dorm essentials within their local campus community.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/browse')}
                className="bg-[#ff6b1a] text-white px-7 py-3.5 rounded-lg font-bold text-[15px] hover:bg-[#e05f15] transition-all active:scale-95 shadow-sm"
              >
                Start Shopping
              </button>
              <button
                onClick={() => navigate('/browse')}
                className="border border-gray-300 text-[#1b1c1c] px-7 py-3.5 rounded-lg font-bold text-[15px] hover:bg-gray-50 transition-all"
              >
                View Categories
              </button>
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=620&h=460&fit=crop&q=80"
                alt="Students on campus"
                className="rounded-3xl shadow-2xl w-full max-w-[520px] object-cover"
                style={{ height: '420px' }}
              />
              <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border border-gray-100">
                <div className="w-10 h-10 bg-[#fff5f0] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#ff6b1a] text-[22px]">trending_up</span>
                </div>
                <div>
                  <p className="font-black text-[16px] text-[#1b1c1c]">840+ listings</p>
                  <p className="text-[11px] text-gray-400 font-semibold">Live on campus today</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-gray-100 py-10 mb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-gray-100">
            {heroStats.map((s) => (
              <div key={s.label} className="text-center px-4 first:pl-0">
                <p className="text-[34px] font-black text-[#ff6b1a] leading-none mb-1">{s.value}</p>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Now */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[24px] font-black text-[#1b1c1c]">Trending Now</h2>
            <Link
              to="/browse"
              className="text-[#ff6b1a] font-bold text-[14px] flex items-center gap-1 hover:underline no-underline"
            >
              View All
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          <p className="text-[14px] text-gray-400 mb-6">The most viewed items on campus this week</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingListings.map((listing) => (
              <HomeCard
                key={listing.id}
                listing={listing}
                onClick={() => navigate(`/listing/${listing.id}`)}
              />
            ))}
          </div>
        </section>

        {/* Recently Listed */}
        <section className="mb-16">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-[24px] font-black text-[#1b1c1c]">Recently Listed</h2>
              <p className="text-[14px] text-gray-400 mt-0.5">Freshly posted items from your classmates</p>
            </div>
            <div className="flex gap-2 mt-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                    activeTab === tab
                      ? 'bg-[#ff6b1a] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff6b1a] hover:text-[#ff6b1a]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredRecent.length > 0 ? (
              filteredRecent.map((listing) => (
                <HomeCard
                  key={listing.id}
                  listing={listing}
                  showTime
                  onClick={() => navigate(`/listing/${listing.id}`)}
                />
              ))
            ) : (
              <p className="text-gray-400 text-[14px] col-span-4 py-10 text-center">
                No listings in this category yet.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[#f0eded] border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <p className="text-[22px] font-black tracking-tighter text-[#ff6b1a] mb-3">CampusTrade</p>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-5">
                Empowering students through safe and sustainable campus commerce. Join the movement to trade smarter.
              </p>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-[#ff6b1a] hover:text-[#ff6b1a] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">language</span>
                </button>
                <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-[#ff6b1a] hover:text-[#ff6b1a] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">share</span>
                </button>
              </div>
            </div>

            {/* Marketplace */}
            <div>
              <p className="text-[12px] font-black text-[#1b1c1c] uppercase tracking-widest mb-4">Marketplace</p>
              <ul className="space-y-2.5">
                {['Textbooks', 'Electronics', 'Housing', 'Clothing'].map((item) => (
                  <li key={item}>
                    <Link
                      to="/browse"
                      className="text-[14px] text-gray-500 hover:text-[#ff6b1a] no-underline transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-[12px] font-black text-[#1b1c1c] uppercase tracking-widest mb-4">Resources</p>
              <ul className="space-y-2.5">
                {['Safety Guide', 'Price Estimator', 'Help Center', 'Community Rules'].map((item) => (
                  <li key={item}>
                    <span className="text-[14px] text-gray-500 hover:text-[#ff6b1a] cursor-pointer transition-colors">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get the App */}
            <div>
              <p className="text-[12px] font-black text-[#1b1c1c] uppercase tracking-widest mb-4">Get the App</p>
              <p className="text-[14px] text-gray-500 mb-4">Trade faster on the go with our mobile app.</p>
              <button className="bg-[#1b1c1c] text-white px-4 py-3 rounded-xl font-bold flex items-center gap-3 hover:bg-gray-800 transition-colors">
                <span className="material-symbols-outlined text-[22px]">phone_iphone</span>
                <div className="text-left">
                  <p className="text-[10px] font-medium opacity-70 leading-none">Download on the</p>
                  <p className="text-[14px] font-bold leading-tight">App Store</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[13px] text-gray-400">© 2024 CampusTrade. All university rights reserved.</p>
            <div className="flex gap-5">
              {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map((item) => (
                <span
                  key={item}
                  className="text-[13px] text-gray-400 hover:text-[#ff6b1a] cursor-pointer transition-colors"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
