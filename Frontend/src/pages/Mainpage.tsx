import Delete from '../assets/icons/Delete.js';
import { useRef, useState, useEffect } from "react";
import { Backend } from '../config';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Input } from '../componments/ui/Input';

interface RoomItem {
    name: string;
    roomCode: string;
}

export function Mainpage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<RoomItem[]>([]);
    const [loading, setLoading] = useState(true);
    const roomRef = useRef<HTMLInputElement>(null);
    const [username, setUsername] = useState<string>("Loading...");
    const joinCodeRef = useRef<HTMLInputElement>(null);

    async function RoomCheck() {
        if (!roomRef.current?.value) return;
        const roomName = roomRef.current.value;

        try {
            const makeRoom = await axios.post(Backend + '/api/v1/rooms', {
                name: roomName
            }, { withCredentials: true });


            if (makeRoom.data) {
                // Safeguard against backend returning 'code' instead of 'roomCode'
                const incomingCode = makeRoom.data.roomCode || makeRoom.data.code || "unknown";

                setRooms(prevRooms => [
                    ...prevRooms,
                    {
                        name: roomName,
                        roomCode: incomingCode
                    }
                ]);
            }
            if (roomRef.current) roomRef.current.value = "";
        } catch (e) {
            console.error("Error creating room:", e);
        }
    }

    useEffect(() => {
        setLoading(true);
        axios.get(Backend + '/api/v1/me', { withCredentials: true })
            .then((res) => {
                if (res.data.username) {
                    setUsername(res.data.username);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch username profile:", err);
                setUsername("User"); // fallback text
            });

        axios.get(Backend + '/api/v1/rooms', { withCredentials: true })
            .then((response) => {
                const incomingRooms = response.data.rooms || [];
                const formattedRooms = incomingRooms.map((room: any) => ({
                    name: room.name,
                    roomCode: room.roomCode || room.code || "no-code"
                }));

                setRooms(formattedRooms);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching rooms:", error);
                setRooms([]);
                setLoading(false);
            });
    }, []);


    const handleRoomClick = async (room: RoomItem) => {
        try {
            if (!room.roomCode) return alert("Error: This room has no code generated!");
            await navigator.clipboard.writeText(room.roomCode);
            navigate(`/chat/${room.roomCode}`);
        } catch (err) {
            console.error("Failed to copy code to clipboard", err);
        }
    };

    return (
        <div className="h-screen w-screen bg-black p-4 sm:p-6 text-white flex justify-center items-center overflow-hidden">
            <div className="border-2 border-zinc-700 rounded-xl w-full max-w-5xl h-[calc(100vh-100px)] p-6 flex flex-col justify-between md:flex-row md:items-center md:gap-8 bg-zinc-950/50 backdrop-blur-sm">

                <div className="flex flex-col gap-4 w-full md:w-1/2 h-2/3 md:h-full justify-center">
                    <h1 className="text-2xl font-bold tracking-wide flex justify-between items-center w-full">
                        <span>{username}</span> <button
                            onClick={async () => {
                                try {
                                    await axios.get(Backend + '/api/v1/logout', { withCredentials: true });
                                    setRooms([]);
                                    navigate('/login');
                                } catch (e) {
                                    console.error("Backend logout session destroy failure:", e);
                                    navigate('/login');
                                }
                            }}
                            className="text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors cursor-pointer bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs"
                        >
                            Logout
                        </button></h1>
                    <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 flex flex-col gap-3 h-full overflow-y-auto">
                        <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">Rooms</h2>

                        {loading && <p className='text-zinc-500 text-sm animate-pulse'> Loading rooms...</p>}
                        {!loading && rooms.length === 0 && (
                            <p className="text-zinc-500 text-sm italic">No rooms found. Create one!</p>
                        )}

                        {!loading && rooms.map((room, index) => (

                            <div
                                key={room.roomCode || `room-index-${index}`}
                                className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3 rounded-md hover:border-zinc-700 transition"
                            >
                                <button
                                    onClick={() => handleRoomClick(room)}
                                    className="font-sans text-sm font-medium hover:text-blue-400 transition-colors text-left flex-1"
                                >
                                    {room.name}
                                </button>

                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();

                                        try {
                                            // 1. Fire a delete network request to our conditional endpoint
                                            const response = await axios.delete(`${Backend}/api/v1/rooms/${room.roomCode}`, {
                                                withCredentials: true // Forwards session cookies securely
                                            });

                                            if (response.data.success) {
                                                // 2. Clear out the deleted room card from the UI array state instantly
                                                setRooms((prevRooms: any) =>
                                                    prevRooms.filter((r: any) => r.roomCode !== room.roomCode)
                                                );

                                                console.log(response.data.message);
                                            } else {
                                                alert(response.data.message || "Failed to remove the room.");
                                            }

                                        } catch (error: any) {
                                            console.error("Failed to process room deletion workflow:", error);
                                            alert(error.response?.data?.message || "An unexpected error occurred during removal.");
                                        }
                                    }}
                                    className="text-zinc-500 hover:text-red-500 transition-colors duration-150 p-1"
                                >
                                    <Delete />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-5 w-full md:w-1/2 h-auto md:h-full py-6 md:py-0">

                    {/* Row 1: Join Room Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full gap-3">
                        {/* Added wrapper div to ensure Input fills space on desktop row layout */}
                        <div className="flex-1 w-full">
                            <Input type="text" placeholder="Room Code" ref={joinCodeRef} />
                        </div>
                        <button
                            onClick={async () => {
                                const code = joinCodeRef.current?.value?.trim();
                                if (!code) return;
                                try {
                                    const joinresponse = await axios.post(Backend + '/api/v1/rooms/join', {
                                        roomCode: code
                                    }, { withCredentials: true });

                                    if (joinresponse.data.sucess === false) {
                                        alert(joinresponse.data.error);
                                        return;
                                    }
                                    console.log(joinresponse.data.message);

                                    try {
                                        const roomresponse = await axios.get(Backend + '/api/v1/rooms', {
                                            withCredentials: true
                                        });

                                        const roomsArray = roomresponse.data.rooms || [];

                                        const formattedRooms = roomsArray.map((room: any) => ({
                                            name: room.name,
                                            roomCode: room.roomCode || room.code || "no-code"
                                        }));
                                        setRooms(formattedRooms);

                                    } catch (sidebarError) {
                                        console.error("Sidebar fetch failed:", sidebarError);
                                    }

                                    navigate(`/chat/${code}`);

                                } catch (e) {
                                    console.error("Network or unexpected error while joining:", e);
                                    alert("An unexpected error occurred. Please try again.");
                                }
                            }}
                            /* Cleaned up responsive utility sizing values */
                            className="w-full sm:w-auto px-6 sm:px-10 py-3.5 border border-zinc-700 rounded-xl bg-zinc-900 font-medium hover:bg-white hover:text-black transition-all duration-200 active:scale-95 text-center shadow-lg whitespace-nowrap text-sm sm:text-base"
                        >
                            Join room
                        </button>
                    </div>

                    {/* Row 2: Create Room Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full gap-3">
                        <div className="flex-1 w-full">
                            <Input type="text" placeholder="Room Name" ref={roomRef} />
                        </div>
                        <button
                            onClick={RoomCheck}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 border border-zinc-700 rounded-xl bg-zinc-900 font-medium hover:bg-white hover:text-black transition-all duration-200 active:scale-95 text-center shadow-lg whitespace-nowrap text-sm sm:text-base"
                        >
                            Create room
                        </button>
                    </div>

                </div>

            </div>
        </div >
    );
}
