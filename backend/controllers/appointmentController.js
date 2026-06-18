const Appointment = require("../models/Appointment");
const Therapist = require("../models/Therapist");

const bookAppointment = async (req, res) => {
  try {
    const { clientId, therapistId, appointmentDate } = req.body;
    const newAppt = new Appointment({ clientId, therapistId, appointmentDate, sessionStatus: "Pending" });
    await newAppt.save();
    res.status(201).json({ success: true, message: "Appointment booked successfully", appointment: newAppt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAppointments = async (req, res) => {
  try {
    const { therapistUserId, clientId } = req.query;

    // NEW: If requested by a Patient/Client
    if (clientId) {
      const appointments = await Appointment.find({ clientId }).sort({ appointmentDate: 1 });
      return res.status(200).json({ success: true, appointments });
    }

    // EXISTING: If requested by a Therapist/Counselor
    const therapist = await Therapist.findOne({ userId: therapistUserId });
    if (!therapist) return res.status(200).json({ success: true, appointments: [] });

    const appointments = await Appointment.find({ therapistId: therapist._id })
      .populate("clientId", "name email")
      .sort({ appointmentDate: 1 });

    res.status(200).json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
const updateAppointment = async (req, res) => {
  try {
    const updatedAppt = await Appointment.findByIdAndUpdate(
      req.params.id, 
      { sessionStatus: req.body.sessionStatus }, 
      { new: true }
    );
    res.status(200).json({ success: true, appointment: updatedAppt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Don't forget to export it! Update your exports to look like this:
module.exports = { bookAppointment, getAppointments, updateAppointment };

