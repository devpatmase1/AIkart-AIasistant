import React from "react";

interface BrandMarkProps {
  variant?: "full" | "icon";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  variant = "full",
  className = "",
  size = "md",
}) => {
  const heights = {
    sm: "h-6",
    md: "h-8",
    lg: "h-11",
  };

  const currentHeight = heights[size] || "h-8";
  const logoSrc = variant === "icon" ? "/logo-icon.png" : "/logo-full.png";

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoSrc}
        alt="aiKart"
        className={`${currentHeight} w-auto object-contain mix-blend-multiply`}
      />
    </div>
  );
};
