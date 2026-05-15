import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AuthNavbar = ({ page }) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-100 shadow-[0px_2px_12px_rgba(0,0,0,0.04)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/home"
          className="text-[22px] font-black tracking-tighter text-[#ff6b1a] no-underline flex-shrink-0"
        >
          CampusTrade
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/home"
            className="px-3 py-2 rounded-lg font-semibold text-[14px] no-underline text-gray-600 hover:text-[#ff6b1a] hover:bg-orange-50 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/browse"
            className="px-3 py-2 rounded-lg font-semibold text-[14px] no-underline text-gray-600 hover:text-[#ff6b1a] hover:bg-orange-50 transition-colors"
          >
            Browse
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {page === 'login' ? (
            <>
              <span className="hidden sm:block text-[14px] text-gray-500">
                Don't have an account?
              </span>
              <button
                onClick={() => navigate('/register')}
                className="bg-[#ff6b1a] text-white px-5 py-2.5 rounded-full font-bold text-[13px] hover:shadow-md hover:shadow-orange-200 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Sign Up Free
              </button>
            </>
          ) : (
            <>
              <span className="hidden sm:block text-[14px] text-gray-500">
                Already have an account?
              </span>
              <button
                onClick={() => navigate('/login')}
                className="border-2 border-[#ff6b1a] text-[#ff6b1a] px-5 py-2 rounded-full font-bold text-[13px] hover:bg-orange-50 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AuthNavbar;
