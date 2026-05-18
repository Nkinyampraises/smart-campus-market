import React from 'react';
import { Link } from 'react-router-dom';

const Forbidden = () => (
  <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6 text-center">
    <p className="text-[120px] font-black text-gray-100 leading-none select-none">403</p>
    <span className="text-[52px] -mt-8 mb-4">🔒</span>
    <h1 className="font-[Epilogue] text-[28px] font-bold text-[#1b1c1c] mb-2">Access Denied</h1>
    <p className="text-[15px] text-gray-500 mb-8 max-w-sm">
      You don't have permission to access this page. Please log in with an authorized account.
    </p>
    <Link
      to="/login"
      className="flex items-center gap-2 px-8 py-3.5 bg-[#ff6b1a] text-white rounded-full font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all no-underline"
    >
      Log In
      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
    </Link>
  </div>
);

export default Forbidden;
