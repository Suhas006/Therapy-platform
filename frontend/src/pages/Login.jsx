import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await axios.post('${import.meta.env.VITE_API_URL}/api/auth/login', { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid account credentials.");
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      {errorMsg && <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl shadow-sm text-center font-medium">⚠️ {errorMsg}</div>}
      <div className="w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 mt-20">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Welcome Back</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
          
          {/* ---> NEW FORGOT PASSWORD LINK <--- */}
          <div className="flex justify-end -mt-1 mb-2">
            <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition">Sign In</button>
        </form>
        <p className="text-xs text-center text-slate-500 mt-6">Don't have an account? <button onClick={() => navigate('/register')} className="text-blue-600 font-semibold hover:underline">Register</button></p>
      </div>
    </div>
  );
}

export default Login;