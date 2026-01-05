
import React from 'react';
import { Loket, QueueItem, User } from '../types.ts';

interface LoketSectionProps {
  lokets: Loket[];
  queues: QueueItem[];
  users: User[];
  nextQueue?: QueueItem;
}

const LoketSection: React.FC<LoketSectionProps> = ({ lokets, queues, users, nextQueue }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full`}>
      {lokets.map((loket) => {
        const currentQueue = queues.find(q => q.id === loket.currentQueueId);
        const assignedUser = users.find(u => u.assignedLoketId === loket.id);
        const isAssistant = assignedUser?.role === 'ASISTEN_ADMIN';

        const colorClass = loket.color === 'blue' ? 'text-blue-600 bg-blue-100' : 
                         loket.color === 'pink' ? 'text-pink-600 bg-pink-100' :
                         loket.color === 'purple' ? 'text-purple-600 bg-purple-100' :
                         loket.color === 'emerald' ? 'text-emerald-600 bg-emerald-100' :
                         'text-slate-600 bg-slate-100';

        const barColor = loket.color === 'blue' ? 'bg-blue-600' : 
                        loket.color === 'pink' ? 'bg-pink-600' :
                        loket.color === 'purple' ? 'bg-purple-600' :
                        loket.color === 'emerald' ? 'bg-emerald-600' :
                        'bg-slate-600';

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
              {isAssistant && (
                <div className="mt-2 px-3 py-0.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Petugas Aktif</span>
                </div>
              )}
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
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">ANTREAN BERIKUTNYA</p>
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
