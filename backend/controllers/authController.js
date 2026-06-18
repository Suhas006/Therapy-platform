const User = require('../models/User');
const Therapist = require('../models/Therapist'); // <-- 1. NEW IMPORT ADDED HERE
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

// ==========================================
// REGISTER USER
// ==========================================
const registerUser = async (req, res) => {
  try {
    // <-- 2. ADDED specialization AND sessionFee TO THIS LINE
    const { name, email, password, role, phone, specialization, sessionFee } = req.body; 
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the base User
    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      role: role || 'Client',
      phone: phone || ''
    });

    // <-- 3. NEW LOGIC: CREATE THERAPIST PROFILE AUTOMATICALLY
    if (role === 'Therapist' || role === 'Counselor') {
      await Therapist.create({
        userId: user._id, 
        specialization: specialization || 'General Practice',
        experience: 0,
        sessionFee: sessionFee || 500,
        isApproved: false // Admin must approve them!
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });

    res.status(201).json({ 
      success: true, 
      token, 
      user: { id: user._id, name: user.name, role: user.role, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// LOGIN USER
// ==========================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
    
    res.status(200).json({ 
      success: true, 
      token, 
      user: { id: user._id, name: user.name, role: user.role, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// GET CLIENTS (For Therapist Dashboard)
// ==========================================
const getClients = async (req, res) => {
  try {
    const clients = await User.find({ role: 'Client' }).select('-password');
    res.status(200).json({ success: true, clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FORGOT PASSWORD - PROFESSIONAL SMTP
// ==========================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 1. Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save it to the database (Expires in 10 minutes)
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
// 3. The Bulletproof SMTP Setup
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', // Hardcoded safely (Google's server never changes)
      port: 465,              // Hardcoded safely
      secure: true,
      auth: {
        user: process.env.SMTP_USER, // Hidden securely in your .env file
        pass: process.env.SMTP_PASS  // Hidden securely in your .env file
      }
    });

    // 4. Send the email professionally
    await transporter.sendMail({
      from: `"Therapy Platform Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Your Password Reset Code 🔐",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Password Reset Request</h2>
          <p style="color: #475569;">Your secure 6-digit verification code is:</p>
          <h1 style="color: #2563eb; letter-spacing: 5px; font-size: 36px; background: #f8fafc; padding: 15px; border-radius: 8px;">${otp}</h1>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `
    });

    res.status(200).json({ success: true, message: "OTP sent to your email!" });
  } catch (error) {
    console.error("Mail Error:", error);
    res.status(500).json({ success: false, message: "Error sending email", error: error.message });
  }
};

// ==========================================
// VERIFY OTP & RESET PASSWORD
// ==========================================
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    // Find user with matching email, matching OTP, and check if time is greater than now
    const user = await User.findOne({ 
      email, 
      resetPasswordOtp: otp, 
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired OTP." });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear the OTP from the database so it can't be used again
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = { registerUser, loginUser, getClients, forgotPassword, resetPassword };