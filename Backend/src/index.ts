import dotenv from 'dotenv';
dotenv.config();
import { jwtSecret } from './config.js'
import { dbConnection, roomMemberModel, RoomModel, UserModel, MessageModel } from './db.js'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser';
import crypto from 'crypto'
import { z } from 'zod'
import mongoose from 'mongoose';
import bcrypt from 'bcrypt'
import { initSockets } from './socketio.js';
import { authmiddleware } from './authmiddle.js';
import http from 'http';
import { Server } from 'socket.io';
import { decryptText } from './cryptoUtils.js';
import axios from 'axios';
const PORT = process.env.PORT || 3000;

const app = express()
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true, methods: ["GET", "POST"] }
});

initSockets(io);




//routes here
app.post('/api/v1/signin', async (req, res) => {

    const reqbody = z.object({
        username: z.string().min(3).max(30),
        password: z.string().min(6).max(30)
    })
    const parseBody = reqbody.safeParse(req.body)
    if (!parseBody.success) {
        return res.status(403).json({
            message: "zod error: ",
            error: parseBody.error
        })
    }
    const username = req.body.username
    const password = req.body.password

    const hashedpassword = await bcrypt.hash(password, 5)
    try {
        const user = await UserModel.create({
            username,
            password: hashedpassword
        })
        if (user) {
            return res.status(201).json({
                message: "signedin ;) "
            })
        }
        return res.status(402).json({
            message: 'user already exists :('
        })
    } catch (e) {
        return res.status(500).json({
            error: "some erorr " + e
        })
    }
})

app.post('/api/v1/login', async (req, res) => {
    const reqbody = z.object({
        username: z.string().min(4).max(40),
        password: z.string().min(6).max(30)
    })
    const parseBody = reqbody.safeParse(req.body)
    if (!parseBody.success) {
        return res.status(403).json({
            message: "zod error: ",
            error: parseBody.error
        })
    }
    const { username, password } = req.body
    try {
        const user = await UserModel.findOne({
            username
        })
        if (!user) {
            return res.status(403).json({
                message: "incorrect username or password"
            })
        }
        const passwordVerfinaiton = await bcrypt.compare(password, user.password)
        if (passwordVerfinaiton) {
            const token = jwt.sign({
                id: user._id
            }, jwtSecret, { expiresIn: '7d' })
            res.cookie("token", token, {
                httpOnly: true,
                sameSite: "none",
                secure: true,
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            })
            return res.json({
                sucess: true,
                token: token
            })
        }
        else {
            return res.status(403).json({
                message: "incorrect username or password :( "
            })
        }
    } catch (e) {
        return res.status(403).json({
            error: "some error " + e
        })
    }
})

app.get('/api/v1/me', authmiddleware, async (req, res) => {
    const userId = (req as any).userId;
    try {
        const user = await UserModel.findById(userId).select('username');
        if (!user) {
            return res.status(404).json({ error: "User profile not found" });
        }

        return res.json({
            _id: userId,
            username: user.username
        });
    } catch (e) {
        return res.status(500).json({ error: "Server error checking session context" });
    }
});

app.get('/api/v1/logout', async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            sameSite: "none",
            secure: true,   //🔴 true in production (HTTPS)
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
        return res.status(201).json({
            message: "logout out sucessfully :)"
        })
    } catch (e) {
        return res.status(403).json({
            error: "some error occured : ("
        })
    }
})


app.post('/api/v1/rooms', authmiddleware, async (req, res) => {
    const userId = (req as any).userId
    const roomCode = crypto.randomBytes(5).toString('hex') //gernating the id for the room if the room id is not in the db
    const name = req.body.name // entering the name of the room 
    try {
        const room = await RoomModel.create({
            name,
            roomCode,
            createdBy: userId
        })
        await roomMemberModel.create({
            userId,
            roomId: room._id
        })
        return res.status(201).json({
            roomCode: room.roomCode
        })
    } catch (e) {
        return res.status(502).json({
            error: "some error occured: " + e
        })
    }
})

app.get('/api/v1/rooms', authmiddleware, async (req, res) => {
    const userId = (req as any).userId;
    try {
        const memberships = await roomMemberModel.find({ userId });
        const roomIds = memberships.map(member => member.roomId);
        const userRooms = await RoomModel.find({
            $or: [
                { _id: { $in: roomIds } },    // Rooms the user joined
                { createdBy: userId }         // Rooms the user created
            ]
        });

        // Return an empty array instead of 404 so Axios doesn't crash on new accounts!
        if (userRooms.length === 0) {
            return res.json({ rooms: [] });
        }

        return res.json({ rooms: userRooms });
    } catch (e) {
        console.error("Error fetching user rooms:", e);
        return res.status(500).json({
            error: "Error fetching rooms from database"
        });
    }
});


app.post('/api/v1/rooms/join', authmiddleware, async (req, res) => {
    const userId = (req as any).userId
    const { roomCode } = req.body
    try {
        const room = await RoomModel.findOne({
            roomCode
        })
        if (!room) {
            return res.status(200).json({
                sucess: false,
                error: "no room ID"
            })
        }
        const existing = await roomMemberModel.findOne({
            userId, roomId: room._id
        })
        if (existing) {
            return res.status(200).json({
                sucess: true,
                message: "youre already in :) "
            })
        }
        await roomMemberModel.create({
            userId,
            roomId: room._id
        })

        return res.status(201).json({
            success: true,
            message: "your In baby :)"
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            error: "some error occured :( " + e
        })
    }
})

//created the get messages long pooling 
app.get('/api/v1/chat/:roomCode', authmiddleware, async (req: any, res: any) => {
    try {
        const { roomCode } = req.params;
        const room = await RoomModel.findOne({ roomCode: roomCode as any });
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }
        if (!mongoose.Types.ObjectId.isValid(room._id)) {
            return res.status(400).json({ message: "Invalid Room ID structure" });
        }
        const messages = await MessageModel.find({ roomId: room._id })
            .populate('senderId', 'username')
            .sort({ createdAt: 1 });
        const decryptedMessages = await Promise.all(messages.map(async (msg: any) => {
            let rawContent = decryptText(msg.content);

            // Check if the decrypted content indicates an encrypted attachment link
            if (rawContent.startsWith('MEDIA_LINK:')) {
                try {
                    const cloudinaryUrl = rawContent.replace('MEDIA_LINK:', '');

                    // Fetch the scrambled text string back from Cloudinary
                    const cloudRes = await axios.get(cloudinaryUrl);

                    // Decrypt the Cloudinary text asset content back into the clear Base64 string
                    rawContent = `MEDIA_LINK:${decryptText(cloudRes.data)}`;
                } catch (mediaErr) {
                    console.error("Failed downloading/decrypting Cloudinary asset:", mediaErr);
                    rawContent = "[Secure Media Unreachable]";
                }
            }
            return {
                _id: msg._id,
                createdAt: msg.createdAt,
                senderId: msg.senderId,
                content: rawContent
            };
        }));
        return res.json({
            roomName: room.name,
            roomId: room._id,
            messages: decryptedMessages
        });
    } catch (error: any) {
        return res.status(500).json({
            message: "Server error",
            error: error?.message || "Unknown error"
        });
    }
});

app.delete('/api/v1/rooms/:roomCode', authmiddleware, async (req: any, res: any) => {
    try {
        const { roomCode } = req.params;
        const currentUserId = req.userId; // Provided by your verification cookie middleware

        const room = await RoomModel.findOne({ roomCode });
        if (!room) {
            return res.status(404).json({ success: false, message: "Target room not found" });
        }
        const memberCount = await roomMemberModel.countDocuments({ roomId: room._id });

        if (memberCount <= 1) {
            await MessageModel.deleteMany({ roomId: room._id });
            await roomMemberModel.deleteMany({ roomId: room._id });
            await RoomModel.findByIdAndDelete(room._id);

            return res.json({
                success: true,
                permanentlyDeleted: true,
                message: "Last member left. Room and messages completely purged from database."
            });
        } else {
            await roomMemberModel.deleteOne({ roomId: room._id, userId: currentUserId });

            return res.json({
                success: true,
                permanentlyDeleted: false,
                message: "Room removed from your dashboard list view layout."
            });
        }
    } catch (error: any) {
        console.error("Deletion lifecycle failure:", error);
        return res.status(500).json({ success: false, message: "Server deletion error", error: error.message });
    }
});


//db connection and port here 
dbConnection()
server.listen(PORT, () => console.log("Server active on port" + PORT));


