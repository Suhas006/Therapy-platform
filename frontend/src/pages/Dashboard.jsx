import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

function Dashboard() {
  const navigate = useNavigate();
  const [dashTab, setDashTab] = useState('therapists');
  const [loggedInUser, setLoggedInUser] = useState(null);
  
  // Shared States
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const socketRef = useRef(null);
  
  // IN-APP NOTIFICATION STATES (Replacing window.alert)
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // Client Specific States
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [stressLevel, setStressLevel] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState(5);
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [assessmentProvider, setAssessmentProvider] = useState(''); 
  const [pastReports, setPastReports] = useState([]);
  const [clientAppointments, setClientAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxFee, setMaxFee] = useState('');

  // Therapist / Counselor Specific States
  const [clients, setClients] = useState([]); 
  const [therapistAppointments, setTherapistAppointments] = useState([]); 
  const [selectedClientAssessments, setSelectedClientAssessments] = useState([]); 
  const [therapistInboxTab, setTherapistInboxTab] = useState('chat');

  // Admin Specific States
  const [adminStats, setAdminStats] = useState(null);

  // ==========================================
  // CUSTOM TOAST NOTIFICATION HELPER
  // ==========================================
  const showToast = (msg, type = 'success') => {
    if (type === 'error') {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000); // Auto dismiss after 4 seconds
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userString);
    setLoggedInUser(user);

    if (user.role === 'Client') {
      const loadInitialData = async () => {
        try {
          const therapistRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/therapists`);
          if (therapistRes.data.success) {
            const validTherapists = therapistRes.data.therapists.filter(t => t.userId && t.userId.name && t.isApproved !== false);
            setTherapists(validTherapists);
            if (validTherapists.length > 0) setActiveChatId(validTherapists[0].userId._id);
          }
          const reportRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assessments?userId=${user.id}`);
          if (reportRes.data.success) setPastReports(reportRes.data.reports);

          const apptRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/appointments?clientId=${user.id}`);
          if (apptRes.data.success) setClientAppointments(apptRes.data.appointments);
        } catch (err) { console.error("Data load failed:", err.message); }
      };
      loadInitialData();
    }

    if (user.role === 'Therapist' || user.role === 'Counselor') {
      const loadTherapistData = async () => {
        try {
          const clientRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/clients`);
          if (clientRes.data.success) {
            setClients(clientRes.data.clients);
            if (clientRes.data.clients.length > 0) setActiveChatId(clientRes.data.clients[0]._id);
          }
          const apptRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/appointments?therapistUserId=${user.id}`);
          if (apptRes.data.success) setTherapistAppointments(apptRes.data.appointments);
        } catch (err) { console.error("Failed to load provider data:", err.message); }
      };
      loadTherapistData();
    }

    if (user.role === 'Admin') {
      const loadAdminData = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/stats`);
          if (res.data.success) setAdminStats(res.data.stats);

          const therapistRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/therapists`);
          if (therapistRes.data.success) {
            const allTherapists = therapistRes.data.therapists.filter(t => t.userId && t.userId.name);
            setTherapists(allTherapists);
          }
        } catch (err) { console.error("Failed to load admin console data:", err.message); }
      };
      loadAdminData();
    }

    socketRef.current = io(`${import.meta.env.VITE_API_URL}`);
    socketRef.current.emit("join_room", user.id);
    socketRef.current.on("receive_message", (data) => {
      setChatHistory((prev) => [...prev, data]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    const fetchTargetData = async () => {
      if (!loggedInUser || !activeChatId) return;
      try {
        const chatRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages?senderId=${loggedInUser.id}&receiverId=${activeChatId}`);
        if (chatRes.data.success) setChatHistory(chatRes.data.history);

        if (loggedInUser.role === 'Therapist' || loggedInUser.role === 'Counselor') {
          const assessRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assessments?userId=${activeChatId}&providerId=${loggedInUser.id}`);
          if (assessRes.data.success) setSelectedClientAssessments(assessRes.data.reports);
        }
      } catch (err) { console.error("Sync error:", err.message); }
    };

    if (dashTab === 'chat' || loggedInUser?.role === 'Therapist' || loggedInUser?.role === 'Counselor') {
      fetchTargetData();
    }
  }, [dashTab, activeChatId, loggedInUser]);

  const handleInitiateBooking = (e) => {
    e.preventDefault();
    if (!appointmentDate) return showToast("Please select a date and time.", "error");
    setShowPaymentModal(true); 
  };

  const handleConfirmPaymentAndBook = async () => {
    setShowPaymentModal(false);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/appointments`, { clientId: loggedInUser.id, therapistId: selectedTherapist._id, appointmentDate });
      showToast(`Payment of ₹${selectedTherapist.sessionFee} successful! Session booked.`);
      setSelectedTherapist(null);
      setAppointmentDate('');
      
      const apptRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/appointments?clientId=${loggedInUser.id}`);
      if (apptRes.data.success) setClientAppointments(apptRes.data.appointments);
    } catch (err) { showToast("Booking transaction validation failure.", "error"); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result); 
      reader.readAsDataURL(file);
    }
  };

  const handleSendLiveMessage = async (e, receiverId) => {
    e.preventDefault();
    if ((!chatMessage.trim() && !chatImage) || !receiverId) return;
    
    const messagePayload = { senderId: loggedInUser.id, receiverId, message: chatMessage, image: chatImage };
    try {
      socketRef.current.emit("send_message", messagePayload);
      await axios.post(`${import.meta.env.VITE_API_URL}/api/messages`, messagePayload);
      setChatHistory((prev) => [...prev, messagePayload]);
      setChatMessage('');
      setChatImage(null); 
    } catch (err) { showToast("Message sync failed.", "error"); }
  };

  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/assessments`, { 
        userId: loggedInUser.id, stressLevel, anxietyLevel, notes: assessmentNotes, providerId: assessmentProvider || null 
      });

      if (res.data.success) {
        showToast("Mental health metrics successfully submitted!");
        setAssessmentNotes('');
        setAssessmentProvider(''); 
        const reportRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/assessments?userId=${loggedInUser.id}`);
        if (reportRes.data.success) setPastReports(reportRes.data.reports);
      }
    } catch (err) { showToast("Assessment parsing malfunction.", "error"); }
  };

  // ==========================================
  // CUSTOM IN-APP MODAL REPLACING window.confirm
  // ==========================================
  const handleAdminAction = (therapistId, actionType) => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to ${actionType} this professional? This action cannot be easily undone.`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); // Close modal
        try {
          if (actionType === 'approve') {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/therapists/${therapistId}/approve`);
            setTherapists(therapists.map(t => t._id === therapistId ? { ...t, isApproved: true } : t));
            showToast("Specialist Approved! They are now visible to patients.");
          } else {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/therapists/${therapistId}/ban`);
            setTherapists(therapists.filter(t => t._id !== therapistId));
            showToast("Specialist declined and removed from directory.");
          }
        } catch (err) { 
          console.error("API Error:", err); 
          showToast("Action failed. Check server connection.", "error");
        }
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate('/');
  };

  const generateICS = (appointment, providerName) => {
    const startDate = new Date(appointment.appointmentDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
    const formatDate = (date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${formatDate(startDate)}\nDTEND:${formatDate(endDate)}\nSUMMARY:Virtual Consultation - ${providerName}\nDESCRIPTION:Secure Teletherapy Session. Log into your portal 5 minutes early.\nLOCATION:Teletherapy Portal\nEND:VEVENT\nEND:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `session_${appointment._id.substring(0,5)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Add this right above if (!loggedInUser) return null;
  const filteredTherapists = Array.isArray(therapists) ? therapists.filter(t => {
    const matchesSearch = (t.userId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.specialization || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFee = maxFee === '' || t.sessionFee <= Number(maxFee);
    return matchesSearch && matchesFee;
  }) : [];

  if (!loggedInUser) return null;

  return (
    <div className="w-full flex flex-col items-center relative min-h-screen">
      
      {/* ========================================== */}
      {/* FLOATING TOAST NOTIFICATIONS */}
      {/* ========================================== */}
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

      {/* ========================================== */}
      {/* CUSTOM CONFIRMATION MODAL */}
      {/* ========================================== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-slate-100">
            <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-red-100">⚠️</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Action</h3>
            <p className="text-sm text-slate-500 mb-8">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition border border-slate-200 w-1/2">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-md shadow-red-200 w-1/2">Proceed</button>
            </div>
          </div>
        </div>
      )}

      {/* SPRINT C: THE PAYMENT GATEWAY MODAL */}
      {showPaymentModal && selectedTherapist && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-100 relative">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white h-12 w-12 rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-white">💳</div>
            <h3 className="text-xl font-bold text-slate-800 mt-4 text-center">Complete Booking</h3>
            <p className="text-xs text-slate-500 text-center mt-2 mb-6">Secure Checkout via Payment Gateway</p>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2">
              <div className="flex justify-between text-sm font-medium text-slate-600"><span>Specialist:</span> <span className="text-slate-800 font-bold">{selectedTherapist.userId?.name}</span></div>
              <div className="flex justify-between text-sm font-medium text-slate-600"><span>Session Date:</span> <span className="text-slate-800 font-bold">{new Date(appointmentDate).toLocaleString()}</span></div>
              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-base font-black text-slate-800"><span>Total Fee:</span> <span className="text-emerald-600">₹{selectedTherapist.sessionFee}</span></div>
            </div>

            <button onClick={handleConfirmPaymentAndBook} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-blue-200 text-sm">
              Pay ₹{selectedTherapist.sessionFee} & Book Session
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="w-full mt-3 text-slate-500 hover:text-slate-800 text-xs font-bold transition">Cancel Transaction</button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW 1: SYSTEM ADMINISTRATOR VIEW */}
      {/* ========================================== */}
      {loggedInUser.role === 'Admin' && (
        <div className="max-w-5xl w-full mt-4 space-y-6">
          <div className="bg-slate-900 rounded-2xl shadow-md p-6 flex flex-col sm:flex-row items-center justify-between border border-slate-800 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shadow-lg text-xl">A</div>
              <div>
                <h3 className="font-bold text-white text-xl">System Administrator Console</h3>
                <p className="text-xs text-indigo-400 font-mono mt-1">● Master Management Node Active</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition">Secure Sign Out</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
              <span className="text-4xl font-black text-blue-600">{adminStats?.totalClients || 0}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Active Patients</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
              <span className="text-4xl font-black text-emerald-600">{therapists.length || 0}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Total Specialists</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
              <span className="text-4xl font-black text-orange-500">{adminStats?.pendingAppointments || 0}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Pending Sessions</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Platform Governance: Manage Specialists</h3>
            <div className="overflow-x-auto">
              {therapists.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-4">No specialists registered in the system yet.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Provider Name</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Specialization</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">System Status</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {therapists.map(t => (
                      <tr key={t._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="p-3 font-bold text-slate-800 text-sm">{t.userId?.name || "Unknown"}</td>
                        <td className="p-3 text-xs text-slate-500">{t.specialization}</td>
                        <td className="p-3 text-center">
                          {t.isApproved ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wider">Pending</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2 flex justify-end">
                          {!t.isApproved && (
                            <button onClick={() => handleAdminAction(t._id, 'approve')} className="text-[10px] font-bold px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition border border-emerald-200">Approve</button>
                          )}
                          <button onClick={() => handleAdminAction(t._id, 'decline')} className="text-[10px] font-bold px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition border border-red-200">Decline / Ban</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW 2: THERAPIST / COUNSELOR CONSOLE VIEW */}
      {/* ========================================== */}
      {(loggedInUser.role === 'Therapist' || loggedInUser.role === 'Counselor') && (
        <div className="max-w-5xl w-full mt-4 space-y-6">
          <div className="bg-slate-900 rounded-2xl shadow-md p-6 flex flex-col sm:flex-row items-center justify-between border border-slate-800 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center shadow-lg text-xl">{loggedInUser.name.charAt(0)}</div>
              <div>
                <h3 className="font-bold text-white text-xl">{loggedInUser.role === 'Therapist' ? 'Dr.' : ''} {loggedInUser.name}</h3>
                <p className="text-xs text-emerald-400 font-mono mt-1">● Professional {loggedInUser.role} Portal Active</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition">Secure Sign Out</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Your Professional Schedule</h3>
              <div className="space-y-3 overflow-y-auto flex-grow max-h-[340px] pr-2">
                {therapistAppointments.length === 0 ? (
                   <p className="text-xs text-slate-400 italic text-center mt-10">No consultations booked on directory registry files.</p>
                ) : therapistAppointments.map(appt => (
                  <div key={appt._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Patient: {appt.clientId?.name || "Private User"}</h4>
                      <p className="text-xs text-slate-500 mt-1">{new Date(appt.appointmentDate).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2 items-end">
                      <span className={`text-[10px] font-mono px-2 py-1 rounded font-bold uppercase ${appt.sessionStatus === 'Completed' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                        {appt.sessionStatus}
                      </span>
                      {appt.sessionStatus !== 'Completed' && (
                        <div className="flex gap-2">
                          <button onClick={() => generateICS(appt, appt.clientId?.name || "Patient")} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded transition shadow-sm border border-slate-200">
                            📅 Add to Calendar
                          </button>
                          <button onClick={() => navigate(`/room/${appt._id}`)} className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded transition shadow-sm">
                            🎥 Join Video Call
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 flex flex-col h-[420px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Patient Dashboard</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setTherapistInboxTab('chat')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${therapistInboxTab === 'chat' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Live Chat</button>
                  <button onClick={() => setTherapistInboxTab('assessments')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${therapistInboxTab === 'assessments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Assessments</button>
                </div>
              </div>
              
              <div className="flex flex-grow overflow-hidden border border-slate-100 rounded-2xl">
                <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-2 overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-1 ml-1">My Patients</h4>
                  {clients.map((c) => (
                    <div key={c._id} onClick={() => setActiveChatId(c._id)} className={`p-2 border rounded-lg cursor-pointer mb-1 transition ${activeChatId === c._id ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
                      <p className="text-xs font-bold text-emerald-800 truncate">{c.name}</p>
                    </div>
                  ))}
                </div>

                <div className="w-2/3 flex flex-col bg-white relative">
                  {therapistInboxTab === 'chat' && (
                    <>
                      <div className="p-4 overflow-y-auto flex-grow space-y-2 text-sm absolute inset-0 bottom-[60px]">
                        {chatHistory.length === 0 ? <p className="text-xs text-slate-400 italic text-center pt-20">Awaiting broadcast stream...</p> : chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.senderId === loggedInUser.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[140px] px-3 py-2 rounded-2xl text-[11px] font-medium shadow-sm ${msg.senderId === loggedInUser.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                              {msg.message}
                              {msg.image && <img src={msg.image} alt="Attached" className="mt-2 rounded-lg max-w-full h-auto border border-emerald-300" />}
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => handleSendLiveMessage(e, activeChatId)} className="absolute bottom-0 left-0 right-0 p-2 bg-white border-t border-slate-100 flex gap-2 relative">
                        <label className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg cursor-pointer transition border border-slate-200 flex items-center justify-center">
                          📎
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                        <input type="text" placeholder={chatImage ? "Photo attached..." : "Reply..."} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} disabled={!activeChatId} className="flex-grow px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50" />
                        <button type="submit" disabled={!activeChatId} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 rounded-lg shadow-sm transition disabled:opacity-50">Send</button>
                        {chatImage && <div className="absolute -top-4 left-12 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">File Ready</div>}
                      </form>
                    </>
                  )}

                  {therapistInboxTab === 'assessments' && (
                    <div className="p-4 overflow-y-auto flex-grow space-y-3 bg-slate-50/50">
                      {selectedClientAssessments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center pt-20">Patient has not submitted report data parameters.</p>
                      ) : selectedClientAssessments.map(report => (
                        <div key={report._id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                           <span className="text-[10px] font-mono text-slate-400 block font-semibold mb-1">{new Date(report.createdAt).toLocaleString()}</span>
                           <div className="flex gap-2 mb-2">
                             <span className="px-2 py-1 rounded bg-orange-50 text-orange-600 text-[10px] font-bold font-mono border border-orange-100">Stress: {report.stressLevel}/10</span>
                             <span className="px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-bold font-mono border border-red-100">Anxiety: {report.anxietyLevel}/10</span>
                           </div>
                           {report.notes && <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">"{report.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VIEW 3: STANDARD CLIENT DASHBOARD */}
      {/* ========================================== */}
      {loggedInUser.role === 'Client' && (
        <div className="max-w-5xl w-full mt-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col sm:flex-row items-center justify-between border border-slate-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-md">{loggedInUser.name.charAt(0)}</div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Logged in: {loggedInUser.name}</h3>
                <p className="text-xs text-slate-400 font-medium">Session Authorization Status: Secure Client Node</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => setDashTab('therapists')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition duration-150 ${dashTab === 'therapists' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Therapists</button>
              <button onClick={() => setDashTab('chat')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition duration-150 ${dashTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Live Chat</button>
              <button onClick={() => setDashTab('assessment')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition duration-150 ${dashTab === 'assessment' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Assessments</button>
              <button onClick={() => setDashTab('resources')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition duration-150 ${dashTab === 'resources' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Resources</button>
            </div>
            <button onClick={handleLogout} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-xl border border-red-100 transition">Disconnect</button>
          </div>

          <div className="w-full">
            {dashTab === 'therapists' && (
              <div className="space-y-4 animate-fade-in">
                
                {clientAppointments.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">My Upcoming Sessions</h3>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {clientAppointments.map(appt => {
                        const providerInfo = therapists.find(t => t._id === appt.therapistId);
                        const providerName = providerInfo?.userId?.name || "Specialist";
                        const providerRole = providerInfo?.userId?.role || "Professional";

                        return (
                          <div key={appt._id} className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                            <div>
                              <span className={`text-[10px] font-mono px-2 py-1 rounded font-bold uppercase mb-1 inline-block ${appt.sessionStatus === 'Completed' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                                Status: {appt.sessionStatus}
                              </span>
                              <p className="text-sm font-bold text-slate-800 mt-1">Consultation with {providerName}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{providerRole} • {new Date(appt.appointmentDate).toLocaleString()}</p>
                            </div>
                            {appt.sessionStatus !== 'Completed' && (
                              <div className="flex gap-2">
                                <button onClick={() => generateICS(appt, providerName)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition shadow-sm border border-slate-200 flex items-center gap-1">
                                  📅 Save to Calendar
                                </button>
                                <button onClick={() => navigate(`/room/${appt._id}`)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1">
                                  🎥 Join Video Call
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedTherapist && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                    <h4 className="font-bold text-blue-900 text-base">Initialize Booking Block Sequence</h4>
                    <form onSubmit={handleInitiateBooking} className="flex flex-col sm:flex-row gap-3 mt-3">
                      <input type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="bg-white border border-blue-200 px-4 py-2 rounded-xl text-sm focus:outline-none flex-grow" required />
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition shadow-md shadow-blue-100">Proceed to Payment</button>
                    </form>
                  </div>
                )}
                
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 md:mb-0">Medical Specialists Available Online</h3>
                    
                    <div className="flex w-full md:w-auto gap-2">
                      <input type="text" placeholder="Search name or specialty..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 w-full md:w-48" />
                      <input type="number" placeholder="Max Fee (₹)" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 w-full md:w-32" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredTherapists.length === 0 ? (
                      <p className="text-sm text-slate-500 italic col-span-2 text-center py-8">No specialists match your current search filters.</p>
                    ) : (
                      filteredTherapists.map((t) => (
                        <div key={t._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between hover:shadow-md transition">
                          <div>
                            <h4 className="font-bold text-slate-800">{t.userId?.name || "Verified Expert"}</h4>
                            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{t.userId?.role || 'Expert'}</span>
                            <p className="text-xs text-slate-500 mt-2"><span className="font-semibold">Specialization:</span> {t.specialization}</p>
                            <p className="text-xs text-slate-500"><span className="font-semibold">Practice Track:</span> {t.experience} Years Experience</p>
                            <p className="text-xs text-slate-500"><span className="font-semibold">Session Fee:</span> ₹{t.sessionFee}</p>
                          </div>
                          <button onClick={() => setSelectedTherapist(t)} className="w-full mt-4 bg-white text-blue-600 font-bold border border-blue-200 hover:bg-blue-600 hover:text-white py-2 rounded-xl text-xs transition">Schedule Consultation</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {dashTab === 'chat' && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
                <div className="md:col-span-1 border-r border-slate-100 pr-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Channels</h4>
                  {therapists.map((t) => {
                    const targetId = t.userId?._id;
                    if (!targetId) return null; 
                    return (
                      <div key={t._id} onClick={() => setActiveChatId(targetId)} className={`p-3 border rounded-xl cursor-pointer mb-2 transition ${activeChatId === targetId ? 'bg-blue-100 border-blue-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        <p className="text-xs font-bold text-blue-800">{t.userId?.name}</p>
                        <p className="text-[10px] text-slate-400 italic font-medium">Type: {t.userId?.role}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="md:col-span-3 flex flex-col justify-between h-[380px]">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 overflow-y-auto flex-grow space-y-2 text-sm">
                    {chatHistory.length === 0 ? <p className="text-xs text-slate-400 italic text-center pt-24">No dynamic packets distributed yet.</p> : chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.senderId === loggedInUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-2xl text-xs font-medium shadow-sm ${msg.senderId === loggedInUser.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                          {msg.message}
                          {msg.image && <img src={msg.image} alt="Attached" className="mt-2 rounded-lg max-w-full h-auto border border-blue-300" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleSendLiveMessage(e, activeChatId)} className="flex gap-2 mt-3 relative">
                    <label className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-2 rounded-xl cursor-pointer transition border border-slate-200 flex items-center justify-center">
                      📎
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <input type="text" placeholder={chatImage ? "Photo attached..." : "Type message..."} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} disabled={!activeChatId} className="flex-grow px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50" />
                    <button type="submit" disabled={!activeChatId} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50">Send</button>
                    {chatImage && <div className="absolute -top-3 left-10 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">File Ready</div>}
                  </form>
                </div>
              </div>
            )}

            {dashTab === 'assessment' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
               <div className="md:col-span-1 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 h-fit">
                 <h3 className="font-bold text-slate-800 text-base mb-1">Diagnostic Registry</h3>
                 <form onSubmit={handleAssessmentSubmit} className="space-y-4 mt-4">
                   
                   <div>
                     <label className="text-xs font-bold text-slate-600 block mb-1">Direct To Specialist (Optional)</label>
                     <select value={assessmentProvider} onChange={(e) => setAssessmentProvider(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none mb-2 text-slate-700">
                       <option value="">-- Save to General Patient Record --</option>
                       {therapists.map(t => (
                         <option key={t._id} value={t.userId?._id}>
                           {t.userId?.name} ({t.userId?.role})
                         </option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <div className="flex justify-between text-xs font-bold text-slate-600 mb-1"><span>Stress Level</span><span className="text-blue-600 font-mono">[{stressLevel}/10]</span></div>
                     <input type="range" min="1" max="10" value={stressLevel} onChange={(e) => setStressLevel(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer" />
                   </div>
                   <div>
                     <div className="flex justify-between text-xs font-bold text-slate-600 mb-1"><span>Anxiety Level</span><span className="text-blue-600 font-mono">[{anxietyLevel}/10]</span></div>
                     <input type="range" min="1" max="10" value={anxietyLevel} onChange={(e) => setAnxietyLevel(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-600 block mb-1">Notes</label>
                     <textarea rows="3" value={assessmentNotes} onChange={(e) => setAssessmentNotes(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-700" />
                   </div>
                   <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition">Submit Report</button>
                 </form>
               </div>
               <div className="md:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                 <h3 className="text-base font-bold text-slate-800 mb-4">Historical Track</h3>
                 {pastReports.length === 0 ? <p className="text-xs text-slate-400 italic">No previous evaluation records found.</p> : (
                   <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                     {pastReports.map((report) => {
                       const attachedProvider = therapists.find(t => t.userId?._id === report.providerId);
                       
                       return (
                         <div key={report._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between">
                           <div className="space-y-1">
                             <span className="text-[10px] font-mono text-slate-400 block font-semibold">{new Date(report.createdAt).toLocaleString()}</span>
                             {attachedProvider && (
                               <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-max mt-1 mb-2">
                                 Sent to: {attachedProvider.userId?.name}
                               </span>
                             )}
                             {report.notes && <p className="text-xs text-slate-600 italic font-medium">"{report.notes}"</p>}
                           </div>
                           <div className="flex gap-2">
                             <span className="px-2 py-1 rounded bg-orange-50 text-orange-600 text-[10px] font-bold font-mono">Stress: {report.stressLevel}</span>
                             <span className="px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-bold font-mono">Anxiety: {report.anxietyLevel}</span>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
               </div>
             </div>
            )}

            {dashTab === 'resources' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-800 text-white flex flex-col md:flex-row items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black tracking-wide">Wellness Resource Library</h3>
                    <p className="text-slate-400 text-sm mt-2">Curated mental health articles, guided meditations, and self-help guides.</p>
                  </div>
                  <div className="text-5xl opacity-80 mt-4 md:mt-0">🧘‍♀️</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-4 border-b border-slate-100 pb-2">Guided Meditations</h4>
                    <div className="space-y-4">
                      <div className="flex gap-4 items-center p-3 hover:bg-slate-50 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200">
                        <div className="h-16 w-24 bg-blue-100 rounded-lg flex items-center justify-center text-2xl shadow-inner">🌬️</div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-800">5-Minute Breathing Exercise</h5>
                          <p className="text-xs text-slate-500 mt-1">Quick reset for anxiety and stress relief.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center p-3 hover:bg-slate-50 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200">
                        <div className="h-16 w-24 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl shadow-inner">🌙</div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-800">Deep Sleep & Relaxation</h5>
                          <p className="text-xs text-slate-500 mt-1">Guided visualization to help you fall asleep naturally.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-4 border-b border-slate-100 pb-2">Mental Health Articles</h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Cognitive Behavioral Therapy</span>
                        <h5 className="font-bold text-sm text-slate-800 mt-1">Understanding Your Triggers</h5>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">Learn how to identify environmental and emotional triggers before they cause a panic response.</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 transition cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Wellness Tips</span>
                        <h5 className="font-bold text-sm text-slate-800 mt-1">The Mind-Gut Connection</h5>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">How your daily diet impacts your serotonin levels, mood swings, and overall cognitive focus.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;