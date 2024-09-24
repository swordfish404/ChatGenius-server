import express from 'express';
import ImageKit from 'imagekit';
import cors from 'cors';
import mongoose from 'mongoose';
// import chat from './models/chat.js';
// import userChats from './models/userChats.js';
import 'dotenv/config' ;// To read CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import userChats from './models/userChats.js';
import chat from './models/chat.js';



const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'PUT' ,'POST', 'OPTIONS'],
    credentials: true,
  })
);

// Middleware for accepting JSON from the frontend
app.use(express.json());

// Connecting to MongoDB
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO); // MongoDB connection string
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

console.log('CORS Origin:', process.env.CLIENT_URL);

// Endpoint for image authentication
app.get('/api/upload', (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

// for testing
// app.get("/api/test",ClerkExpressRequireAuth(),(req,res)=>{
//   const userId=req.auth.userId;
//   console.log(userId);
//   res.send("Success!");
// });


// API request to handle chat creation
app.post("/api/chats",ClerkExpressRequireAuth({}), async (req, res) => {
  const userId=req.auth.userId;
  const {text } = req.body;

  // Log request body to check data
  console.log("Request body:", req.body);

  if (!text || text.trim() === "") {
    return res.status(400).send("Text is required");
  }

  try {
    // Creating a new chat entry
    const newChat = new chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }]
    });
    const savedChat = await newChat.save();

    // Check if a user's chat history already exists
    const userchats = await userChats.find({ userId: userId });

    if (!userchats.length) {
      // No existing chats, create a new user chat document
      const newUserChats = new userChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          }
        ]
      });
      await newUserChats.save();
    } else {
      // If chats exist, update the chat array with the new chat
      await userChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            }
          }
        }
      );
    }

    res.status(201).send(newChat._id);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat! Check logs.");
  }
});


// creating one endpoint again
app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  try {
    const userChatsData = await userChats.find({ userId }); // Renamed to avoid conflict
    if (userChatsData.length === 0) {
      return res.status(200).send([]); // Send an empty array if no chats exist
    }
    res.status(200).send(userChatsData[0].chats);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error retrieving user chats!");
  }
});

// creating another end point
app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const Chat = await chat.findOne({ _id: req.params.id, userId });
    // console.log(chat)8563

    res.status(200).send(Chat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }
});


// error handler from clerk
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(401).send('Unauthenticated!')
})


// Start the server
app.listen(port, () => {
  connect();
  console.log(`Server is running on port ${port}`);
});
