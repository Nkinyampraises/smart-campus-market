import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: Add authentication logic here
      console.log('Login attempt:', { email, password, rememberMe });
      // Placeholder - replace with actual auth API call
      // navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // TODO: Add Google OAuth logic here
      console.log('Google login clicked');
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="bg-[#fcf9f8] font-[Manrope] text-[#1b1c1c] min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-2 gap-[80px] bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden min-h-[700px]">
          
          {/* Left Side: Login Form */}
          <div className="p-8 md:p-16 flex flex-col justify-center">
            <div className="mb-12">
              <h1 className="font-[Epilogue] text-[32px] font-bold leading-tight text-[#1b1c1c] mb-1">
                Welcome Back
              </h1>
              <p className="font-[Manrope] text-[18px] text-[#5c5f60]">
                Securely access your campus marketplace.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <a
                    className="text-xs font-bold text-[#ff6b1a] hover:underline"
                    href="/forgot-password"
                  >
                    Forgot?
                  </a>
                </div>
                <input
                  className="w-full px-4 py-3 rounded-lg border border-[#e2bfb2] focus:border-[#ff6b1a] focus:ring-1 focus:ring-[#ff6b1a] bg-[#fcf9f8] outline-none transition-all font-[Manrope] text-[16px]"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  className="w-4 h-4 text-[#ff6b1a] border-[#e2bfb2] rounded focus:ring-[#ff6b1a] cursor-pointer"
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  className="ml-2 font-[Manrope] text-[14px] text-[#5c5f60] cursor-pointer"
                  htmlFor="remember"
                >
                  Remember me on this device
                </label>
              </div>

              {/* Sign In Button */}
              <button
                className="w-full bg-[#ff6b1a] text-white py-3 rounded-lg font-[Epilogue] text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#a43e00] transition-all active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
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

              {/* Google Login Button */}
              <button
                className="w-full bg-[#f6f3f2] border border-[#e2bfb2] text-[#1b1c1c] py-3 rounded-lg font-[Manrope] text-[16px] flex items-center justify-center gap-3 hover:bg-[#eae7e7] transition-all active:scale-[0.98]"
                type="button"
                onClick={handleGoogleLogin}
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
                Continue with Google
              </button>
            </form>
          </div>

          {/* Right Side: Features Panel */}
          <div className="hidden lg:flex relative flex-col justify-between p-16 bg-[#f0eded] overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b1a] opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00af74] opacity-5 rounded-full -ml-24 -mb-24"></div>

            <div className="relative z-10">
              <h2 className="font-[Epilogue] text-[32px] font-bold leading-tight text-[#1b1c1c] mb-12">
                Why CampusTrade?
              </h2>

              <div className="space-y-6">
                {/* Feature 1: AI Price Suggestions */}
                <div className="group bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-6">
                    <div className="bg-[#ffdbcd] p-4 rounded-lg text-[#a43e00] flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                    </div>
                    <div>
                      <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">
                        AI Price Suggestions
                      </h3>
                      <p className="font-[Manrope] text-[14px] text-[#5c5f60]">
                        Get the best value for your items with real-time market data from your campus.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2: Negotiate in Real-Time */}
                <div className="group bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-6">
                    <div className="bg-[#54feb3] p-4 rounded-lg text-[#003a23] flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">forum</span>
                    </div>
                    <div>
                      <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">
                        Negotiate in Real-Time
                      </h3>
                      <p className="font-[Manrope] text-[14px] text-[#5c5f60]">
                        Chat instantly with verified students and finalize deals securely in seconds.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3: Safe & Verified */}
                <div className="group bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-6">
                    <div className="bg-[#e1e3e4] p-4 rounded-lg text-[#5c5f60] flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl">verified_user</span>
                    </div>
                    <div>
                      <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">
                        Safe & Verified
                      </h3>
                      <p className="font-[Manrope] text-[14px] text-[#5c5f60]">
                        Exclusively for your university community. Safe meetups, verified identities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign Up Button - In the Card */}
            <button
              onClick={handleSignUp}
              className="w-full bg-[#ff6b1a] text-white py-3 rounded-lg font-[Epilogue] text-[16px] font-bold hover:bg-[#a43e00] transition-all active:scale-[0.98] shadow-md mt-8"
            >
              Create Account
            </button>
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

export default Login;
