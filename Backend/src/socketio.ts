import { Server, Socket } from 'socket.io';
import { MessageModel } from './db.js';
import { encryptText } from './cryptoUtils.js';
import cloudinary from "./cloudinary.js"

interface SendMessagePayload {
    roomId: string;
    senderId: string;
    content: string;
    username: string;
    fileData?: string;
    fileName?: string;
}
const activeRoomUsers: Record<string, Record<string, string>> = {};

export function initSockets(io: Server) {
    io.on('connection', (socket: Socket) => {

        socket.on('join_room', (data: { roomId: string; username: string }) => {
            const { roomId, username } = data;
            socket.join(roomId);

            if (!activeRoomUsers[roomId]) activeRoomUsers[roomId] = {};
            activeRoomUsers[roomId][socket.id] = username;

            io.to(roomId).emit('room_users_update', Object.values(activeRoomUsers[roomId]));
            console.log(`${username} joined room: ${roomId}`);
        });

        socket.on('send_message', async (data: SendMessagePayload) => {
            const { roomId, senderId, content, username, fileData, fileName } = data;
            try {
                let finalContent = encryptText(content);
                let liveUiContent = content;

                if (fileData) {
                    console.log(`Encrypting attachment: ${fileName}`);

                    // 1. Encrypt the entire raw Base64 data string
                    const encryptedFileString = encryptText(fileData);

                    // 2. Upload the scrambled text string to Cloudinary as a text asset
                    const uploadRes = await cloudinary.uploader.upload(`data:text/plain;base64,${Buffer.from(encryptedFileString).toString('base64')}`, {
                        resource_type: 'raw',
                        public_id: `encrypted_chats/${Date.now()}_${fileName}.enc`
                    });

                    // 3. Set the message content to the secure link of the encrypted file
                    finalContent = encryptText(`MEDIA_LINK:${uploadRes.secure_url}`);
                    liveUiContent = `MEDIA_LINK:${fileData}`; // Pass back live raw data for instant rendering
                }
                const newMessage = new MessageModel({
                    roomId,
                    senderId,
                    content: finalContent
                });
                await newMessage.save();
                io.to(roomId).emit('receive_message', {
                    _id: newMessage._id.toString(),
                    content: liveUiContent,
                    senderId: { _id: senderId, username }
                });

            } catch (err) {
                console.error("Failed to save message:", err);
            }
        });
        socket.on('typing_start', (data: { roomId: string; username: string }) => {
            socket.to(data.roomId).emit('user_typing', { username: data.username, isTyping: true });
        });

        socket.on('typing_stop', (data: { roomId: string }) => {
            socket.to(data.roomId).emit('user_typing', { isTyping: false });
        });
        socket.on('disconnect', () => {
            for (const roomId of socket.rooms) {
                if (activeRoomUsers[roomId] && activeRoomUsers[roomId][socket.id]) {
                    const username = activeRoomUsers[roomId][socket.id];
                    delete activeRoomUsers[roomId][socket.id];

                    // Inform remaining users that someone left and typing stopped
                    socket.to(roomId).emit('user_typing', { isTyping: false });
                    io.to(roomId).emit('room_users_update', Object.values(activeRoomUsers[roomId]));
                }
            }
            console.log('User disconnected');
        });
    });
}
