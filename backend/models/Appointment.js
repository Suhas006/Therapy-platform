const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Therapist",
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  sessionStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
    default: "Pending"
  },
  videoLink: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);