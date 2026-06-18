const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getClients, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser); 
router.get('/clients', getClients);

// Our two new OTP routes!
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;