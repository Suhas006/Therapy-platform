const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // NEW: Securely link this assessment to a specific professional!
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  
  stressLevel: { type: Number, required: true },
  anxietyLevel: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Assessment", assessmentSchema);