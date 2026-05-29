import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Backend } from '../config';
import imageCompression from 'browser-image-compression';

interface Message {
    _id: string;
    content: string;
    senderId: {
        _id: string;
        username: string;
    };
}

interface RoomInfo {
    id: string;
    name: string;
}

interface UserInfo {
    id: string;
    username: string;
}

const socket: Socket = io(import.meta.env.VITE_BACKEND_KEY || 'http://localhost:3000', {
    autoConnect: false,
    withCredentials: true
});

export function Chatpage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [roomInfo, setRoomInfo] = useState<RoomInfo>({ id: '', name: '' });
    const [user, setUser] = useState<UserInfo>({ id: '', username: '' });
    const [isRoomOnline, setIsRoomOnline] = useState<boolean>(false);
    const [typingStatus, setTypingStatus] = useState<{ isTyping: boolean; username?: string }>({ isTyping: false });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [selectedFile, setSelectedFile] = useState<{ data: string; name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const initializeChat = async () => {
            try {
                // 1. Get logged-in user data from your session cookie
                const userRes = await axios.get(Backend + '/api/v1/me', {
                    withCredentials: true
                });
                setUser({ id: userRes.data._id, username: userRes.data.username });

                const chatRes = await axios.get(`${Backend}/api/v1/chat/${roomCode}`, {
                    withCredentials: true
                });
                setRoomInfo({ id: chatRes.data.roomId, name: chatRes.data.roomName });
                setMessages(chatRes.data.messages);
                socket.emit('join_room', {
                    roomId: chatRes.data.roomId,
                    username: userRes.data.username
                });

                socket.connect();
                socket.emit('join_room', chatRes.data.roomId);

            } catch (err) {
                console.error("Initialization error:", err);
            }
        };

        initializeChat();
        socket.on('receive_message', (newMessage: Message) => {
            setMessages((prev) => [...prev, newMessage]);

            if (document.hidden && Notification.permission === "granted") {
                new Notification(`New message from @${newMessage.senderId.username}`, {
                    body: newMessage.content,
                });
            }
        });
        socket.on('room_users_update', (onlineUsers: string[]) => {
            setIsRoomOnline(onlineUsers.length > 1);
        });

        // Listen for typing signals
        socket.on('user_typing', (data: { username?: string; isTyping: boolean }) => {
            setTypingStatus({ isTyping: data.isTyping, username: data.username });
        });

        return () => {
            socket.off('receive_message');
            socket.off('room_users_update');
            socket.off('user_typing');
            socket.disconnect();
        };
    }, [roomCode]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingStatus]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInput(newValue);

        if (!user.username || !roomInfo.id) return;

        if (newValue.trim().length === 1) {
            socket.emit('typing_start', { roomId: roomInfo.id, username: user.username });
        }

        if (newValue.trim().length === 0) {
            socket.emit('typing_stop', { roomId: roomInfo.id });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            return;
        }


        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing_stop', { roomId: roomInfo.id });
        }, 2000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('data:image/') || file.type.includes('image')) {
            console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

            const options = {
                maxSizeMB: 1,          // Compress down to under 1MB max
                maxWidthOrHeight: 1280, // Resize width/height to maximum 1280px (keeps it HD)
                useWebWorker: true     // Runs compression in background thread so UI doesn't freeze
            };

            try {
                //compressed Blob object
                const compressedBlob = await imageCompression(file, options);
                file = compressedBlob as File;
                console.log(`Compressed size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            } catch (compressionError) {
                console.error("Compression failed, falling back to original file:", compressionError);
            }
        }

        // Reject files larger than 2MB to prevent overloading socket buffers
        if (file.size > 2 * 1024 * 1024) {
            alert("File size limit is 4MB for secure transmission.");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file); // Converts image/video/doc to a clear Base64 string
        reader.onloadend = () => {
            setSelectedFile({
                data: reader.result as string,
                name: file.name
            });
        };
    };


    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.id) return;
        if (!input.trim() && !selectedFile) return;

        socket.emit('send_message', {
            roomId: roomInfo.id,
            senderId: user.id,
            username: user.username,
            content: selectedFile ? `Sent an attachment: ${selectedFile.name}` : input,
            fileData: selectedFile?.data,
            fileName: selectedFile?.name
        });

        setInput('');
        setSelectedFile(null);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center font-mono text-white p-5">
            <div className="w-full max-w-[850px] flex flex-col gap-3">
                {/* Title header bar */}
                <div className="flex justify-between items-center px-2">
                    <h1 className="text-2xl font-bold italic tracking-wide">Messaging</h1>
                    <button
                        onClick={() => navigate('/mainpage')} // Adjust route path to your main landing path string
                        className="border border-zinc-700 bg-[#111] hover:bg-zinc-900 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all active:scale-95"
                    >
                        &larr; Leave Room
                    </button>
                </div>

                {/* Main black terminal display box */}
                <div className="bg-black border-2 border-[#222] rounded-2xl p-6 h-[600px] flex flex-col shadow-2xl">

                    {/* Top Status Indicators */}
                    <div className="flex justify-between items-center mb-5">
                        <span className="border border-[#444] rounded-full px-4 py-1.5 text-xs bg-[#111] text-gray-400">
                            Room: {roomInfo.name || roomCode}
                        </span>
                        <span className={`border rounded-full px-4 py-1.5 text-xs bg-[#111] transition-colors duration-300 ${isRoomOnline
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-zinc-700 text-zinc-500'
                            }`}>
                            {user.username ? `@${user.username}` : 'Connecting...'}
                            <span className="ml-1.5">{isRoomOnline ? '• Online' : '• Offline'}</span>
                        </span>
                    </div>

                    {/* Messages scrolling list area */}
                    <div className="flex-1 overflow-y-auto pr-2 mb-6 flex flex-col gap-3.5 scrollbar-thin scrollbar-thumb-zinc-800">
                        {messages.map((msg) => {
                            const isMe = msg.senderId?._id === user.id;
                            const isMedia = msg.content.startsWith('MEDIA_LINK:');
                            const mediaSrc = isMedia ? msg.content.replace('MEDIA_LINK:', '') : '';
                            return (
                                <div
                                    key={msg._id}
                                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`border rounded-xl p-3 max-w-[70%] break-all bg-opacity-40 ${isMe
                                        ? 'border-[#444] bg-[#1a1a1a]'
                                        : 'border-[#333] bg-[#0d0d0d]'
                                        }`}>
                                        {!isMe && (
                                            <div className="text-[11px] text-gray-500 font-bold mb-1">
                                                {msg.senderId?.username || 'User'}
                                            </div>
                                        )}
                                        {isMedia ? (
                                            mediaSrc.startsWith('data:image/') ? (
                                                <img src={mediaSrc} alt="Secure upload" className="rounded-lg max-h-60 object-contain mt-1 border border-zinc-800" />
                                            ) : mediaSrc.startsWith('data:video/') ? (
                                                <video src={mediaSrc} controls className="rounded-lg max-h-60 mt-1 border border-zinc-800" />
                                            ) : (
                                                <a href={mediaSrc} download="attachment" className="text-emerald-400 underline text-sm block mt-1">
                                                    📎 Download Secure File Document
                                                </a>
                                            )
                                        ) : (
                                            <p className="text-sm leading-relaxed text-gray-200">{msg.content}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {typingStatus.isTyping && (
                            <div className="flex w-full justify-start animate-pulse">
                                <div className="border border-zinc-800 bg-[#0d0d0d] rounded-xl p-2.5 text-xs text-zinc-400 italic">
                                    @{typingStatus.username} is typing...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Bottom Controls / Text input row */}
                    <form onSubmit={handleSendMessage} className="flex gap-4 items-center mt-auto">
                        {selectedFile && (
                            <div className="text-xs text-emerald-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl flex justify-between items-center w-max gap-4 animate-pulse">
                                <span>📎 {selectedFile.name} ready</span>
                                <button onClick={() => setSelectedFile(null)} className="text-red-500 font-bold hover:text-red-400">×</button>
                            </div>
                        )}
                        <div className="flex gap-4 items-center w-full">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*,application/pdf" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-zinc-900 border border-zinc-800 text-white rounded-full p-3.5 hover:bg-zinc-800 transition-all text-sm font-semibold"
                            >
                                📎
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                disabled={!!selectedFile}
                                placeholder={selectedFile ? "File selected. Click Enter to transmit securely..." : "Type your message here..."}
                                className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-full px-5 py-3.5 text-sm text-white outline-none focus:border-gray-500 transition-colors disabled:opacity-50"
                            />
                            <button type="submit" className="bg-white text-black font-bold text-sm px-8 py-3.5 rounded-full hover:bg-gray-200 transition-all active:scale-95">
                                Enter
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>);
}
