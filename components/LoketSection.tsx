
import React from 'react';
import { Loket, QueueItem, User } from '../types.ts';

interface LoketSectionProps {
  lokets: Loket[];
  queues: QueueItem[];
  users: User[];
  nextQueue?: QueueItem;
}

const LoketSection: React.FC<LoketSectionProps> = ({ lokets, queues, users, nextQueue }) => {
  const getTheme = (color: string) => {
    const themes: {[key: string]: string} = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100 icon-blue-600',
      pink: 'bg-pink-50 text-pink-600 border-pink-100 icon-pink-600',
      purple: 'bg-purple-50 text-purple-600 border-purple-100 icon-purple-600',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 icon-emerald-600',
      amber: 'bg-amber-50 text-amber-600 border-amber-100 icon-amber-600',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 icon-indigo-600',
    };
    return themes[color] || themes.blue;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full">
      {lokets.map((loket) => {
        const currentQueue = queues.find(q => q.id === loket.currentQueueId);
        const assignedUser = users.find(u => u.assignedLoketId === loket.id);
        const theme = getTheme(loket.color);

        return (
          <div key={loket.id} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col items-center space-y-6 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${theme.split(' ')[0]} group-hover:scale-110 transition-transform`}>
              <svg className={`w-8 h-8 ${theme.split(' ')[1]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div className="text-center">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{loket.name}</h4>
              <p className="text-6xl font-black text-slate-800 tracking-tighter">
                {currentQueue ? currentQueue.rawNumber : '---'}
              </p>
              <div className="mt-4 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px] inline-block">
                  {assignedUser?.name || 'BELUM AKTIF'}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-10 shadow-xl flex flex-col items-center justify-center space-y-4 text-white min-h-[250px]">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Antrean Berikutnya</span>
        <p className="text-6xl font-black tracking-tighter text-blue-400">
          {nextQueue ? nextQueue.rawNumber : '---'}
        </p>
        <div className="h-0.5 w-10 bg-slate-700 rounded-full"></div>
        <span className="text-[9px] font-bold text-slate-500 uppercase">Silakan Bersiap</span>
      </div>
    </div>
  );
};

export default LoketSection;
