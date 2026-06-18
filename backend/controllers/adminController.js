const Therapist = require('../models/Therapist');
const User = require('../models/User'); 
const Appointment = require('../models/Appointment'); 

// 1. Fetch Top Stats for Dashboard
const getAdminStats = async (req, res) => {
  try {
    const totalClients = await User.countDocuments({ role: 'Client' });
    const totalTherapists = await Therapist.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ sessionStatus: 'Pending' });

    res.status(200).json({
      success: true,
      stats: { totalClients, totalTherapists, pendingAppointments, totalUsers: totalClients + totalTherapists }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Approve Therapist permanently
const approveTherapist = async (req, res) => {
  try {
    await Therapist.findByIdAndUpdate(req.params.id, { isApproved: true });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Decline/Ban Therapist permanently
const banTherapist = async (req, res) => {
  try {
    await Therapist.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAdminStats, approveTherapist, banTherapist };