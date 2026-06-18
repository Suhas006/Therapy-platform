const mongoose = require("mongoose");

const orgSchema = new mongoose.Schema({
  name: { type: String, required: true },
  clinicAddress: { type: String },
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The Clinic Manager
  therapists: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // Array of doctors
}, { timestamps: true });

module.exports = mongoose.model("Organization", orgSchema);