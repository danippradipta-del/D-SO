
import React, { useEffect } from 'react';
import { QueueItem } from '../types.ts';

interface TicketModalProps {
  ticket: QueueItem;
  onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  useEffect(() => {
    // Auto close after 10 seconds if not clicked
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const formattedNumber = `${ticket.prefix}-${ticket.number.toString().padStart(3, '0')}`;
  const dateStr = new Date(ticket.timestamp).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-center text-white">
           <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h3 className="text-xl font-bold">Berhasil Diambil</h3>
           <p className="text-white/70 text-sm">Silakan tunggu nomor Anda dipanggil</p>
        </div>
        
        <div className="p-10 text-center space-y-6">
          <div className="space-y-1">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nomor Antrean Anda</p>
            <p className="text-7xl font-black text-slate-800 tracking-tighter">
              {formattedNumber}
            </p>
          </div>

          <div className="py-4 border-y border-slate-100 flex flex-col space-y-1">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waktu Ambil</span>
             <span className="text-slate-600 font-medium">{dateStr}</span>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 text-lg"
          >
            Selesai
          </button>
          
          <p className="text-xs text-slate-300 italic">Peserta BPJS Kesehatan KC Jember</p>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
