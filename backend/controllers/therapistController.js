const Therapist = require("../models/Therapist");

// Fetch all therapists AND counselors
const getTherapists = async (req, res) => {
  try {
    // FIX: We added "role" to the populate list so the frontend can see who is a Counselor!
    const therapists = await Therapist.find().populate("userId", "name email role");
    
    res.status(200).json({ success: true, count: therapists.length, therapists });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new therapist profile (Useful for setting up our database)
const createTherapistProfile = async (req, res) => {
  try {
    const { userId, specialization, experience, sessionFee, availability } = req.body;

    const newTherapist = new Therapist({
      userId,
      specialization,
      experience,
      sessionFee,
      availability
    });

    await newTherapist.save();
    res.status(201).json({ success: true, therapist: newTherapist });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getTherapists, createTherapistProfile };