import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!formData.agreeToTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      // TODO: Add signup logic here
      console.log('SignUp attempt:', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        university: formData.university,
      });
      // Placeholder - replace with actual signup API call
      // navigate('/login');
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

  return (
    <div className="bg-[#fcf9f8] font-[Manrope] text-[#1b1c1c] min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-2 gap-[80px] bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden min-h-[700px]">
          
          {/* Left Side: Signup Form */}
          <div className="p-8 md:p-16 flex flex-col justify-center">
            <div className="mb-12">
              <h1 className="font-[Epilogue] text-[32px] font-bold leading-tight text-[#1b1c1c] mb-1">
                Join the Community
              </h1>
              <p className="font-[Manrope] text-[18px] text-[#5c5f60]">
                Create your campus marketplace account today.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg text-[#93000a] text-sm">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase"
                    htmlFor="firstName"
                  >
                    First Name
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                    id="firstName"
                    placeholder="John"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase"
                    htmlFor="lastName"
                  >
                    Last Name
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                    id="lastName"
                    placeholder="Doe"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label
                  className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                  id="email"
                  placeholder="student@university.edu"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* University Field */}
              <div>
                <label
                  className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase"
                  htmlFor="university"
                >
                  University
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                  id="university"
                  placeholder="Your University Name"
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                  id="confirmPassword"
                  placeholder="••••••••"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start pt-2">
                <input
                  className="w-4 h-4 text-[#ff6b1a] border-[#e2bfb2] rounded focus:ring-[#ff6b1a] cursor-pointer mt-1 flex-shrink-0"
                  id="agreeToTerms"
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  required
                />
                <label
                  className="ml-3 font-[Manrope] text-[14px] text-[#5c5f60] cursor-pointer"
                  htmlFor="agreeToTerms"
                >
                  I agree to the{' '}
                  <a href="/terms" className="text-[#ff6b1a] hover:underline font-bold">
                    Terms and Conditions
                  </a>
                </label>
              </div>

              {/* Sign Up Button */}
              <button
                className="w-full bg-[#ff6b1a] text-white py-3 rounded-lg font-[Epilogue] text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#a43e00] transition-all active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              {/* Divider */}
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-[#e2bfb2]"></div>
                <span className="flex-shrink mx-4 font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-[#e2bfb2]"></div>
              </div>

              {/* Google SignUp Button */}
              <button
                className="w-full bg-[#f6f3f2] border border-[#e2bfb2] text-[#1b1c1c] py-3 rounded-lg font-[Manrope] text-[16px] flex items-center justify-center gap-3 hover:bg-[#eae7e7] transition-all active:scale-[0.98]"
                type="button"
                onClick={handleGoogleSignUp}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </button>

              {/* Login Link */}
              <p className="text-center font-[Manrope] text-[14px] text-[#5c5f60] mt-6">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={handleLogin}
                  className="text-[#ff6b1a] font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            </form>
          </div>

          {/* Right Side: Benefits Panel */}
          <div className="hidden lg:flex relative flex-col justify-center p-16 bg-[#f0eded] overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b1a] opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00af74] opacity-5 rounded-full -ml-24 -mb-24"></div>

            <div className="relative z-10">
              <h2 className="font-[Epilogue] text-[32px] font-bold leading-tight text-[#1b1c1c] mb-12">
                Why Join CampusTrade?
              </h2>

              <div className="space-y-6">
                {/* Benefit 1 */}
                <div className="group bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-6">
                    <div className="bg-[#ffdbcd] p-4 rounded-lg text-[#a43e00] flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                    </div>
                    <div>
                      <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">
                        Campus Community
                      </h3>
                      <p className="font-[Manrope] text-[14px] text-[#5c5f60]">
                        Buy and sell with verified students from your university.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="group bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-6">
                    <div className="bg-[#54feb3] p-4 rounded-lg text-[#003a23] flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">trending_up</span>
                    </div>
                    <div>
                      <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">
                        Smart Pricing
                      </h3>
                      <p className="font-[Manrope] text-[14px] text-[#5c5f60]">
                        AI-powered price suggestions ensure fair deals every time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="group bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-6">
                    <div className="bg-[#e1e3e4] p-4 rounded-lg text-[#5c5f60] flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">shield_verified</span>
                    </div>
                    <div>
                      <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">
                        100% Secure
                      </h3>
                      <p className="font-[Manrope] text-[14px] text-[#5c5f60]">
                        Your transactions and identity are protected with advanced security.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 text-center">
        <p className="font-[Manrope] text-[14px] text-[#5c5f60] opacity-60">
          © 2024 CampusTrade. Built for students, by students.
        </p>
      </footer>
    </div>
  );
};

export default SignUp;
