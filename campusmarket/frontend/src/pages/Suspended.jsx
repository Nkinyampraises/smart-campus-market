import React from 'react';
import { useAuth } from '../context/AuthContext';

const Suspended = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-red-500 text-[52px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          block
        </span>
      </div>
      <h1 className="font-[Epilogue] text-[30px] font-bold text-red-600 mb-2">Account Suspended</h1>
      <p className="text-[15px] text-gray-500 mb-8 max-w-md">
        Your CampusTrade account has been suspended due to a violation of our community guidelines.
      </p>

      {/* Info Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 w-full max-w-sm text-left mb-8">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Account</span>
            <span className="text-[13px] font-bold text-[#1b1c1c]">{user?.email || 'account@ictuniversity.edu.cm'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Reason</span>
            <span className="text-[13px] font-bold text-red-600">Community Guideline Violation</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Date</span>
            <span className="text-[13px] font-bold text-[#1b1c1c]">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <a
        href="mailto:support@campustrade.cm"
        className="flex items-center gap-2 bg-[#ff6b1a] text-white px-8 py-3.5 rounded-full font-bold text-[14px] hover:shadow-lg hover:shadow-orange-200 transition-all no-underline"
      >
        <span className="material-symbols-outlined text-[18px]">email</span>
        Contact Support
      </a>

      <p className="mt-4 text-[12px] text-gray-400">
        support@campustrade.cm · Response within 24–48 hours
      </p>
    </div>
  );
};

export default Suspended;
