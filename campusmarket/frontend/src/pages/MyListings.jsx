import React, { useState } from 'react';

const MyListings = () => {
  const [listings, setListings] = useState([
    {
      id: 1,
      title: 'Homemade Fried Chicken Wings',
      category: 'Food',
      subcategory: 'Main Course',
      price: 5.50,
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
      price: 4.00,
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
      price: 3.50,
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
      price: 2.50,
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
      price: 8.00,
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
      price: 6.00,
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
      price: 12.00,
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
      price: 15.00,
      status: 'Active',
      views: 178,
      saves: 42,
      inquiries: 3,
      image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=300&fit=crop',
      description: 'Fast USB-C charger. Compatible with most devices. Gently used. Perfect condition.',
    },
  ]);

  const [activeTab, setActiveTab] = useState('Active');

  const categories = [
    { icon: 'restaurant', label: 'Food', value: 'food' },
    { icon: 'local_drink', label: 'Beverages', value: 'beverages' },
    { icon: 'devices', label: 'Electronics', value: 'electronics' },
    { icon: 'checkroom', label: 'Clothing', value: 'clothing' },
    { icon: 'diamond', label: 'Accessories', value: 'accessories' },
    { icon: 'handyman', label: 'Services', value: 'services' },
  ];

  const tabs = ['Active (12)', 'Reserved (2)', 'Sold (45)', 'Expired (0)', 'Drafts (3)'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Reserved':
        return 'bg-blue-100 text-blue-700';
      case 'Sold':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black tracking-tighter text-[#ff6b1a]">CampusTrade</h1>
            <div className="hidden md:flex items-center bg-[#f6f3f2] rounded-full px-4 py-2 w-96">
              <span className="material-symbols-outlined text-[#5c5f60] mr-2">search</span>
              <input className="bg-transparent border-none focus:ring-0 text-[14px] w-full" placeholder="Search marketplace..." type="text"/>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-600 font-medium hover:text-[#ff6b1a] transition-colors">Explore</a>
            <a href="#" className="text-[#ff6b1a] font-bold border-b-2 border-[#ff6b1a]">My Listings</a>
            <a href="#" className="text-gray-600 font-medium hover:text-[#ff6b1a] transition-colors">Messages</a>
            <button className="relative p-2 hover:bg-gray-50 rounded-full transition-colors">
              <span className="material-symbols-outlined text-[#5c5f60]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff6b1a] rounded-full"></span>
            </button>
            <button className="bg-[#ff6b1a] text-white px-5 py-2.5 rounded-full font-bold text-sm hover:shadow-lg transition-all">
              Sell Item
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 bg-white p-4 gap-2 sticky top-20 h-fit">
          <div className="mb-6 px-2">
            <h2 className="text-lg font-bold text-[#ff6b1a]">Categories</h2>
            <p className="text-xs text-gray-500">Browse Items</p>
          </div>
          <nav className="flex flex-col gap-1">
            {categories.map((cat) => (
              <a
                key={cat.value}
                href="#"
                className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-all text-sm"
              >
                <span className="material-symbols-outlined">{cat.icon}</span>
                <span>{cat.label}</span>
              </a>
            ))}
          </nav>
          <div className="mt-auto border-t border-gray-100 pt-4 flex flex-col gap-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-all text-sm">
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-all text-sm">
              <span className="material-symbols-outlined">help_outline</span>
              <span>Help</span>
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <span className="text-[12px] font-bold tracking-wider text-[#ff6b1a] mb-2 block uppercase">Seller Dashboard</span>
                <h1 className="text-[48px] font-bold text-[#1b1c1c]">My Listings</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white border border-[#e2bfb2] px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[#ff6b1a]">trending_up</span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Sales</p>
                    <p className="text-[16px] font-bold">$1,240.00</p>
                  </div>
                </div>
                <button className="bg-[#ff6b1a] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all active:scale-95">
                  <span className="material-symbols-outlined">add</span>
                  Post Listing
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 flex items-center gap-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.split('(')[0].trim())}
                  className={`pb-4 font-medium text-[16px] whitespace-nowrap transition-colors ${
                    activeTab === tab.split('(')[0].trim()
                      ? 'text-[#ff6b1a] border-b-2 border-[#ff6b1a] font-bold'
                      : 'text-gray-500 hover:text-[#ff6b1a]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 gap-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row gap-6 hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all group"
              >
                {/* Image */}
                <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`${getStatusColor(listing.status)} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                      {listing.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[12px] font-bold tracking-wider text-gray-400 uppercase">{listing.category} • {listing.subcategory}</span>
                      <span className="text-[24px] font-bold text-[#ff6b1a]">${listing.price.toFixed(2)}</span>
                    </div>
                    <h3 className="text-[24px] font-bold text-[#1b1c1c] mb-2">{listing.title}</h3>
                    <p className="text-[14px] text-gray-500 line-clamp-2">{listing.description}</p>
                  </div>

                  {/* Stats & Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span className="text-xs font-medium">{listing.views} views</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="material-symbols-outlined text-sm">favorite</span>
                      <span className="text-xs font-medium">{listing.saves} saves</span>
                    </div>
                    {listing.inquiries > 0 && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="material-symbols-outlined text-sm">chat_bubble</span>
                        <span className="text-xs font-medium">{listing.inquiries} inquiries</span>
                      </div>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button className="p-2 border border-gray-100 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="p-2 border border-gray-100 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                      {listing.status === 'Reserved' ? (
                        <button className="bg-[#ff6b1a] text-white px-6 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-all active:scale-95">
                          Mark as Sold
                        </button>
                      ) : (
                        <button className="bg-[#ff6b1a]/10 text-[#ff6b1a] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#ff6b1a] hover:text-white transition-all">
                          Promote
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[10px] font-bold">Explore</span>
        </button>
        <button className="bg-[#ff6b1a] text-white p-3 rounded-full -mt-10 shadow-lg shadow-orange-200">
          <span className="material-symbols-outlined">add</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#ff6b1a]">
          <span className="material-symbols-outlined">list_alt</span>
          <span className="text-[10px] font-bold">Listings</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default MyListings;
