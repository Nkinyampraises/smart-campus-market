import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { UNIVERSITY_EMAIL_MAX_LENGTH, UNIVERSITY_EMAIL_SUFFIX, validateUniversityEmail } from '../utils/universityEmail';

const ForgotPassword = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailCheck = validateUniversityEmail(email);
    if (!emailCheck.valid) {
      setEmailError(emailCheck.error);
      return;
    }

    setEmailError('');
    setLoading(true);
    try {
      await api.forgotPassword(emailCheck.value);
      setEmail(emailCheck.value);
      setSent(true);
      showToast('Reset link sent! Check your email.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send reset link', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-[Manrope] flex flex-col items-center justify-center p-6">
      <Link to="/home" className="text-[24px] font-black tracking-tighter text-[#ff6b1a] no-underline mb-12">
        CampusTrade
      </Link>

      <div className="bg-white rounded-2xl shadow-[0px_4px_40px_rgba(0,0,0,0.08)] p-10 w-full max-w-md">
        {!sent ? (
          <>
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#ff6b1a] text-[32px]">lock_reset</span>
            </div>
            <h1 className="font-[Epilogue] text-[26px] font-bold text-[#1b1c1c] mb-2">
              Forgot your password?
            </h1>
            <p className="text-[15px] text-gray-500 mb-8">
              Enter your university email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="forgot-password-email" className="block text-[11px] font-black tracking-wider text-gray-400 uppercase mb-2">
                  ICT University Email
                </label>
                <input
                  id="forgot-password-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder={`student${UNIVERSITY_EMAIL_SUFFIX}`}
                  autoComplete="email"
                  maxLength={UNIVERSITY_EMAIL_MAX_LENGTH}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby="forgot-password-email-help"
                  required
                  className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b1a] transition-all ${emailError ? 'border-red-400' : 'border-[#e2bfb2]'}`}
                />
                <p id="forgot-password-email-help" aria-live="polite" className={`text-[11px] mt-1 ${emailError ? 'text-red-500' : 'text-gray-500'}`}>
                  {emailError || `Use the ${UNIVERSITY_EMAIL_SUFFIX} address linked to your account.`}
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff6b1a] text-white py-3.5 rounded-xl font-bold text-[15px] hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
                {!loading && <span className="material-symbols-outlined text-[18px]">send</span>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-[14px] text-[#ff6b1a] font-bold hover:underline no-underline flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Back to Login
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-emerald-500 text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h2 className="font-[Epilogue] text-[24px] font-bold text-[#1b1c1c] mb-2">Email Sent!</h2>
            <p className="text-[14px] text-gray-500 mb-8">
              Check <span className="font-bold text-[#1b1c1c]">{email}</span> for your password reset link. It expires in 30 minutes.
            </p>
            <Link
              to="/login"
              className="inline-block bg-[#ff6b1a] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:shadow-lg transition-all no-underline"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
