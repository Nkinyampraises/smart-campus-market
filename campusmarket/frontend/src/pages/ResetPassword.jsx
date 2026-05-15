import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const getStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];

const ResetPassword = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const strength = getStrength(form.password);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (form.password !== form.confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Password updated successfully!', 'success');
      setTimeout(() => navigate('/login'), 1000);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6">
      <Link to="/home" className="text-[24px] font-black tracking-tighter text-[#ff6b1a] no-underline mb-12">
        CampusTrade
      </Link>

      <div className="bg-white rounded-2xl shadow-[0px_4px_40px_rgba(0,0,0,0.08)] p-10 w-full max-w-md">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[#ff6b1a] text-[32px]">lock</span>
        </div>
        <h1 className="font-[Epilogue] text-[26px] font-bold text-[#1b1c1c] mb-2">Reset Password</h1>
        <p className="text-[15px] text-gray-500 mb-8">
          Create a new strong password for your CampusTrade account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-[#e2bfb2] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPwd ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {/* Strength bar */}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i <= strength ? strengthColor[strength] : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-bold" style={{ color: ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength] }}>
                  {strengthLabel[strength]}
                </p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat password"
              className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${
                form.confirm && form.confirm !== form.password ? 'border-red-400' : 'border-[#e2bfb2]'
              }`}
            />
            {form.confirm && form.confirm !== form.password && (
              <p className="text-red-500 text-[11px] mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff6b1a] text-white py-3.5 rounded-xl font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? 'Updating…' : 'Update Password'}
            {!loading && <span className="material-symbols-outlined text-[18px]">check</span>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-[14px] text-[#ff6b1a] font-bold hover:underline no-underline flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
