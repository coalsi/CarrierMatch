import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 ${
          hover ? "transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
