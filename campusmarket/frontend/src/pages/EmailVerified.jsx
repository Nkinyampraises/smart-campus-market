import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const features = [
  { icon: 'store', label: 'Post Listings', desc: 'Sell items to campus students.' },
  { icon: 'chat', label: 'Chat & Offer', desc: 'Negotiate in real-time.' },
  { icon: 'verified', label: 'Verified Badge', desc: 'Display your trusted seller badge.' },
];

const EmailVerified = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6">
      <Link to="/home" className="text-[24px] font-black tracking-tighter text-[#ff6b1a] no-underline mb-12">
        CampusTrade
      </Link>

      <div className="bg-white rounded-2xl shadow-[0px_4px_40px_rgba(0,0,0,0.08)] p-10 w-full max-w-md text-center">
        {/* Green checkmark */}
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
          <span
            className="material-symbols-outlined text-emerald-500 text-[56px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>

        <h1 className="font-[Epilogue] text-[30px] font-bold text-[#1b1c1c] mb-2">Email Verified!</h1>
        <p className="text-[15px] text-gray-500 mb-8">
          Welcome to CampusTrade! Your account is now active and you have access to all features.
        </p>

        {/* Feature Unlock List */}
        <div className="bg-[#fcf9f8] rounded-2xl p-5 mb-8 text-left">
          <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-4">
            Features unlocked
          </p>
          <div className="flex flex-col gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">{f.icon}</span>
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#1b1c1c]">{f.label}</p>
                  <p className="text-[12px] text-gray-400">{f.desc}</p>
                </div>
                <span
                  className="ml-auto material-symbols-outlined text-emerald-500 text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="w-full bg-[#ff6b1a] text-white py-4 rounded-xl font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Enter CampusTrade
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default EmailVerified;
