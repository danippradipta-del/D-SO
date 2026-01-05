
import React from 'react';

interface QueueButtonProps {
  onClick: (type: 'REGULAR' | 'MJKN') => void;
  isProcessing: boolean;
}

const QueueButton: React.FC<QueueButtonProps> = ({ onClick, isProcessing }) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl mx-auto">
      <button
        disabled={isProcessing}
        onClick={() => onClick('REGULAR')}
        className={`group relative flex-1 p-1 overflow-hidden rounded-[2.5rem] transition-all duration-300 transform ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20'} w-full`}
      >
        <span className="relative px-8 py-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] flex flex-col items-center justify-center w-full">
          {isProcessing ? (
            <div className="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
          ) : (
            <svg className="h-12 w-12 text-white mb-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          )}
          <span className="text-2xl font-black text-white tracking-wide uppercase">Antrean Reguler</span>
          <span className="text-[10px] text-white/60 font-black uppercase mt-2 tracking-[0.2em]">Kode Antrean: A</span>
        </span>
      </button>

      <button
        disabled={isProcessing}
        onClick={() => onClick('MJKN')}
        className={`group relative flex-1 p-1 overflow-hidden rounded-[2.5rem] transition-all duration-300 transform ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-2xl shadow-purple-500/20'} w-full`}
      >
        <span className="relative px-8 py-12 bg-gradient-to-br from-purple-600 to-indigo-800 rounded-[2.5rem] flex flex-col items-center justify-center w-full">
          {isProcessing ? (
            <div className="h-12 w-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
          ) : (
            <svg className="h-12 w-12 text-white mb-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          <span className="text-2xl font-black text-white tracking-wide uppercase">Antrean MJKN</span>
          <span className="text-[10px] text-white/60 font-black uppercase mt-2 tracking-[0.2em]">Kode Antrean: MJKN</span>
        </span>
      </button>
    </div>
  );
};

export default QueueButton;
