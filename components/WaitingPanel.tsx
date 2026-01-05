
import React from 'react';

interface WaitingPanelProps {
  count: number;
}

const WaitingPanel: React.FC<WaitingPanelProps> = ({ count }) => {
  return (
    <div className="w-full bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50 shadow-sm flex flex-col md:flex-row items-center justify-between px-12">
      <div className="flex items-center space-x-4 mb-4 md:mb-0">
        <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-slate-400 font-bold tracking-widest text-xs uppercase">Total Antrean Menunggu</h3>
          <p className="text-slate-600 font-medium">Antrean aktif yang berstatus "Menunggu"</p>
        </div>
      </div>
      <div className="text-6xl md:text-7xl font-black text-blue-600 tabular-nums">
        {count}
      </div>
    </div>
  );
};

export default WaitingPanel;
