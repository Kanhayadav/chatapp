import dotenv from 'dotenv';
dotenv.config()


export const DBkey = process.env.DBkey as string
export const jwtSecret = process.env.jwt_Secret as string