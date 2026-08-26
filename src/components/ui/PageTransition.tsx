import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const [isExiting, setIsExiting] = useState(false);
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setIsExiting(true);
    const timer = setTimeout(() => {
      setKey(location.pathname);
      setIsExiting(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      className={`page-transition ${className || ""} ${isExiting ? "page-exit" : "page-enter"}`}
      key={key}
    >
      {children}
    </div>
  );
}