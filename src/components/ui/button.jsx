import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        cockpit: "relative bg-black/60 border-l-4 border-r-4 border-t border-b border-t-cyan-500/30 border-b-cyan-500/30 border-l-cyan-500 border-r-cyan-500 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-100 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] backdrop-blur-sm font-mono font-bold uppercase tracking-wider transition-all duration-300 skew-x-[-10deg] active:scale-95 active:skew-x-[-5deg]",
        cockpit_action: "relative overflow-hidden bg-black/60 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] backdrop-blur-md font-black uppercase tracking-[0.2em] text-xl transition-all duration-300 skew-x-[-10deg] active:scale-95 before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,255,255,0.05)_10px,rgba(0,255,255,0.05)_20px)] shadow-[0_0_15px_rgba(0,255,255,0.3)]",
        cockpit_danger: "relative bg-black/60 border-l-4 border-r-4 border-t border-b border-t-red-500/30 border-b-red-500/30 border-l-red-500 border-r-red-500 text-red-400 hover:bg-red-500/20 hover:border-red-400 hover:text-red-100 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] backdrop-blur-sm font-mono font-bold uppercase tracking-wider transition-all duration-300 skew-x-[-10deg] active:scale-95",
        display: "relative w-full h-full bg-[#050510] border-2 border-gray-800 rounded-lg flex flex-col items-center justify-center p-2 text-cyan-400 shadow-[0_0_0_1px_rgba(0,0,0,1),0_0_15px_rgba(0,0,0,0.8)] hover:border-gray-600 hover:text-cyan-300 transition-all duration-300 overflow-hidden group active:scale-[0.98] before:absolute before:inset-[2px] before:rounded-[2px] before:bg-[#0a0a1a] before:shadow-[inset_0_0_20px_rgba(0,0,0,1)] before:-z-10 after:absolute after:inset-0 after:bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.3)_3px)] after:opacity-30 after:pointer-events-none hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }