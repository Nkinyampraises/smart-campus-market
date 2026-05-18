import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6 text-center">
    <p className="text-[120px] font-black text-gray-100 leading-none select-none">404</p>
    <span className="text-[52px] -mt-8 mb-4">🔍</span>
    <h1 className="font-[Epilogue] text-[28px] font-bold text-[#1b1c1c] mb-2">Page Not Found</h1>
    <p className="text-[15px] text-gray-500 mb-8 max-w-sm">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <div className="flex gap-3">
      <Link
        to="/home"
        className="flex items-center gap-2 px-7 py-3 border-2 border-gray-200 text-[#1b1c1c] rounded-full font-bold text-[14px] hover:bg-gray-50 transition-all no-underline"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Go Home
      </Link>
      <Link
        to="/browse"
        className="px-7 py-3 bg-[#ff6b1a] text-white rounded-full font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all no-underline"
      >
        Browse Listings
      </Link>
    </div>
  </div>
);

export default NotFound;
