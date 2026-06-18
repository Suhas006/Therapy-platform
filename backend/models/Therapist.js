const mongoose = require("mongoose");


const therapistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  specialization: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    required: true,
  },
  sessionFee: {
    type: Number,
    required: true,
  },
  availability: {
    type: Array,
    default: [],
  },
  // Add this inside your Therapist schema
  isApproved: {
     type: Boolean,
      default: false,
     },
  
}, { timestamps: true });


module.exports = mongoose.model("Therapist", therapistSchema);