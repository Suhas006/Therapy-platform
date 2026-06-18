import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

function VideoRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false); // NEW: Sprint C
  const [isRecording, setIsRecording] = useState(false); // NEW: Sprint C
  const [sessionTime, setSessionTime] = useState(0);
  const [peerConnected, setPeerConnected] = useState(false);

  const userVideoRef = useRef();
  const remoteVideoRef = useRef();
  const socketRef = useRef();
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null); // NEW: Sprint C
  const recordedChunksRef = useRef([]); // NEW: Sprint C

  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  };

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (userVideoRef.current) userVideoRef.current.srcObject = stream;

        socketRef.current.emit("join_video_room", appointmentId);

        socketRef.current.on("user_joined_video", async () => {
          const pc = createPeerConnection();
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit("video_offer", { roomId: appointmentId, offer });
          } catch (err) { console.error("Error creating offer:", err); }
        });

        socketRef.current.on("video_offer", async (offer) => {
          const pc = createPeerConnection();
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit("video_answer", { roomId: appointmentId, answer });
          } catch (err) { console.error("Error handling offer:", err); }
        });

        socketRef.current.on("video_answer", async (answer) => {
          if (peerConnectionRef.current) {
            try { await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer)); } 
            catch (err) { console.error("Error setting remote description:", err); }
          }
        });

        socketRef.current.on("video_ice_candidate", async (candidate) => {
          if (peerConnectionRef.current && candidate) {
            try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } 
            catch (err) { console.error("Error adding ICE candidate:", err); }
          }
        });
      })
      .catch(err => alert("Camera access denied or unavailable."));

    socketRef.current.on("session_ended", () => {
      alert("The medical professional has safely ended this session.");
      navigate('/dashboard');
    });

    const timer = setInterval(() => setSessionTime((prev) => prev + 1), 1000);

    return () => {
      clearInterval(timer);
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
  }, [appointmentId, navigate]);

  const createPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setPeerConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) socketRef.current.emit("video_ice_candidate", { roomId: appointmentId, candidate: event.candidate });
    };

    return pc;
  };

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  // ==========================================
  // SPRINT C: SCREEN SHARING
  // ==========================================
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace the camera track with the screen track for the peer connection
        const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
        sender.replaceTrack(screenTrack);
        userVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);

        // When the user stops sharing via the browser UI popup
        screenTrack.onended = () => {
          const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
          sender.replaceTrack(originalVideoTrack);
          userVideoRef.current.srcObject = localStreamRef.current;
          setIsScreenSharing(false);
        };
      } catch (err) { console.error("Screen sharing failed", err); }
    } else {
      // Revert manually
      const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
      sender.replaceTrack(originalVideoTrack);
      userVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    }
  };

  // ==========================================
  // SPRINT C: SESSION RECORDING
  // ==========================================
  const toggleRecording = () => {
    if (!isRecording) {
      recordedChunksRef.current = [];
      const stream = remoteVideoRef.current.srcObject || localStreamRef.current; // Record the remote peer if connected, else local
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Therapy_Session_${appointmentId}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const leaveCall = async () => {
    const userString = localStorage.getItem("user");
    if (userString) {
      const user = JSON.parse(userString);
      if (user.role === 'Therapist' || user.role === 'Counselor') {
        try {
          await axios.put(`http://localhost:5000/api/appointments/${appointmentId}`, { sessionStatus: 'Completed' });
          socketRef.current.emit("end_video_session", appointmentId);
        } catch (err) { console.error("Failed to close room securely."); }
      }
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 w-full flex flex-col fixed inset-0 z-50">
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full animate-pulse ${isRecording ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
          <h2 className="font-bold tracking-wider hidden sm:inline">
            {isRecording ? 'RECORDING IN PROGRESS' : 'SECURE VIRTUAL CONSULTATION'}
          </h2>
          <span className="text-xs text-slate-400 font-mono ml-2 hidden md:inline">ID: {appointmentId}</span>
        </div>
        <div className="bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-700 font-mono font-bold text-emerald-400">
          {Math.floor(sessionTime / 60).toString().padStart(2, '0')}:{(sessionTime % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="flex-grow p-6 flex flex-col md:flex-row items-center justify-center gap-6">
        <div className="w-full md:w-2/3 h-[40vh] md:h-[70vh] bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden relative shadow-2xl flex items-center justify-center">
          {!peerConnected && <p className="text-slate-500 font-mono text-sm absolute z-10 animate-pulse">Waiting for peer connection via WebRTC...</p>}
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover z-20" />
        </div>

        <div className="w-full md:w-1/3 h-[30vh] md:h-[70vh] bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden relative shadow-2xl">
          {isVideoOff && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center z-30">
              <span className="text-white bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold">Camera Paused</span>
            </div>
          )}
          <video ref={userVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover z-20 ${!isScreenSharing ? 'transform scale-x-[-1]' : ''}`} />
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-xs font-bold backdrop-blur-sm z-40">
            {isScreenSharing ? 'Sharing Screen' : 'You (Local)'}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border-t border-slate-800 p-6 flex flex-wrap justify-center gap-4">
        <button onClick={toggleAudio} className={`h-12 w-12 rounded-full flex items-center justify-center transition shadow-lg ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>{isMuted ? '🔇' : '🎤'}</button>
        <button onClick={toggleVideo} className={`h-12 w-12 rounded-full flex items-center justify-center transition shadow-lg ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>{isVideoOff ? '📷❌' : '📷'}</button>
        <button onClick={toggleScreenShare} className={`h-12 px-4 rounded-xl flex items-center justify-center transition shadow-lg font-bold text-xs ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>💻 Share</button>
        <button onClick={toggleRecording} className={`h-12 px-4 rounded-xl flex items-center justify-center transition shadow-lg font-bold text-xs ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>⏺️ {isRecording ? 'Stop' : 'Record'}</button>
        <button onClick={leaveCall} className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-900/50 ml-auto">End</button>
      </div>
    </div>
  );
}

export default VideoRoom;