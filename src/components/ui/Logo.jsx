import React from 'react';

export function Logo({ className = "w-8 h-8" }) {
  return (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="50" cy="50" r="10" stroke="currentColor" className="text-primary" strokeWidth="8" />
    <path d="M 33 67 A 24 24 0 1 1 73.2 43.8" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" />
    <path d="M 56.9 10.6 A 40 40 0 1 1 10.6 56.9" stroke="currentColor" className="text-primary" strokeWidth="8" strokeLinecap="round" />
  </svg>
  );
}
