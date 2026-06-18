import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ResetPassword() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // We retrieve the email that we temporarily saved in the last step!
  const email = localStorage.getItem("resetEmail");

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Session expired. Please request a new code.");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, { 
        email, 
        otp, 
        newPassword 
      });
      
      if (res.data.success) {
        setSuccessMsg("Password reset successfully! Redirecting...");
        localStorage.removeItem("resetEmail"); // Clean up for security
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {/* Floating Alerts */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {errorMsg && (
          <div className="bg-white border-l-4 border-red-500 text-slate-800 text-sm px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium min-w-[300px]">
            <span className="text-xl">⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-white border-l-4 border-emerald-500 text-slate-800 text-sm px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium min-w-[300px]">
            <span className="text-xl">✅</span> {successMsg}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 shadow-inner">
          ✅
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Enter Recovery Code</h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          We sent a 6-digit code to <span className="font-bold text-slate-700">{email || "your email"}</span>. Enter it below with your new password.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">6-Digit OTP</label>
            <input 
              type="text" 
              placeholder="123456" 
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Forces numbers only
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-emerald-500 transition"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">New Password</label>
            <input 
              type="password" 
              placeholder="Enter new secure password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || successMsg || otp.length !== 6}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-200 disabled:opacity-50 mt-4"
          >
            {isLoading ? "Verifying..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;