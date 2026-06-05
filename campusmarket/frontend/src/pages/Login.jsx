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

              {/* Divider */}
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-[#e2bfb2]"></div>
                <span className="flex-shrink mx-4 font-[Manrope] text-[12px] font-bold tracking-wider text-[#5c5f60] uppercase">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-[#e2bfb2]"></div>
              </div>

              {/* Google Login */}
              <div className="flex justify-center">
                {googleLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 text-[14px]">
                    <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                    Signing in with Google…
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={() => showToast('Google login failed. Try again.', 'error')}
                    width="380"
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                  />
                )}
              </div>
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
