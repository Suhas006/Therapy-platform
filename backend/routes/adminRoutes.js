const express = require('express');
const router = express.Router();

// The curly braces {} here are MANDATORY to prevent the "handler must be a function" crash!
const { getAdminStats, approveTherapist, banTherapist } = require('../controllers/adminController');

router.get('/stats', getAdminStats);
router.put('/therapists/:id/approve', approveTherapist);
router.delete('/therapists/:id/ban', banTherapist);

module.exports = router;