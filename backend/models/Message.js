const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String },
  
  // ADD THIS LINE SO MONGODB CAN SAVE THE PHOTO:
  image: { type: String, default: null },

}, { timestamps: true });
module.exports = mongoose.model("Message", messageSchema);