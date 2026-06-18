const express = require("express");
const router = express.Router();
const { getTherapists, createTherapistProfile } = require("../controllers/therapistController");

// GET /api/therapists - Get list of therapists
router.get("/", getTherapists);

// POST /api/therapists - Create a therapist profile
router.post("/", createTherapistProfile);

module.exports = router;