
import React from 'react';

interface QueueButtonProps {
  onClick: (type: 'REGULAR' | 'MJKN') => void;
}

const QueueButton: React.FC<QueueButtonProps> = ({ onClick }) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-2xl">
      <button
        onClick={() => onClick('REGULAR')}
        className="group relative flex-1 inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium rounded-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none w-full"
      >
        <span className="relative px-8 py-8 transition-all ease-in duration-75 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex flex-col items-center justify-center w-full shadow-2xl shadow-blue-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
          <span className="text-xl font-black text-white tracking-wide uppercase">Antrean Reguler</span>
          <span className="text-[10px] text-white/60 font-bold uppercase mt-1 tracking-widest">Prefix: A</span>
        </span>
      </button>

      <button
        onClick={() => onClick('MJKN')}
        className="group relative flex-1 inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium rounded-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none w-full"
      >
        <span className="relative px-8 py-8 transition-all ease-in duration-75 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl flex flex-col items-center justify-center w-full shadow-2xl shadow-purple-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-xl font-black text-white tracking-wide uppercase">Antrean MJKN</span>
          <span className="text-[10px] text-white/60 font-bold uppercase mt-1 tracking-widest">Prefix: MJKN</span>
        </span>
      </button>
    </div>
  );
};

export default QueueButton;
