
import React, { useState, useEffect } from 'react';
import { Loket, QueueItem, QueueStatus, User, UserRole } from '../types.ts';

interface AdminPanelProps {
  lokets: Loket[];
  queues: QueueItem[];
  users: User[];
  serviceTypes: string[];
  gasUrl?: string;
  spreadsheetUrl?: string;
  onClose: () => void;
  onReset: () => void;
  onCallNext: (loketId: string, npp: string) => void;
  onComplete: (loketId: string, serviceType: string, cardNumber?: string) => void;
  onUpdateUsers: (users: User[]) => void;
  onUpdateServiceTypes: (types: string[]) => void;
  onUpdateGasUrl: (url: string) => void;
  onUpdateSpreadsheetUrl: (url: string) => void;
  onUpdateLokets: (lokets: Loket[]) => void;
}

const SLA_WAIT_MINUTES = 30;
const SLA_SERVICE_MINUTES = 15;

const SLATimer: React.FC<{ 
  startTime: number; 
  endTime?: number; 
  type: 'WAIT' | 'SERVICE'; 
  label: string 
}> = ({ startTime, endTime, type, label }) => {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    if (endTime) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const diff = endTime ? (endTime - startTime) : (now - startTime);
  const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
  
  const slaLimit = (type === 'WAIT' ? SLA_WAIT_MINUTES : SLA_SERVICE_MINUTES) * 60 * 1000;
  const isOverSLA = diff >= slaLimit;
  
  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-xl bg-slate-100 transition-colors duration-500`}>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-mono font-bold ${isOverSLA ? 'text-red-600' : 'text-slate-700'}`}>{h}:{m}:{s}</span>
    </div>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ lokets, queues, users, serviceTypes, gasUrl, spreadsheetUrl, onClose, onReset, onCallNext, onComplete, onUpdateUsers, onUpdateServiceTypes, onUpdateGasUrl, onUpdateSpreadsheetUrl, onUpdateLokets }) => {
  const [loginNpp, setLoginNpp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'users' | 'lokets' | 'settings'>('service');
  
  const [selectedServices, setSelectedServices] = useState<{ [key: string]: string }>({});
  const [cardNumbers, setCardNumbers] = useState<{ [key: string]: string }>({});
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.npp === loginNpp);
    if (user && loginPassword === '12345678') {
      setCurrentUser(user);
    } else { 
      alert('NPP atau Password salah! (Default: 12345678)'); 
    }
  };

  const handleAssignPetugas = (loketId: string, userNpp: string) => {
    const updatedUsers = users.map(u => {
      if (u.npp === userNpp) return { ...u, assignedLoketId: loketId };
      if (loketId !== "" && u.assignedLoketId === loketId && u.npp !== userNpp) return { ...u, assignedLoketId: undefined };
      return u;
    });
    onUpdateUsers(updatedUsers);
  };

  const handleCompleteWithData = (loketId: string) => {
    const service = selectedServices[loketId];
    const card = cardNumbers[loketId];

    if (!service) return alert('Pilih jenis layanan!');
    if (card && (card.length !== 13 || !/^\d+$/.test(card))) return alert('Nomor kartu harus 13 digit angka!');

    onComplete(loketId, service, card);
    const newServices = { ...selectedServices }; delete newServices[loketId]; setSelectedServices(newServices);
    const newCards = { ...cardNumbers }; delete newCards[loketId]; setCardNumbers(newCards);
  };

  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN' || isSuper;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in duration-300">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic">D-SO</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Login Petugas</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium italic">Gunakan NPP Anda untuk operasional loket.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Masukkan NPP" className="w-full px-6 py-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold" value={loginNpp} onChange={e => setLoginNpp(e.target.value)} required />
            <input type="password" placeholder="Password (12345678)" className="w-full px-6 py-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-colors uppercase tracking-widest text-xs">Masuk Panel</button>
            <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 text-xs uppercase">Batal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">
      <header className="bg-white px-8 py-4 shadow-sm flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded-xl text-white font-black px-3">D-SO</div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase leading-tight tracking-tighter">Panel Operasional Jember</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.name} | {currentUser.role}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <nav className="bg-slate-100 p-1.5 rounded-2xl flex space-x-1">
            <button onClick={() => setActiveTab('service')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'service' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Monitor Layanan</button>
            {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Petugas</button>}
            {isSuper && <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Sistem</button>}
          </nav>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button onClick={() => setCurrentUser(null)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg></button>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'service' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {lokets
                .filter(l => isAdmin || l.id === currentUser.assignedLoketId)
                .map(loket => {
                  const currentQueue = queues.find(q => q.id === loket.currentQueueId);
                  const isCalling = !!currentQueue;
                  const assignedUser = users.find(u => u.assignedLoketId === loket.id);
                  
                  const activeRole = assignedUser?.role || currentUser.role;
                  const canCallAnything = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN';
                  
                  const waitingCount = queues.filter(q => 
                    q.status === QueueStatus.WAITING && (canCallAnything || q.prefix === 'MJKN')
                  ).length;

                  const accentColor = loket.color === 'pink' ? 'pink' : loket.color === 'purple' ? 'purple' : loket.color === 'emerald' ? 'emerald' : 'blue';
                  
                  return (
                    <div key={loket.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[500px]">
                      <div className={`absolute top-0 left-0 w-full h-2 bg-${accentColor}-600`}></div>
                      <div className="space-y-6">
                        <div className="flex justify-between items-start">
                           <div>
                             <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{loket.name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                               Petugas: {assignedUser ? assignedUser.name : 'STANDBY / LOGOUT'}
                             </p>
                           </div>
                           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap shadow-sm ${canCallAnything ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                             {canCallAnything ? 'ADMIN UNIVERSAL' : 'ASISTEN MJKN'}
                           </span>
                        </div>

                        <div className="bg-slate-50 rounded-3xl p-10 flex flex-col items-center border border-slate-100 shadow-inner">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nomor Aktif (Dilayani)</span>
                          <span className={`text-6xl font-black tabular-nums tracking-tighter ${isCalling ? `text-${accentColor}-600` : 'text-slate-200'}`}>
                            {currentQueue ? `${currentQueue.prefix}-${currentQueue.number.toString().padStart(3, '0')}` : '---'}
                          </span>
                        </div>

                        {isCalling && currentQueue && (
                          <div className="space-y-4">
                             <div className="space-y-2">
                                <SLATimer startTime={currentQueue.timestamp} endTime={currentQueue.startTime} type="WAIT" label="Menunggu" />
                                <SLATimer startTime={currentQueue.startTime!} type="SERVICE" label="Melayani" />
                             </div>
                             <div className="space-y-3">
                                <input type="text" maxLength={13} placeholder="Noka JKN (13 Digit)" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-blue-500" value={cardNumbers[loket.id] || ''} onChange={e => setCardNumbers(prev => ({ ...prev, [loket.id]: e.target.value.replace(/\D/g, '') }))} />
                                <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-blue-500" value={selectedServices[loket.id] || ''} onChange={e => setSelectedServices(prev => ({ ...prev, [loket.id]: e.target.value }))}>
                                  <option value="">-- Pilih Layanan --</option>
                                  {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                             </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-8">
                        {isCalling ? (
                           <button onClick={() => handleCompleteWithData(loket.id)} className={`w-full py-5 bg-${accentColor}-600 text-white font-black rounded-2xl shadow-lg hover:brightness-110 uppercase text-[10px] tracking-widest transition-all active:scale-95`}>Selesai Layan</button>
                        ) : (
                           <button 
                             disabled={waitingCount === 0 || (!isAdmin && !assignedUser)} 
                             onClick={() => onCallNext(loket.id, assignedUser?.npp || currentUser.npp)} 
                             className={`w-full py-6 bg-${accentColor}-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:grayscale uppercase text-[10px] tracking-widest hover:brightness-110`}
                           >
                             PANGGIL (MENUNGGU: {waitingCount})
                           </button>
                        )}
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
