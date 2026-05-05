import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <style>{`
        .font-medium {
          color: rgba(255, 255, 255, 0.9) !important;
        }
        /* Ensure inputs don't become invisible if they have white background */
        input.font-medium, textarea.font-medium {
          color: inherit !important; 
        }
        /* Specific override for black text explicitly set */
        .text-black.font-medium {
          color: #000 !important;
        }
      `}</style>
      {children}
    </div>
  );
}