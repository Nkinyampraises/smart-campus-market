import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { mockUsers } from '../data/mockData';
import { listings } from '../data/listings';
import { formatFCFA } from '../data/listings';

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Listings');

  const user = mockUsers.find((u) => u.id === userId) || {
    id: userId,
    name: 'Campus Student',
    campusZone: 'Main Campus',
    email: 'student@ictuniversity.edu.cm',
    listings: 5,
    soldItems: 20,
    rating: 4.5,
    reviews: [],
    initials: 'CS',
    color: '#5c5f60',
    isVerified: true,
    memberSince: '2023',
  };

  const userListings = listings.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Topbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Banner */}
        <div
          className="relative rounded-3xl overflow-hidden mb-16"
          style={{ height: '175px', background: `linear-gradient(135deg, ${user.color} 0%, #333 100%)` }}
        >
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="absolute -bottom-12 left-8">
            <div
              className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center text-white text-[28px] font-black"
              style={{ backgroundColor: user.color }}
            >
              {user.initials}
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="ml-36 mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-black text-[#1b1c1c]">{user.name}</h1>
              {user.isVerified && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                  Verified
                </span>
              )}
            </div>
            <p className="text-[14px] text-gray-500">{user.campusZone} · Member since {user.memberSince}</p>
          </div>
          <button
            onClick={() => navigate('/inbox')}
            className="flex items-center gap-2 bg-[#ff6b1a] text-white px-6 py-3 rounded-full font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Message
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Listings', value: user.listings, icon: 'store' },
            { label: 'Sold', value: user.soldItems, icon: 'sell' },
            { label: 'Rating', value: `${user.rating} ★`, icon: 'star' },
            { label: 'Response Rate', value: '98%', icon: 'speed' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[22px] mb-2 block">{s.icon}</span>
              <p className="text-[24px] font-black text-[#1b1c1c]">{s.value}</p>
              <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 flex gap-3">
            {['Listings', 'Reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-full font-bold text-[13px] transition-all ${
                  activeTab === tab
                    ? 'bg-[#ff6b1a] text-white shadow-md shadow-orange-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-[#ff6b1a]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Listings' && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userListings.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/listing/${item.id}`)}
                  className="bg-[#fcf9f8] rounded-xl border border-gray-100 overflow-hidden flex gap-4 p-4 cursor-pointer hover:shadow-md transition-all group"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-[#ff6b1a] uppercase tracking-wider">{item.category}</p>
                    <h3 className="font-bold text-[14px] text-[#1b1c1c] leading-snug mb-1">{item.title}</h3>
                    <p className="text-[16px] font-black text-[#ff6b1a]">{formatFCFA(item.priceFCFA)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Reviews' && (
            <div className="p-6">
              {user.reviews && user.reviews.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {user.reviews.map((r, i) => (
                    <div key={i} className="bg-[#fcf9f8] rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-[#ff6b1a] text-white flex items-center justify-center font-black text-[11px]">
                          {r.reviewer.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-[14px] text-[#1b1c1c]">{r.reviewer}</p>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, j) => (
                              <span key={j} className="material-symbols-outlined text-yellow-400 text-[14px]" style={{ fontVariationSettings: j < r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-[12px] text-gray-400">{r.date}</span>
                      </div>
                      <p className="text-[14px] text-gray-600">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <span className="material-symbols-outlined text-[48px] mb-3 block">star_border</span>
                  <p className="font-semibold">No reviews yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
