
import React, { useState } from 'react';
import { Loket, QueueItem, User } from '../types.ts';

interface AdminPanelProps {
  lokets: Loket[];
  queues: QueueItem[];
  users: User[];
  serviceTypes: string[];
  onClose: () => void;
  onCallNext: (loketId: string, npp: string) => void;
  onComplete: (loketId: string, serviceType: string, cardNumber: string) => void;
  onAddLoket: () => void;
  onTakeQueue: (type: 'REGULAR' | 'MJKN') => void;
  onUpdateUsers: (users: User[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lokets, queues, users, serviceTypes, onClose, onCallNext, onComplete, onAddLoket, onTakeQueue, onUpdateUsers }) => {
  const [npp, setNpp] = useState('');
  const [pass, setPass] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedService, setSelectedService] = useState<{[key: string]: string}>({});
  const [cardNumber, setCardNumber] = useState<{[key: string]: string}>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = users.find(u => u.npp === npp);
    if (u && pass === '12345678') setCurrentUser(u);
    else alert('Login Gagal.');
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl animate-in zoom-in duration-300 border border-white/20">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-white text-3xl font-black italic">SO</div>
          <h2 className="text-2xl font-black text-slate-800 text-center mb-10 uppercase tracking-tighter">Login Petugas</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="NPP Petugas" className="w-full px-8 py-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold border-none" value={npp} onChange={e => setNpp(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full px-8 py-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold border-none" value={pass} onChange={e => setPass(e.target.value)} required />
            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 uppercase text-xs tracking-[0.2em] transition-all active:scale-95">Masuk Sistem</button>
            <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-slate-600">Kembali</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
      <header className="bg-white px-12 py-6 border-b flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black">SO</div>
          <div>
             <h2 className="text-xl font-black text-slate-800 leading-tight uppercase">Dashboard Layanan</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.name} ({currentUser.role})</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
           {currentUser.role === 'SUPER_ADMIN' && (
             <button onClick={onAddLoket} className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100">+ Tambah Loket</button>
           )}
           <button onClick={() => onTakeQueue('REGULAR')} className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase border border-blue-100">Antrean Baru</button>
           <div className="w-px h-8 bg-slate-200 mx-2"></div>
           <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lokets.map(loket => {
            const currentQ = queues.find(q => q.id === loket.currentQueueId);
            const assigned = users.find(u => u.assignedLoketId === loket.id);
            const isAccessible = currentUser.role === 'SUPER_ADMIN' || assigned?.npp === currentUser.npp;

            return (
              <div key={loket.id} className={`bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl flex flex-col min-h-[480px] transition-all relative overflow-hidden ${!isAccessible ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:border-blue-200'}`}>
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{loket.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{assigned?.name || 'BELUM TERPLOT'}</p>
                  </div>
                  {currentUser.role === 'SUPER_ADMIN' && (
                     <select 
                      className="text-[9px] bg-slate-100 border-none rounded-lg font-black uppercase p-1.5"
                      value={assigned?.npp || ''}
                      onChange={(e) => {
                        const newUsers = users.map(u => {
                          if (u.npp === e.target.value) return { ...u, assignedLoketId: loket.id };
                          if (u.assignedLoketId === loket.id) return { ...u, assignedLoketId: undefined };
                          return u;
                        });
                        onUpdateUsers(newUsers);
                      }}
                     >
                        <option value="">-- Pilih Petugas --</option>
                        {users.map(u => <option key={u.id} value={u.npp}>{u.name}</option>)}
                     </select>
                  )}
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-12 flex flex-col items-center justify-center border border-slate-100 mb-10 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Sedang Dilayani</span>
                  <span className="text-7xl font-black text-blue-600 tracking-tighter">
                    {currentQ ? currentQ.rawNumber : '---'}
                  </span>
                </div>

                {currentQ ? (
                  <div className="space-y-3">
                    <input type="text" maxLength={13} placeholder="13 Digit Nomor Kartu" className="w-full px-6 py-4 bg-white rounded-2xl text-xs font-bold outline-none border border-slate-200 focus:ring-2 ring-blue-500" value={cardNumber[loket.id] || ''} onChange={e => setCardNumber(p => ({...p, [loket.id]: e.target.value}))} />
                    <select className="w-full px-6 py-4 bg-white rounded-2xl text-[10px] font-bold outline-none border border-slate-200 uppercase" value={selectedService[loket.id] || ''} onChange={e => setSelectedService(p => ({...p, [loket.id]: e.target.value}))}>
                      <option value="">-- PILIH LAYANAN --</option>
                      {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => onComplete(loket.id, selectedService[loket.id], cardNumber[loket.id])} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Selesaikan Layanan</button>
                  </div>
                ) : (
                  <button 
                    disabled={!isAccessible}
                    onClick={() => onCallNext(loket.id, assigned?.npp || currentUser.npp)} 
                    className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 uppercase text-[10px] tracking-[0.2em] hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    Panggil Antrean
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
