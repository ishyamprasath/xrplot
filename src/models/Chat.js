import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'model', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // If the message contains structured data or tool calls/responses
  toolCallId: String,
  functionName: String,
  functionArgs: mongoose.Schema.Types.Mixed,
  functionResponse: mongoose.Schema.Types.Mixed,
});

const ChatSchema = new mongoose.Schema({
  clerkUserId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  messages: [MessageSchema],
}, {
  timestamps: true,
});

export default mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
