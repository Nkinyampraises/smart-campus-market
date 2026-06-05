import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, saveToken } from '../services/api';
import AuthNavbar from '../components/AuthNavbar';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        showToast('Welcome back!', 'success');
        // Admins go to dashboard, regular users go to browse
        window.location.href = result.user?.role === 'admin' ? '/admin/dashboard' : '/browse';
      } else if (result.suspended) {
        navigate('/suspended');
      } else {
        showToast('Invalid email or password', 'error');
      }
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const data = await api.googleLogin(credentialResponse.credential);
      saveToken(data.accessToken);
      // Full page reload so AuthContext re-initialises with the new token
      window.location.href = '/browse';
    } catch (err) {
      showToast(err.message || 'Google login failed', 'error');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-[#fcf9f8] font-[Manrope] text-[#1b1c1c] min-h-screen flex flex-col">
      <AuthNavbar page="login" />
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-2 gap-[80px] bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden min-h-[700px]">

          {/* Left Side: Login Form */}
          <div className="p-8 md:p-16 flex flex-col justify-center">
            <Link to="/home" className="text-[22px] font-black tracking-tighter text-[#ff6b1a] no-underline mb-10 block">
              CampusTrade
            </Link>

            <div className="mb-10">
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
                <label className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] mb-2 uppercase" htmlFor="email">
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
                  <label className="block font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase" htmlFor="password">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-bold text-[#ff6b1a] hover:underline no-underline">
                    Forgot?
                  </Link>
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

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  className="w-4 h-4 text-[#ff6b1a] border-[#e2bfb2] rounded focus:ring-[#ff6b1a] cursor-pointer"
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="ml-2 font-[Manrope] text-[14px] text-[#5c5f60] cursor-pointer" htmlFor="remember">
                  Remember me on this device
                </label>
              </div>

              {/* Sign In Button */}
              <button
                className="w-full bg-[#ff6b1a] text-white py-3 rounded-lg font-[Epilogue] text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#a43e00] transition-all active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>

              {/* Google OAuth — requires registered domain; disabled on IP-based deployment */}
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-[#e2bfb2]"></div>
                <span className="flex-shrink mx-4 font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-[#e2bfb2]"></div>
              </div>
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-[14px] cursor-not-allowed"
                title="Google Sign-In requires a registered domain name. Available when deployed with a domain."
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#ccc"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#ccc"/>
                  <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#ccc"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#ccc"/>
                </svg>
                Continue with Google (requires domain)
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#ff6b1a] font-bold hover:underline no-underline">
                Sign up free
              </Link>
            </p>
          </div>

          {/* Right Side: Features Panel */}
          <div className="hidden lg:flex relative flex-col justify-between p-16 bg-[#f0eded] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b1a] opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00af74] opacity-5 rounded-full -ml-24 -mb-24"></div>

            <div className="relative z-10">
              <h2 className="font-[Epilogue] text-[32px] font-bold leading-tight text-[#1b1c1c] mb-12">
                Why CampusTrade?
              </h2>
              <div className="space-y-6">
                {[
                  { icon: 'auto_awesome', bg: 'bg-[#ffdbcd]', color: 'text-[#a43e00]', title: 'AI Price Suggestions', desc: 'Get the best value for your items with real-time market data from your campus.' },
                  { icon: 'forum', bg: 'bg-[#54feb3]', color: 'text-[#003a23]', title: 'Negotiate in Real-Time', desc: 'Chat instantly with verified students and finalize deals securely in seconds.' },
                  { icon: 'verified_user', bg: 'bg-[#e1e3e4]', color: 'text-[#5c5f60]', title: 'Safe & Verified', desc: 'Exclusively for your university community. Safe meetups, verified identities.' },
                ].map((f) => (
                  <div key={f.title} className="bg-white p-6 rounded-xl border border-[#e2bfb2] shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start gap-6">
                      <div className={`${f.bg} p-4 rounded-lg ${f.color} flex-shrink-0`}>
                        <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-[Epilogue] text-[16px] font-bold text-[#1b1c1c] mb-1">{f.title}</h3>
                        <p className="font-[Manrope] text-[14px] text-[#5c5f60]">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/register"
              className="w-full bg-[#ff6b1a] text-white py-3 rounded-lg font-[Epilogue] text-[16px] font-bold hover:bg-[#a43e00] transition-all active:scale-[0.98] shadow-md mt-8 text-center no-underline block"
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>

      <footer className="w-full px-6 py-8 text-center">
        <p className="font-[Manrope] text-[14px] text-[#5c5f60] opacity-60">
          © 2025 CampusTrade. Built for students, by students.
        </p>
      </footer>
    </div>
  );
};

export default Login;
