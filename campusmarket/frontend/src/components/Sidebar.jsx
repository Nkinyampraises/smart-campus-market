import React from 'react';
import { Link } from 'react-router-dom';

const categories = [
  { icon: 'menu_book', label: 'Textbooks', value: 'Textbooks' },
  { icon: 'devices', label: 'Electronics', value: 'Electronics' },
  { icon: 'home', label: 'Housing', value: 'Housing' },
  { icon: 'checkroom', label: 'Clothing', value: 'Clothing' },
  { icon: 'handyman', label: 'Services', value: 'Services' },
  { icon: 'diamond', label: 'Accessories', value: 'Accessories' },
];

const Sidebar = ({ activeCategory, onCategoryChange }) => {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 bg-white p-4 gap-2 sticky top-[61px] h-[calc(100vh-61px)] overflow-y-auto flex-shrink-0">
      <div className="mb-4 px-2">
        <h2 className="text-[15px] font-bold text-[#ff6b1a]">Categories</h2>
        <p className="text-[11px] text-gray-400">Browse Campus</p>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        <button
          onClick={() => onCategoryChange && onCategoryChange('All')}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[13px] text-left w-full ${
            activeCategory === 'All' || !activeCategory
              ? 'bg-orange-50 text-[#ff6b1a] font-bold'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ color: !activeCategory || activeCategory === 'All' ? '#ff6b1a' : undefined }}
          >
            grid_view
          </span>
          <span>All Items</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange && onCategoryChange(cat.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[13px] text-left w-full ${
              activeCategory === cat.value
                ? 'bg-orange-50 text-[#ff6b1a] font-bold'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ color: activeCategory === cat.value ? '#ff6b1a' : undefined }}
            >
              {cat.icon}
            </span>
            <span>{cat.label}</span>
          </button>
        ))}
      </nav>
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-1">
        <Link
          to="/my-listings"
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-all text-[13px] no-underline"
        >
          <span className="material-symbols-outlined text-[20px]">list_alt</span>
          <span>My Listings</span>
        </Link>
        <Link
          to="/wishlist"
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg transition-all text-[13px] no-underline"
        >
          <span className="material-symbols-outlined text-[20px]">favorite</span>
          <span>Wishlist</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
