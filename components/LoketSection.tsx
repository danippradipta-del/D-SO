
import React from 'react';
import { Loket, QueueItem, QueueStatus } from '../types.ts';

interface LoketSectionProps {
  lokets: Loket[];
  queues: QueueItem[];
  nextQueue?: QueueItem;
}

const LoketSection: React.FC<LoketSectionProps> = ({ lokets, queues, nextQueue }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full`}>
      {lokets.map((loket) => {
        const currentQueue = queues.find(q => q.id === loket.currentQueueId);
        const colorClass = loket.color === 'blue' ? 'text-blue-600 bg-blue-100' : 
                         loket.color === 'pink' ? 'text-pink-600 bg-pink-100' :
                         'text-purple-600 bg-purple-100';
        const barColor = loket.color === 'blue' ? 'bg-blue-600' : 
                        loket.color === 'pink' ? 'bg-pink-600' :
                        'bg-purple-600';

        return (
          <div key={loket.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center space-y-4 hover:shadow-md transition-shadow duration-300">
            <div className={`p-3 rounded-2xl ${colorClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">{loket.name}</p>
              <p className="text-4xl font-black text-slate-800 mt-1">
                {currentQueue ? `${currentQueue.prefix}-${currentQueue.number.toString().padStart(3, '0')}` : '-'}
              </p>
            </div>
            <div className={`h-1.5 w-12 rounded-full ${barColor} opacity-50`}></div>
          </div>
        );
      })}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center space-y-4 hover:shadow-md transition-shadow duration-300">
        <div className="p-3 rounded-2xl text-cyan-600 bg-cyan-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">ANTRIAN BERIKUTNYA</p>
          <p className="text-4xl font-black text-slate-800 mt-1">
            {nextQueue ? `${nextQueue.prefix}-${nextQueue.number.toString().padStart(3, '0')}` : '-'}
          </p>
        </div>
        <div className="h-1.5 w-12 rounded-full bg-cyan-500 opacity-50"></div>
      </div>
    </div>
  );
};

export default LoketSection;
