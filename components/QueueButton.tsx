
import React from 'react';

interface QueueButtonProps {
  onClick: () => void;
}

const QueueButton: React.FC<QueueButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium rounded-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none"
    >
      <span className="relative px-12 py-8 transition-all ease-in duration-75 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex flex-col items-center justify-center min-w-[300px] shadow-2xl shadow-blue-500/30">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
        </svg>
        <span className="text-2xl font-bold text-white tracking-wide">Ambil Antrian</span>
      </span>
    </button>
  );
};

export default QueueButton;
