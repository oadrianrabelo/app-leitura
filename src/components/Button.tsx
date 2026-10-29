import { motion, type HTMLMotionProps } from "motion/react";
import "./Button.css";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    />
  );
}
