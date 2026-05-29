import { Input } from "../componments/ui/Input"
import { useRef, useState } from 'react'
import { useNavigate } from "react-router-dom"
import { Backend } from "../config"
import axios from "axios"

export function Login() {
    const navigate = useNavigate()
    const usernameref = useRef<HTMLInputElement>(null)
    const passwordref = useRef<HTMLInputElement>(null)

    // UI state handlers for clean feedback
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault() // Prevents page reload
        setError(null)

        const username = usernameref.current?.value
        const password = passwordref.current?.value

        if (!username || !password) {
            setError("Please fill in all fields")
            return
        }

        try {
            setLoading(true)
            const response = await axios.post(Backend + '/api/v1/login', {
                username,
                password
            }, { withCredentials: true })

            if (response.data) {
                navigate('/mainpage')
            }
        } catch (err: any) {
            console.error("Login request error:", err)
            const backendError = err.response?.data;
            if (backendError && backendError.message?.includes("zod error")) {
                try {
                    // Zod errors often come back stringified in the response. message string field
                    const parsedErrors = JSON.parse(backendError.error.message);
                    // Extract the first error message cleanly (e.g. "String must contain at least 6 character(s)")
                    const friendlyMessage = parsedErrors[0]?.message || "Invalid input layout format";
                    const fieldName = parsedErrors[0]?.path[0] || "Input";

                    setError(`${fieldName}: ${friendlyMessage}`);
                } catch (parseEx) {
                    setError("Validation failed: Inputs are too short or invalid.");
                }
            } else {
                setError(backendError?.error || "Invalid username or password")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-screen w-screen bg-black text-white flex justify-center items-center overflow-hidden p-4">
            {/* Main Center Card (Matching Mainpage Theme Framework) */}
            <form
                onSubmit={onSubmit}
                className="border-2 border-zinc-700/80 rounded-xl w-full max-w-md p-8 flex flex-col gap-6 bg-zinc-950/50 backdrop-blur-sm shadow-2xl"
            >
                {/* Header branding block */}
                <div className="flex flex-col gap-1 text-center sm:text-left mb-2">
                    <h1 className="text-3xl font-extrabold tracking-wide">Welcome Back</h1>
                    <p className="text-zinc-400 text-sm">Log in to manage your chat rooms</p>
                </div>

                {/* Dynamic Error Container Popup */}
                {error && (
                    <div className="bg-red-950/30 border border-red-800/60 text-red-400 p-3 rounded-lg text-sm text-center font-medium animate-shake">
                        {error}
                    </div>
                )}

                {/* Form Input Control Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
                        <Input ref={usernameref} type="text" placeholder="Enter username" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                        <Input ref={passwordref} type="password" placeholder="••••••••" />
                    </div>
                </div>

                {/* Action Controls Column */}
                <div className="flex flex-col gap-4 mt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3.5 border border-zinc-700 rounded-xl bg-zinc-900 font-semibold hover:bg-white hover:text-black transition-all duration-200 active:scale-98 text-center disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                    >
                        {loading ? "Authenticating..." : "Login"}
                    </button>

                    {/* Footer Nav Link Splitter */}
                    <div className="text-center text-sm text-zinc-400 pt-2">
                        New here?{" "}
                        <button
                            type="button"
                            className="text-white font-medium hover:underline cursor-pointer underline-offset-4 decoration-zinc-500 transition-colors"
                            onClick={() => navigate('/signup')}
                        >
                            Create an account
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
