import mongooese, { Types } from 'mongoose'
import { DBkey } from './config.js'

export async function dbConnection() {
    try {
        await mongooese.connect(DBkey)
        console.log("DB connected ;)")
    } catch (e) {
        console.log("DB is off :( " + e)
    }
}


const Schema = mongooese.Schema


const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
})


const RoomSchema = new Schema({
    name: { type: String, required: true, trim: true },
    createdBy: { type: Types.ObjectId, ref: 'users', required: true },
    roomCode: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now }
})

const messageSchema = new Schema({
    roomId: { type: Types.ObjectId, ref: 'rooms', required: true },
    senderId: { type: Types.ObjectId, ref: 'users', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const roomMemberSchema = new Schema({
    userId: { type: Types.ObjectId, ref: 'users', required: true },
    roomId: { type: Types.ObjectId, ref: 'rooms', required: true },
    joinedAt: { type: Date, default: Date.now }
});


roomMemberSchema.index({ userId: 1, roomId: 1 }, { unique: true });

export const UserModel = mongooese.model('users', UserSchema)
export const RoomModel = mongooese.model('rooms', RoomSchema)
export const MessageModel = mongooese.model('messages', messageSchema)
export const roomMemberModel = mongooese.model('roommembers', roomMemberSchema)
