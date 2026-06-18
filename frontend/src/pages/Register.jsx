import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Client' // Default to Client
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Send the exact data the backend expects
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, formData);
      
      if (res.status === 201) {
        // Success! Send them to the login page
        alert("Registration successful! Please log in.");
        navigate('/login');
      }
    } catch (err) {
      // SMART ERROR HANDLING: Catch the exact message from the Node.js backend
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Registration failed. Please check your network connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative">
      
      {/* ERROR TOAST */}
      {error && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white border-l-4 border-red-500 text-slate-800 text-sm px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-medium z-50 min-w-[300px] justify-center">
          <span className="text-xl">⚠️</span> {error}
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-6">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Full Name" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition text-sm"
            required 
          />
          <input 
            type="email" 
            placeholder="Email Address" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition text-sm"
            required 
          />
          <input 
            type="tel" 
            placeholder="Phone Number (10 digits)" 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition text-sm"
            required 
          />
          <input 
            type="password" 
            placeholder="Password (Min 6 characters)" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition text-sm"
            required 
          />
          
          {/* THE FIXED DROPDOWN: Value matches the backend, Text matches the UI */}
          <select 
            value={formData.role} 
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-700 text-sm font-medium"
          >
            <option value="Client">Client / Patient</option>
            <option value="Therapist">Licensed Therapist</option>
            <option value="Counselor">Counselor</option>
            <option value="Admin">Platform Administrator</option>
          </select>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-blue-200 mt-2 disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Register Account"}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-slate-500 font-medium">
          Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;