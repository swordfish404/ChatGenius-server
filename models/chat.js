// for storing the chat with unique id
import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  // each chat will have a id
  userId: {
    type: String,
    required: true,
  },

  // every chat will have history
  history: [
    {
      role: {
        type: String,
        enum: ["user", "model"], //chat can be either from user or from gemini mode

        required: true,
      },
      parts: [
        {
          text: {
            type: String,
            required: true,
          },
          // for image history but images will not be in history
          img: {
            type: String,
            required: false,
          },
        },
      ],
    },
  ],
}, { timestamps: true });

export default mongoose.models.Chat || mongoose.model('Chat', chatSchema);
