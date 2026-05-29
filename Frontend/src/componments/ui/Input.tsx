import { forwardRef } from "react";

interface InputProps {
    placeholder: string,
    type: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ placeholder, type }, ref) => {
        return (
            <div>
                <input
                    placeholder={placeholder}
                    type={type}
                    ref={ref}
                    className="px-4 py-4 w-full font-bold text-black placeholder-black/60
               bg-white border-[3px] border-black rounded-xl
               shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
               focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] 
               focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
               transition-all"
                />
            </div >
        )
    })
