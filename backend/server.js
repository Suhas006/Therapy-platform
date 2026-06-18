require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();

// Create an HTTP Server wrapper required for Socket.io integration
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
// Import Routes
const authRoutes = require("./routes/authRoutes");
const therapistRoutes = require("./routes/therapistRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const messageRoutes = require("./routes/messageRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Ensure these lines exist exactly like this in your server.js
// If they are missing, add them!
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/therapists", require("./routes/therapistRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/assessments", require("./routes/assessmentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes")); // Make sure this is here

// Socket.io Real-Time Connection Engine
io.on("connection", (socket) => {
  console.log(`WebSocket Connected: ${socket.id}`);

  // --- TEXT CHAT SIGNALING ---
  socket.on("join_room", (userId) => {
    socket.join(userId);
  });

  socket.on("send_message", (data) => {
    io.to(data.receiverId).emit("receive_message", data);
  });
  // SPRINT B: Typing Indicators
  socket.on("typing", (data) => {
    // data = { senderId, receiverId }
    socket.to(data.receiverId).emit("user_typing", data.senderId);
  });

  socket.on("stop_typing", (data) => {
    socket.to(data.receiverId).emit("user_stopped_typing", data.senderId);
  });

  // --- NEW: WEBRTC VIDEO SIGNALING ---
  socket.on("join_video_room", (roomId) => {
    socket.join(roomId);
    // Tell the other person in the room that someone just joined
    socket.to(roomId).emit("user_joined_video");
  });

  socket.on("video_offer", (data) => {
    socket.to(data.roomId).emit("video_offer", data.offer);
  });

  socket.on("video_answer", (data) => {
    socket.to(data.roomId).emit("video_answer", data.answer);
  });

  socket.on("video_ice_candidate", (data) => {
    socket.to(data.roomId).emit("video_ice_candidate", data.candidate);
  });
  
  socket.on("end_video_session", (roomId) => {
    // When the doctor ends the call, tell everyone else in the room to leave
    socket.to(roomId).emit("session_ended");
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected from communication socket.");
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected successfully!"))
  .catch((error) => console.error("Database connection failed:", error.message));

app.get("/", (req, res) => {
  res.send("Online Therapy Platform API with WebSockets running!");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Socket & API Server is running on port ${PORT}`);
});