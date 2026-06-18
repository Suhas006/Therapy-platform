const express = require("express");
const router = express.Router();
const { submitAssessment, getAssessments } = require("../controllers/assessmentController");

router.post("/", submitAssessment);
router.get("/", getAssessments);

module.exports = router;