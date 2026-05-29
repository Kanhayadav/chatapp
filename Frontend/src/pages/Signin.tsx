import { useRef, useState } from "react";
import { Input } from "../componments/ui/Input";
import axios from "axios";
import { Backend } from "../config";
import { useNavigate } from "react-router-dom";

export function Signin() {
    const navigate = useNavigate()
    const usernameref = useRef<HTMLInputElement>(null)
    const passwordref = useRef<HTMLInputElement>(null)

    // UI state loaders and error feedback systems
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function signin(e: React.FormEvent) {
        e.preventDefault() // Prevents sudden page flash reload cycles
        setError(null)

        const username = usernameref.current?.value
        const password = passwordref.current?.value

        if (!username || !password) {
            setError("Please choose a username and password")
            return
        }

        try {
            setLoading(true)
            // Fixed url generation layout typo (added missing slash securely)
            const sign = await axios.post(`${Backend}/api/v1/signin`, {
                username,
                password
            })

            if (sign.data) {
                navigate('/login')
            }
        } catch (err: any) {
            console.error("Registration request error:", err)
            const backendError = err.response?.data;
            if (backendError && backendError.message?.includes("zod error")) {
                try {
                    const parsedErrors = JSON.parse(backendError.error.message);
                    const friendlyMessage = parsedErrors[0]?.message || "Invalid input layout format";
                    const fieldName = parsedErrors[0]?.path[0] || "Input";

                    setError(`${fieldName}: ${friendlyMessage}`);
                } catch (parseEx) {
                    setError("Validation failed. Username or password is too short.");
                }
            } else {
                setError(backendError?.error || "Registration failed. Username might be taken.")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-screen w-screen bg-black text-white flex justify-center items-center overflow-hidden p-4">
            {/* Main Framework Box Container */}
            <form
                onSubmit={signin}
                className="border-2 border-zinc-700/80 rounded-xl w-full max-w-md p-8 flex flex-col gap-6 bg-zinc-950/50 backdrop-blur-sm shadow-2xl"
            >
                {/* Branding Block */}
                <div className="flex flex-col gap-1 text-center sm:text-left mb-2">
                    <h1 className="text-3xl font-extrabold tracking-wide">Get Started</h1>
                    <p className="text-zinc-400 text-sm">Create an account to host your own channels</p>
                </div>

                {/* Status Catch Message Overlay */}
                {error && (
                    <div className="bg-red-950/30 border border-red-800/60 text-red-400 p-3 rounded-lg text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Structured Text Inputs */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Choose Username</label>
                        <Input type="text" placeholder="Create username" ref={usernameref} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                        <Input type="password" placeholder="Create strong password" ref={passwordref} />
                    </div>
                </div>

                {/* Submissions Control Footprint */}
                <div className="flex flex-col gap-4 mt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3.5 border border-zinc-700 rounded-xl bg-zinc-900 font-semibold hover:bg-white hover:text-black transition-all duration-200 active:scale-98 text-center disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                    >
                        {loading ? "Creating Account..." : "Register Account"}
                    </button>

                    {/* Navigation Routing Link Fixes */}
                    <div className="text-center text-sm text-zinc-400 pt-2">
                        Already have an account?{" "}
                        <button
                            type="button"
                            className="text-white font-medium hover:underline cursor-pointer underline-offset-4 decoration-zinc-500 transition-colors"
                            // Fixed standard missing leading relative path slash inside route execution parameters
                            onClick={() => navigate('/login')}
                        >
                            Log In
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
