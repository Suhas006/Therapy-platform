const express = require("express");
const router = express.Router();
const { bookAppointment, getAppointments, updateAppointment } = require("../controllers/appointmentController");

router.post("/", bookAppointment);
router.get("/", getAppointments); // <--- NEW ROUTE OPENED
router.put("/:id", updateAppointment); // <--- ADD THIS LINE

module.exports = router;