import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axios.post("${import.meta.env.VITE_API_URL}/api/auth/forgot-password", { email });
      
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        // Important: We save the email temporarily so the next screen knows who is resetting the password
        localStorage.setItem("resetEmail", email);
        
        // Wait 2 seconds so they can read the success message, then send them to the OTP input screen
        setTimeout(() => {
          navigate('/reset-password');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      
      {/* Floating Alerts */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {errorMsg && (
          <div className="bg-white border-l-4 border-red-500 text-slate-800 text-sm px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium min-w-[300px] animate-fade-in">
            <span className="text-xl">⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-white border-l-4 border-emerald-500 text-slate-800 text-sm px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium min-w-[300px] animate-fade-in">
            <span className="text-xl">✅</span> {successMsg}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        
        {/* Header Icon */}
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 shadow-inner">
          🔐
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Forgot Password</h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          Enter the email address associated with your account, and we will send you a secure 6-digit recovery code.
        </p>

        <form onSubmit={handleRequestOTP} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              placeholder="patient@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              required 
              disabled={isLoading || successMsg}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || successMsg}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Code...
              </span>
            ) : "Send Recovery Code"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;