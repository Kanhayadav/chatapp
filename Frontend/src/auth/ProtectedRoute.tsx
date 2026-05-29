import axios from "axios";
import { Backend } from "../config";
import { useEffect, useState } from "react";
import type { ReactNode } from 'react'
import { useNavigate } from "react-router-dom";

type ProjectedRouteProps = {
    children: ReactNode
}


export function ProtectedRoute({ children }: ProjectedRouteProps) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    useEffect(() => {
        async function checking() {
            try {
                await axios.get(Backend + '/api/v1/me', { withCredentials: true })
                setIsAuthenticated(true);
            } catch (e) {
                setIsAuthenticated(false)
                navigate('/signup');
            }
            finally {
                setLoading(false);
            }
        }
        checking()
    }, [navigate])

    if (loading) {
        return <>
            <div className="h-screen w-screen bg-black text-zinc-500 flex justify-center items-center font-medium font-mono animate-pulse">
                Verifying Session...
            </div>
        </>
    }
    return isAuthenticated ? <>{children}</> : null;
}