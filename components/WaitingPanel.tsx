
import React from 'react';

interface WaitingPanelProps {
  count: number;
}

const WaitingPanel: React.FC<WaitingPanelProps> = ({ count }) => {
  return (
    <div className="w-full bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[3.5rem] p-12 shadow-2xl shadow-blue-500/20 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>
      
      <div className="relative z-10 flex items-center space-x-6">
        <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-blue-100 font-black tracking-[0.2em] text-sm uppercase">Peserta Menunggu</h3>
          <p className="text-blue-300 text-xs font-bold uppercase mt-1">Status Server: Online</p>
        </div>
      </div>
      
      <div className="relative z-10 mt-8 md:mt-0">
        <span className="text-8xl md:text-9xl font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">
          {count}
        </span>
      </div>
    </div>
  );
};

export default WaitingPanel;
