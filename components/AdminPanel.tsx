
import React, { useState, useEffect, useMemo } from 'react';
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
  onComplete: (loketId: string, serviceType: string) => void;
  onAssistantLog: (npp: string, loketId: string, serviceType: string, cardNumber: string) => void;
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

const AdminPanel: React.FC<AdminPanelProps> = ({ lokets, queues, users, serviceTypes, gasUrl, spreadsheetUrl, onClose, onReset, onCallNext, onComplete, onAssistantLog, onUpdateUsers, onUpdateServiceTypes, onUpdateGasUrl, onUpdateSpreadsheetUrl, onUpdateLokets }) => {
  const [loginNpp, setLoginNpp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'service' | 'users' | 'lokets' | 'history' | 'settings'>('service');
  
  // States for forms
  const [selectedServices, setSelectedServices] = useState<{ [key: string]: string }>({});
  const [assistantCardNumbers, setAssistantCardNumbers] = useState<{ [key: string]: string }>({});
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddLoketModalOpen, setIsAddLoketModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'ADMIN' });
  const [newLoket, setNewLoket] = useState<Partial<Loket>>({ color: 'blue' });

  const waitingQueues = useMemo(() => queues.filter(q => q.status === QueueStatus.WAITING), [queues]);
  const waitingCount = waitingQueues.length;
  const completedHistory = useMemo(() => queues.filter(q => q.status === QueueStatus.COMPLETED).sort((a, b) => (b.endTime || 0) - (a.endTime || 0)), [queues]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.npp === loginNpp);
    if (user && loginPassword === '12345678') {
      setCurrentUser(user);
    } else { alert('NPP atau Password salah!'); }
  };

  const handleAssignPetugas = (loketId: string, userNpp: string) => {
    const updatedUsers = users.map(u => {
      if (u.npp === userNpp) return { ...u, assignedLoketId: loketId };
      if (loketId !== "" && u.assignedLoketId === loketId && u.npp !== userNpp) return { ...u, assignedLoketId: undefined };
      return u;
    });
    onUpdateUsers(updatedUsers);
  };

  const handleAssistantSubmit = (loketId: string) => {
    const service = selectedServices[loketId];
    const cardNum = assistantCardNumbers[loketId];

    if (!service) return alert('Pilih jenis layanan!');
    if (!cardNum || cardNum.length !== 13 || !/^\d+$/.test(cardNum)) return alert('Nomor kartu harus 13 digit angka!');

    onAssistantLog(currentUser?.npp || '', loketId, service, cardNum);
    
    // Clear form
    setAssistantCardNumbers(prev => ({ ...prev, [loketId]: '' }));
    setSelectedServices(prev => ({ ...prev, [loketId]: '' }));
    alert('Catatan asisten berhasil disimpan!');
  };

  const formatDuration = (ms: number) => {
    const sTotal = Math.floor(ms / 1000);
    const h = Math.floor(sTotal / 3600).toString().padStart(2, '0');
    const m = Math.floor((sTotal % 3600) / 60).toString().padStart(2, '0');
    const s = (sTotal % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const isAssistant = currentUser?.role === 'ASISTEN_ADMIN';

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic">SO</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Login Operasional</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Masukkan NPP Anda</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="NPP Petugas" className="w-full px-6 py-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all font-bold" value={loginNpp} onChange={e => setLoginNpp(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full px-6 py-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all font-bold" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-colors">MASUK PANEL</button>
            <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600">KEMBALI KE DISPLAY</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white px-8 py-4 shadow-sm flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded-xl text-white font-black px-3">D-SO</div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase leading-tight tracking-tighter">BPJS Kesehatan KC Jember</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator: {currentUser.name} ({currentUser.role})</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <nav className="bg-slate-100 p-1.5 rounded-2xl flex space-x-1">
            <button onClick={() => setActiveTab('service')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'service' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Layanan</button>
            {!isAssistant && <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Riwayat</button>}
            {isSuper && <button onClick={() => setActiveTab('users')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Nama FL</button>}
            {isSuper && <button onClick={() => setActiveTab('lokets')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'lokets' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Loket</button>}
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
            <div className="space-y-8">
              {!isAssistant && (
                <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center justify-between shadow-xl shadow-blue-200">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Antrean Menunggu (Terintegrasi)</p>
                      <h3 className="text-xl font-black uppercase">Semua Loket Melayani Urutan Yang Sama</h3>
                    </div>
                  </div>
                  <div className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-3xl shadow-lg">
                    {waitingCount}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {lokets
                  .filter(l => isSuper || l.id === currentUser.assignedLoketId)
                  .map(loket => {
                    const currentQueue = queues.find(q => q.id === loket.currentQueueId);
                    const isCalling = !!currentQueue;
                    const accentColor = loket.color === 'pink' ? 'pink' : loket.color === 'purple' ? 'purple' : loket.color === 'emerald' ? 'emerald' : 'blue';
                    const assignedUser = users.find(u => u.assignedLoketId === loket.id);
                    const userIsAssistant = assignedUser?.role === 'ASISTEN_ADMIN';
                    
                    return (
                      <div key={loket.id} className={`bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[520px] transition-all`}>
                        <div className={`absolute top-0 left-0 w-full h-2 bg-${accentColor}-600`}></div>
                        <div className="space-y-6">
                          <div className="flex justify-between items-start">
                             <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{loket.name}</h4>
                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${userIsAssistant ? 'bg-amber-100 text-amber-600' : isCalling ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                               {userIsAssistant ? 'ASISTEN' : isCalling ? 'MELAYANI' : 'STANDBY'}
                             </span>
                          </div>

                          {userIsAssistant ? (
                            <div className="space-y-6">
                              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
                                <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4">Catatan Layanan Mandiri</h5>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nomor Kartu (13 Digit)</label>
                                    <input 
                                      type="text" 
                                      maxLength={13}
                                      placeholder="Contoh: 0001234567890"
                                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-amber-500"
                                      value={assistantCardNumbers[loket.id] || ''}
                                      onChange={e => setAssistantCardNumbers(prev => ({ ...prev, [loket.id]: e.target.value.replace(/\D/g, '') }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jenis Layanan</label>
                                    <select 
                                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-amber-500"
                                      value={selectedServices[loket.id] || ''}
                                      onChange={e => setSelectedServices(prev => ({ ...prev, [loket.id]: e.target.value }))}
                                    >
                                      <option value="">-- Pilih Layanan --</option>
                                      {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                  <button 
                                    onClick={() => handleAssistantSubmit(loket.id)}
                                    className="w-full py-4 bg-amber-600 text-white font-black rounded-xl shadow-lg hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest mt-2"
                                  >
                                    Simpan Catatan
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="bg-slate-50 rounded-3xl p-10 flex flex-col items-center border border-slate-100 shadow-inner">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nomor Antrean</span>
                                <span className={`text-8xl font-black tabular-nums tracking-tighter ${isCalling ? `text-${accentColor}-600` : 'text-slate-200'}`}>{currentQueue ? `${currentQueue.prefix}-${currentQueue.number.toString().padStart(3, '0')}` : '---'}</span>
                              </div>
                              
                              {isCalling && currentQueue && (
                                <div className="grid grid-cols-1 gap-2">
                                  <SLATimer startTime={currentQueue.timestamp} endTime={currentQueue.startTime} type="WAIT" label="Tunggu" />
                                  <SLATimer startTime={currentQueue.startTime!} type="SERVICE" label="Layanan" />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {!userIsAssistant && (
                          <div className="mt-8">
                             {isCalling ? (
                                <div className="space-y-3">
                                  <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={selectedServices[loket.id] || ''} onChange={e => setSelectedServices(prev => ({ ...prev, [loket.id]: e.target.value }))}>
                                    <option value="">-- Pilih Jenis Layanan --</option>
                                    {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <button onClick={() => { if(!selectedServices[loket.id]) return alert('Pilih jenis layanan!'); onComplete(loket.id, selectedServices[loket.id]); setSelectedServices(prev => { const n = {...prev}; delete n[loket.id]; return n; }); }} className={`w-full py-5 bg-${accentColor}-600 text-white font-black rounded-2xl shadow-lg hover:brightness-110 uppercase text-[10px] tracking-widest`}>Selesai Melayani</button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <button disabled={waitingCount === 0} onClick={() => onCallNext(loket.id, currentUser.npp)} className={`w-full py-6 bg-${accentColor}-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-20 uppercase text-[10px] tracking-widest hover:brightness-110`}>Panggil Berikutnya ({waitingCount})</button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                })}
              </div>
            </div>
          )}

          {activeTab === 'users' && isSuper && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-8 px-2">
                 <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Database Petugas</h3>
                 <button onClick={() => setIsAddUserModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">TAMBAH NAMA FL</button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5">Nama</th>
                        <th className="px-8 py-5">NPP</th>
                        <th className="px-8 py-5">Loket</th>
                        <th className="px-8 py-5">Peran</th>
                        <th className="px-8 py-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="px-8 py-5 font-black text-slate-800">{u.name}</td>
                          <td className="px-8 py-5 font-mono font-bold text-slate-600">{u.npp}</td>
                          <td className="px-8 py-5">
                             <select className="bg-slate-100 rounded-lg text-xs font-bold py-1 px-2" value={u.assignedLoketId || ''} onChange={(e) => handleAssignPetugas(e.target.value, u.npp)}>
                               <option value="">-- Kosong --</option>
                               {lokets.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                             </select>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600' : u.role === 'ASISTEN_ADMIN' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <button onClick={() => confirm('Hapus petugas?') && onUpdateUsers(users.filter(item => item.id !== u.id))} className="text-red-400 hover:text-red-600">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'lokets' && isSuper && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
               <div className="flex justify-between items-center mb-8 px-2">
                 <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Pengaturan Loket</h3>
                 <button onClick={() => setIsAddLoketModalOpen(true)} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">TAMBAH LOKET BARU</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {lokets.map(l => (
                   <div key={l.id} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex justify-between items-center">
                     <span className="font-black text-slate-800 uppercase">{l.name}</span>
                     <button onClick={() => confirm('Hapus loket?') && onUpdateLokets(lokets.filter(item => item.id !== l.id))} className="text-red-400">Hapus</button>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>

      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-6">Tambah Nama FL</h3>
            <div className="space-y-4">
              <input type="text" className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold" placeholder="Nama Lengkap" onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input type="text" className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold" placeholder="NPP" onChange={e => setNewUser({...newUser, npp: e.target.value})} />
              <input type="email" className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold" placeholder="Email" onChange={e => setNewUser({...newUser, email: e.target.value})} />
              <select className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                <option value="ADMIN">ADMIN (ANTREAN)</option>
                <option value="ASISTEN_ADMIN">ASISTEN (PENDAFTARAN)</option>
                <option value="SUPER_ADMIN">SUPER ADMIN</option>
              </select>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold">Batal</button>
                <button onClick={() => { onUpdateUsers([...users, { ...newUser, id: Date.now().toString() } as User]); setIsAddUserModalOpen(false); }} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddLoketModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 mb-6">Buka Loket Baru</h3>
            <div className="space-y-4">
              <input type="text" className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold" placeholder="Contoh: LOKET 4" onChange={e => setNewLoket({...newLoket, name: e.target.value})} />
              <select className="w-full px-5 py-3 bg-slate-50 border rounded-xl font-bold" onChange={e => setNewLoket({...newLoket, color: e.target.value})}>
                <option value="blue">Biru</option>
                <option value="pink">Pink</option>
                <option value="purple">Ungu</option>
                <option value="emerald">Hijau</option>
              </select>
              <div className="flex space-x-3 pt-4">
                <button onClick={() => setIsAddLoketModalOpen(false)} className="flex-1 py-3 text-slate-400 font-bold">Batal</button>
                <button onClick={() => { onUpdateLokets([...lokets, { ...newLoket, id: `loket-${Date.now()}` } as Loket]); setIsAddLoketModalOpen(false); }} className="flex-1 py-3 bg-purple-600 text-white font-black rounded-xl">Aktifkan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
