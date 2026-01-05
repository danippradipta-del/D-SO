
import React, { useEffect } from 'react';
import { QueueItem } from '../types.ts';

interface TicketModalProps {
  ticket: QueueItem;
  onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[3.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-500 border border-white/20">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-12 text-center text-white relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h3 className="text-2xl font-black uppercase tracking-tighter">ANTREAN DIAMBIL</h3>
           <p className="text-emerald-100/80 text-[10px] font-bold uppercase tracking-widest mt-1">Silakan Menunggu Panggilan</p>
        </div>
        
        <div className="p-14 text-center bg-white">
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[9px] mb-4">Nomor Antrean Anda</p>
          <div className="relative inline-block">
             <span className="text-8xl font-black text-slate-800 tracking-tighter leading-none">
               {ticket.rawNumber}
             </span>
             <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-blue-600/10 rounded-full"></div>
          </div>
          <div className="mt-12">
            <button onClick={onClose} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:bg-slate-800 transition-colors active:scale-95">Tutup Tiket</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
