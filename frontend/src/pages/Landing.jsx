import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center mt-20">
      <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">Final Project Portal</span>
      <h1 className="text-3xl font-bold text-slate-800 mt-4 mb-2">Online Therapy Platform</h1>
      <p className="text-sm text-slate-500 mb-6">Connecting licensed therapists with clients through secure, real-time consultation channels.</p>
      <div className="space-y-3">
        <button onClick={() => navigate('/login')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-100">Sign In</button>
        <button onClick={() => navigate('/register')} className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl transition border border-slate-200">Create Account</button>
      </div>
    </div>
  );
}

export default Landing;