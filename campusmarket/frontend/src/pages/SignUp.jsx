import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    campusZone: '',
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const campusZones = [
    { value: 'north', label: 'North Campus' },
    { value: 'south', label: 'South Campus' },
    { value: 'east', label: 'East Residence' },
    { value: 'west', label: 'West Village' },
    { value: 'off-campus', label: 'Off-Campus Housing' },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreeToTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      console.log('SignUp attempt:', formData);
      // TODO: Connect to backend auth service
      // navigate('/dashboard');
    } catch (error) {
      console.error('SignUp error:', error);
      setError(error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      // TODO: Add Google OAuth logic here
      console.log('Google signup clicked');
    } catch (error) {
      console.error('Google signup error:', error);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // Avatar images
  const avatars = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAEwOs-YLpocCU0qdJL3XfC-yQ4snAeE4LyTEZBsqs3NxCQZTew_OML3tQbrDEOrYOF4H_mY0YkvdzuRkZ_OT4yDyQwvkajI1YaqDmGDoH_zRF5x30ytz_SBY2u4d8al_lGMxMF2L4E3pkIZQXobNzC78g62_wan7QEks-sFRi85doBrEw-8Bl5L85OsT7Ng3hHbDZEw3CFw58N_8wWFBNly6G-MZFyO8HaUD_Z2ttWss3dJcCl6GujV6v98rpGRq5lLiiNebYPKdM',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDZkL6b0IRflRs-joFNQ-k3ug9TL4N9BER5mqrkj-zpZmtzEj1_zcfor15pvD2Hk6EgxCy0UD040Aec0uMSdFeLFJ1Jmy2VJHKFLXkMzLNKnlscy091GpOeSS8GW169B56nILrTcWwNw3AoGFtmfTEvA1yXr87_tvCVwxKugUxawBNCv0gMG_SfLcuMynMylezBMICOIawR9JXM7iskPr1thA90KL1hKLylpbHnA8g2DCFrdoaaGijsg35fSpBwXFzUHGCEFDBglEE',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBGlAfwIAR4IwMtFjqHWzp7I7iqWDmuH9uSakFu1-Le_-Fmv3Y7kcwUCyg39sXX-b1lcQayWZbx7ngQfs8lrEExvc07l3LMzjOjAGH7kwE9wXfzV1csFXMXirJNodvGP6qFtcRNji_G7xmaNvVJSM9kBaTz8EL0aR8qJU15R1vNt57p6dY6GxHSTRjVQ99brxvfyJMTrj8sXX_OttzvUDj3_BcBuyfGJPsAaMnDK9zpyVgYcy2biNRPSdoOomPiKspA5jYsUcJb53Y',
  ];

  const campusImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfR7sTWmEEPjAowxQ9JI1aprOb4b3u9U7SEn7747MtSWyTEl4aX1PFVXdDLwycgthEf7zfXe0ZZhctpQ74p_amrF6iT_csW40OgJ9N2LnWuumsN6HMpQuW7sAadlctwxvUohT8mTROZkdEgWnBByYjqJlwJEVmtFkGI-ncTfncjBe_M5PBtqcMbxARPdJ1xKiqk3plK2FQDBL6Lt_jvTIR4KzWQAMpcCg8ESBaabHWF25ku_-GqIO60mstcqy17iOL3HmxLcna2s4';

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-background font-body-md text-on-background">
      {/* Left Section: Registration Form */}
      <section className="w-full md:w-[45%] bg-white flex flex-col px-6 py-12 md:px-20 md:py-20 justify-center">
        <div className="max-w-md w-full mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="font-[Epilogue] text-[32px] font-black tracking-tighter text-[#ff6b1a] mb-2">
              CampusTrade
            </h1>
            <p className="font-[Manrope] text-[18px] text-[#5c5f60]">
              Join your campus marketplace today.
            </p>
          </header>

          {error && (
            <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a] rounded-xl text-[#93000a] text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Name Fields Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5a4137] uppercase">
                  First Name
                </label>
                <input
                  className="w-full px-6 py-3 rounded-xl border border-[#e1e3e4] bg-white focus:ring-2 focus:ring-[#ff6b1a] focus:border-[#ff6b1a] outline-none transition-all font-[Manrope] text-[16px]"
                  placeholder="Alex"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5a4137] uppercase">
                  Last Name
                </label>
                <input
                  className="w-full px-6 py-3 rounded-xl border border-[#e1e3e4] bg-white focus:ring-2 focus:ring-[#ff6b1a] focus:border-[#ff6b1a] outline-none transition-all font-[Manrope] text-[16px]"
                  placeholder="Rivers"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email Field with Icon */}
            <div className="flex flex-col gap-1">
              <label className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5a4137] uppercase">
                University Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#5c5f60]">
                  mail
                </span>
                <input
                  className="w-full pl-16 pr-6 py-3 rounded-xl border border-[#e1e3e4] bg-white focus:ring-2 focus:ring-[#ff6b1a] focus:border-[#ff6b1a] outline-none transition-all font-[Manrope] text-[16px]"
                  placeholder="alex.rivers@university.edu"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password Field with Icon */}
            <div className="flex flex-col gap-1">
              <label className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5a4137] uppercase">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#5c5f60]">
                  lock
                </span>
                <input
                  className="w-full pl-16 pr-6 py-3 rounded-xl border border-[#e1e3e4] bg-white focus:ring-2 focus:ring-[#ff6b1a] focus:border-[#ff6b1a] outline-none transition-all font-[Manrope] text-[16px]"
                  placeholder="••••••••"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Campus Zone Dropdown with Icon */}
            <div className="flex flex-col gap-1">
              <label className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5a4137] uppercase">
                Campus Zone
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-[#5c5f60]">
                  location_on
                </span>
                <select
                  className="w-full pl-16 pr-12 py-3 rounded-xl border border-[#e1e3e4] bg-white focus:ring-2 focus:ring-[#ff6b1a] focus:border-[#ff6b1a] outline-none transition-all font-[Manrope] text-[16px] appearance-none"
                  name="campusZone"
                  value={formData.campusZone}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>
                    Select your zone
                  </option>
                  {campusZones.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-[#5c5f60] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-4 pt-2">
              <input
                className="mt-1 rounded-sm border-[#e1e3e4] text-[#ff6b1a] focus:ring-[#ff6b1a] cursor-pointer"
                id="terms"
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                required
              />
              <label className="font-[Manrope] text-[14px] text-[#5c5f60] cursor-pointer">
                I agree to the{' '}
                <a href="/terms" className="text-[#ff6b1a] font-bold hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-[#ff6b1a] font-bold hover:underline">
                  Privacy Policy
                </a>{' '}
                regarding student data protection.
              </label>
            </div>

            {/* Create Account Button */}
            <button
              className="w-full bg-[#ff6b1a] text-white py-3 rounded-xl font-[Epilogue] text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#a43e00] transition-colors shadow-lg active:scale-[0.98] duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>

            {/* Login Link */}
            <p className="text-center font-[Manrope] text-[14px] text-[#5c5f60] mt-6">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleLogin}
                className="text-[#ff6b1a] font-bold hover:underline"
              >
                Log in
              </button>
            </p>
          </form>
        </div>
      </section>

      {/* Right Section: Visual Panel */}
      <section
        className="hidden md:flex md:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#ffdbcd] to-white items-center justify-center p-20"
        style={{
          backgroundImage: `url(${campusImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Background overlay image */}
        <div className="absolute inset-0 z-0">
          <img
            src={campusImage}
            alt="Campus"
            className="w-full h-full object-cover opacity-10 mix-blend-multiply"
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full max-w-2xl space-y-12">
          {/* Title & Subtitle */}
          <div className="space-y-4 text-left">
            <h2 className="font-[Epilogue] text-[48px] font-bold leading-tight text-[#591e00]">
              The trusted campus network.
            </h2>
            <p className="font-[Manrope] text-[18px] text-[#5a4137] max-w-lg leading-relaxed">
              Trade textbooks, find housing, or offer your skills within a verified student community you can rely on.
            </p>
          </div>

          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stat 1: Active Users */}
            <div
              className="p-8 rounded-xl border border-white/20 flex flex-col gap-4"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="material-symbols-outlined text-[#ff6b1a] text-5xl">group</span>
              <div>
                <p className="font-[Epilogue] text-[32px] font-bold text-[#1b1c1c]">2.4k</p>
                <p className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase">
                  Active Users
                </p>
              </div>
            </div>

            {/* Stat 2: Live Listings */}
            <div
              className="p-8 rounded-xl border border-white/20 flex flex-col gap-4"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="material-symbols-outlined text-[#ff6b1a] text-5xl">inventory_2</span>
              <div>
                <p className="font-[Epilogue] text-[32px] font-bold text-[#1b1c1c]">840</p>
                <p className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase">
                  Live Listings
                </p>
              </div>
            </div>

            {/* Stat 3: Satisfaction Rate (Full Width) */}
            <div
              className="md:col-span-2 p-8 rounded-xl border border-white/20 flex flex-col md:flex-row items-center justify-between gap-6"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div>
                <p className="font-[Epilogue] text-[32px] font-bold text-[#1b1c1c]">98%</p>
                <p className="font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase">
                  Satisfaction Rate
                </p>
              </div>
              {/* Avatar Stack */}
              <div className="flex -space-x-4">
                {avatars.map((avatar, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-12 rounded-full border-4 border-white overflow-hidden flex-shrink-0"
                  >
                    <img src={avatar} alt={`User ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-4 border-white flex items-center justify-center bg-[#ff6b1a] text-white font-bold text-xs flex-shrink-0">
                  +12
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-3 bg-white/40 border border-white/20 p-4 rounded-full w-fit">
            <span
              className="material-symbols-outlined text-[#00af74]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
            <p className="font-[Manrope] text-[14px] text-[#5a4137]">
              Verified .edu registration required for all members
            </p>
          </div>
        </div>

        {/* Decorative blur shapes */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#ff6b1a] opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white opacity-40 rounded-full blur-3xl"></div>
      </section>
    </main>
  );
};

export default SignUp;
