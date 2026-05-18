import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const INITIAL_SECONDS = 24 * 60 * 60; // 24 hours

const pad = (n) => String(n).padStart(2, '0');

const VerifyEmail = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(INITIAL_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const handleResend = () => {
    setResendLoading(true);
    setTimeout(() => {
      setResendLoading(false);
      setSeconds(INITIAL_SECONDS);
      showToast('Verification email resent!', 'success');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6">
      <Link to="/home" className="text-[24px] font-black tracking-tighter text-[#ff6b1a] no-underline mb-12">
        CampusTrade
      </Link>

      <div className="bg-white rounded-2xl shadow-[0px_4px_40px_rgba(0,0,0,0.08)] p-10 w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-blue-500 text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            mark_email_unread
          </span>
        </div>

        <h1 className="font-[Epilogue] text-[26px] font-bold text-[#1b1c1c] mb-2">Check your inbox</h1>
        <p className="text-[15px] text-gray-500 mb-8">
          We've sent a verification link to your university email. Click the link to activate your account.
        </p>

        {/* Countdown */}
        <div className="bg-[#fcf9f8] rounded-2xl p-6 mb-6">
          <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-3">
            Link expires in
          </p>
          <div className="flex items-center justify-center gap-2">
            {[pad(h), pad(m), pad(s)].map((unit, i) => (
              <React.Fragment key={i}>
                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                  <p className="text-[28px] font-black text-[#1b1c1c] tabular-nums">{unit}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {['HRS', 'MIN', 'SEC'][i]}
                  </p>
                </div>
                {i < 2 && <span className="text-[24px] font-black text-gray-400 pb-4">:</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href="https://gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#ff6b1a] text-white py-3.5 rounded-xl font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 no-underline"
          >
            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
            Open Gmail
          </a>
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full py-3.5 border-2 border-[#ff6b1a] text-[#ff6b1a] rounded-xl font-bold text-[15px] hover:bg-orange-50 transition-all disabled:opacity-60"
          >
            {resendLoading ? 'Resending…' : 'Resend Email'}
          </button>
        </div>

        <p className="mt-6 text-[13px] text-gray-500">
          Wrong email?{' '}
          <Link to="/register" className="text-[#ff6b1a] font-bold hover:underline no-underline">
            Change it here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
