const express = require("express");
const router = express.Router();
const { saveMessage, getChatHistory } = require("../controllers/messageController");

router.post("/", saveMessage);
router.get("/", getChatHistory);

module.exports = router;