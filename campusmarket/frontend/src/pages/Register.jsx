import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthNavbar from '../components/AuthNavbar';

const zones = [
  'Engineering Block',
  'Science Block',
  'Arts Block',
  'Main Dorms',
  'Student Union',
  'Medical Block',
];

const getPasswordStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    campusZone: '',
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const strength = getPasswordStrength(form.password);

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.email.includes('@')) errs.email = 'Enter a valid email';
    if (form.password.length < 8) errs.password = 'Minimum 8 characters';
    if (!form.campusZone) errs.campusZone = 'Select your campus zone';
    if (!form.terms) errs.terms = 'You must accept the terms';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) {
      showToast('Account created! Please verify your email.', 'success');
      navigate('/verify-email');
    } else {
      showToast('Registration failed. Try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col">
      <AuthNavbar page="register" />
      <div className="flex-grow flex items-center justify-center p-6">
      <div className="w-full max-w-[1200px] bg-white rounded-2xl shadow-[0px_4px_40px_rgba(0,0,0,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[680px]">
        {/* Left: Form */}
        <div className="p-8 md:p-14 flex flex-col justify-center">
          <Link to="/home" className="text-[22px] font-black tracking-tighter text-[#ff6b1a] no-underline mb-10 block">
            CampusTrade
          </Link>
          <h1 className="font-[Epilogue] text-[28px] font-bold text-[#1b1c1c] mb-1">Create your account</h1>
          <p className="text-[15px] text-gray-500 mb-8">
            Join 1,800+ students buying and selling on campus.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  placeholder="Alex"
                  className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${errors.firstName ? 'border-red-400' : 'border-[#e2bfb2]'}`}
                />
                {errors.firstName && <p className="text-red-500 text-[11px] mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  placeholder="Henderson"
                  className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${errors.lastName ? 'border-red-400' : 'border-[#e2bfb2]'}`}
                />
                {errors.lastName && <p className="text-red-500 text-[11px] mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-1.5">
                University Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="you@ictuniversity.edu.cm"
                className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${errors.email ? 'border-red-400' : 'border-[#e2bfb2]'}`}
              />
              {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${errors.password ? 'border-red-400' : 'border-[#e2bfb2]'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
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
              {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password}</p>}
            </div>

            {/* Campus Zone */}
            <div>
              <label className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-1.5">
                Campus Zone
              </label>
              <div className="relative">
                <select
                  value={form.campusZone}
                  onChange={(e) => set('campusZone', e.target.value)}
                  className={`w-full appearance-none px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] bg-white pr-10 transition-all ${errors.campusZone ? 'border-red-400' : 'border-[#e2bfb2]'}`}
                >
                  <option value="">Select your zone…</option>
                  {zones.map((z) => <option key={z}>{z}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
              {errors.campusZone && <p className="text-red-500 text-[11px] mt-1">{errors.campusZone}</p>}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => set('terms', e.target.checked)}
                className="mt-1 accent-[#ff6b1a]"
              />
              <span className="text-[13px] text-gray-500">
                I agree to the{' '}
                <span className="text-[#ff6b1a] font-bold cursor-pointer hover:underline">Terms of Service</span>{' '}
                and{' '}
                <span className="text-[#ff6b1a] font-bold cursor-pointer hover:underline">Privacy Policy</span>.
              </span>
            </label>
            {errors.terms && <p className="text-red-500 text-[11px]">{errors.terms}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff6b1a] text-white py-3.5 rounded-xl font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
              {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#ff6b1a] font-bold hover:underline no-underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Right: Decorative Panel */}
        <div className="hidden lg:flex flex-col justify-between p-14 bg-[#f0eded] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b1a] opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00af74] opacity-5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            <h2 className="font-[Epilogue] text-[40px] font-black text-[#1b1c1c] leading-tight mb-3">
              Buy. Sell.<br />Connect.
            </h2>
            <p className="text-[#5c5f60] text-[16px] leading-relaxed">
              Your campus marketplace — built for students, by students.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Students', value: '1,800+', icon: 'school' },
              { label: 'Live Listings', value: '840', icon: 'store' },
              { label: 'Deals Closed', value: '3,200+', icon: 'handshake' },
              { label: 'Avg Rating', value: '4.8 ★', icon: 'star' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-[#ff6b1a] text-[22px] mb-2 block">
                  {s.icon}
                </span>
                <p className="text-[#1b1c1c] text-[26px] font-black">{s.value}</p>
                <p className="text-[#5c5f60] text-[12px] font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="relative z-10">
            <p className="text-[#5c5f60] text-[12px] opacity-70">
              Exclusively for ICT University students. Verified & safe.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Register;
