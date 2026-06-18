const Assessment = require("../models/Assessment");

const submitAssessment = async (req, res) => {
  try {
    const { userId, stressLevel, anxietyLevel, notes, providerId } = req.body;
    
    const newReport = new Assessment({
      userId,
      stressLevel,
      anxietyLevel,
      notes,
      providerId: providerId || null // Save the specific doctor's ID if provided
    });
    
    await newReport.save();
    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAssessments = async (req, res) => {
  try {
    const { userId, providerId } = req.query;

    let query = { userId };

    // NEW SECURITY FILTER: If a professional is requesting the data, 
    // ONLY show Global notes (null) OR notes explicitly sent to them!
    if (providerId) {
      query.$or = [
        { providerId: null },
        { providerId: { $exists: false } },
        { providerId: providerId }
      ];
    }

    const reports = await Assessment.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { submitAssessment, getAssessments };