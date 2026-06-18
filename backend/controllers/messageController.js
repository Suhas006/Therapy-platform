const Message = require("../models/Message");

const saveMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    const newMsg = new Message({ senderId, receiverId, message });
    await newMsg.save();
    res.status(201).json({ success: true, chat: newMsg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;
    const history = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { saveMessage, getChatHistory };