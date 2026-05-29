import type { Request, Response, NextFunction } from "express";
import { jwtSecret } from './config.js'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'



interface AuthReq extends Request {
    userId?: string
}


export function authmiddleware(req: AuthReq, res: Response, next: NextFunction) {

    const token = req.cookies?.token
    if (!token) {
        return res.status(402).json({
            message: "user not logged in"
        })
    }
    try {
        const decodedJWT = jwt.verify(token as string, jwtSecret) as JwtPayload
        if (!decodedJWT || !decodedJWT.id) {
            return res.status(403).json({
                message: "invaild token"
            })
        }
        req.userId = decodedJWT.id
        next();
    } catch (e) {
        return res.status(503).json({
            error: "some error :( "
        })
    }
}