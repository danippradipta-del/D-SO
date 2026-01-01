
import React, { useState, useEffect, useMemo } from 'react';
import { Loket, QueueItem, QueueStatus, User, UserRole } from '../types';

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
  const [activeTab, setActiveTab] = useState<'service' | 'users' | 'lokets' | 'history' | 'settings'>('service');
  const [selectedServices, setSelectedServices] = useState<{ [key: string]: string }>({});
  
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
      if (u.npp === userNpp) {
        return { ...u, assignedLoketId: loketId };
      }
      if (loketId !== "" && u.assignedLoketId === loketId && u.npp !== userNpp) {
        return { ...u, assignedLoketId: undefined };
      }
      return u;
    });
    onUpdateUsers(updatedUsers);
  };

  const formatDuration = (ms: number) => {
    const sTotal = Math.floor(ms / 1000);
    const h = Math.floor(sTotal / 3600).toString().padStart(2, '0');
    const m = Math.floor((sTotal % 3600) / 60).toString().padStart(2, '0');
    const s = (sTotal % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.npp || !newUser.email) {
      alert('Mohon isi semua data!');
      return;
    }
    const userToAdd: User = {
      id: `u-${Date.now()}`,
      name: newUser.name as string,
      npp: newUser.npp as string,
      email: newUser.email as string,
      role: newUser.role as UserRole,
      assignedLoketId: newUser.assignedLoketId
    };
    onUpdateUsers([...users, userToAdd]);
    setIsAddUserModalOpen(false);
    setNewUser({ role: 'ADMIN' });
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri!');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus Nama FL (Petugas) ini?')) {
      onUpdateUsers(users.filter(u => u.id !== id));
    }
  };

  const handleAddLoket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoket.name) return;
    const loketToAdd: Loket = {
      id: `loket-${Date.now()}`,
      name: newLoket.name.toUpperCase(),
      color: newLoket.color || 'blue'
    };
    onUpdateLokets([...lokets, loketToAdd]);
    setIsAddLoketModalOpen(false);
    setNewLoket({ color: 'blue' });
  };

  const handleDeleteLoket = (id: string) => {
    if (lokets.length <= 1) return alert('Minimal harus ada 1 loket!');
    if (confirm('Hapus loket ini?')) {
      onUpdateLokets(lokets.filter(l => l.id !== id));
      onUpdateUsers(users.map(u => u.assignedLoketId === id ? { ...u, assignedLoketId: undefined } : u));
    }
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic">SO</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Login Operasional</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium">Gunakan NPP Anda untuk masuk ke sistem</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="NPP Nama FL (Petugas)" className="w-full px-6 py-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all font-bold" value={loginNpp} onChange={e => setLoginNpp(e.target.value)} required />
            <input type="password" placeholder="Password (Default: 12345678)" className="w-full px-6 py-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all font-bold" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-colors">MASUK PANEL</button>
            <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600">KEMBALI KE DISPLAY</button>
          </form>
        </div>
      </div>
    );
  }

  const isSuper = currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white px-8 py-4 shadow-sm flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded-xl text-white font-black px-3">D-SO</div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase leading-tight tracking-tighter">BPJS Kesehatan KC Jember</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator: {currentUser.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <nav className="bg-slate-100 p-1.5 rounded-2xl flex space-x-1">
            <button onClick={() => setActiveTab('service')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'service' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Layanan</button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Riwayat</button>
            {isSuper && <button onClick={() => setActiveTab('users')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Nama FL (Petugas)</button>}
            {isSuper && <button onClick={() => setActiveTab('lokets')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'lokets' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Loket</button>}
            {isSuper && <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Sistem</button>}
          </nav>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          {isSuper && spreadsheetUrl && (
            <a 
              href={spreadsheetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>Spreadsheet</span>
            </a>
          )}

          <button onClick={() => setCurrentUser(null)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg></button>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'service' && (
            <div className="space-y-8">
              {/* Summary Indicator for All Admins */}
              <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center justify-between shadow-xl shadow-blue-200">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Antrean Menunggu Saat Ini</p>
                    <h3 className="text-xl font-black uppercase">Panggil Peserta Berikutnya</h3>
                  </div>
                </div>
                <div className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-3xl shadow-lg">
                  {waitingCount}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {lokets
                  .filter(l => isSuper || l.id === currentUser.assignedLoketId)
                  .map(loket => {
                    const currentQueue = queues.find(q => q.id === loket.currentQueueId);
                    const isCalling = !!currentQueue;
                    const accentColor = loket.color === 'pink' ? 'pink' : loket.color === 'purple' ? 'purple' : 'blue';
                    const assignedUser = users.find(u => u.assignedLoketId === loket.id);
                    
                    return (
                      <div key={loket.id} className={`bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[520px] transition-all hover:border-blue-200`}>
                        <div className={`absolute top-0 left-0 w-full h-2 bg-${accentColor}-600`}></div>
                        <div className="space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 mr-4">
                               <h4 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{loket.name}</h4>
                               
                               <div className="mt-2 space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Petugas Aktif:</label>
                                 {isSuper ? (
                                   <select 
                                     className="block w-full text-[11px] font-bold bg-slate-50 border border-slate-100 rounded-lg focus:ring-1 ring-blue-500 py-2 px-3 outline-none"
                                     value={assignedUser?.npp || ''}
                                     onChange={(e) => handleAssignPetugas(loket.id, e.target.value)}
                                   >
                                     <option value="">-- Tidak Ada Petugas --</option>
                                     {users.map(u => <option key={u.id} value={u.npp}>{u.name} ({u.npp})</option>)}
                                   </select>
                                 ) : (
                                   <div className="bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-[11px] font-bold text-slate-700">
                                     {assignedUser ? `${assignedUser.name} (${assignedUser.npp})` : '-- Tidak Ada Petugas --'}
                                   </div>
                                 )}
                               </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shrink-0 ${isCalling ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>{isCalling ? 'MELAYANI' : 'STANDBY'}</span>
                          </div>

                          <div className="bg-slate-50 rounded-3xl p-10 flex flex-col items-center border border-slate-100 shadow-inner">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nomor Sekarang</span>
                            <span className={`text-8xl font-black tabular-nums tracking-tighter ${isCalling ? `text-${accentColor}-600` : 'text-slate-200'}`}>{currentQueue ? `${currentQueue.prefix}-${currentQueue.number.toString().padStart(3, '0')}` : '---'}</span>
                          </div>
                          
                          {isCalling && currentQueue && (
                            <div className="grid grid-cols-1 gap-2">
                              <SLATimer startTime={currentQueue.timestamp} endTime={currentQueue.startTime} type="WAIT" label="Waktu Tunggu" />
                              <SLATimer startTime={currentQueue.startTime!} type="SERVICE" label="Durasi Layanan" />
                            </div>
                          )}
                        </div>

                        <div className="mt-8">
                          {!assignedUser ? (
                            <div className="text-center p-4 bg-slate-100 rounded-2xl border border-dashed border-slate-300">
                              <p className="text-[10px] font-black text-slate-400 uppercase italic">Hubungi Super Admin</p>
                            </div>
                          ) : (
                            isCalling ? (
                              <div className="space-y-3">
                                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-blue-500" value={selectedServices[loket.id] || ''} onChange={e => setSelectedServices(prev => ({ ...prev, [loket.id]: e.target.value }))}>
                                  <option value="">-- Pilih Jenis Layanan --</option>
                                  {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button onClick={() => { if(!selectedServices[loket.id]) return alert('Pilih jenis layanan!'); onComplete(loket.id, selectedServices[loket.id]); setSelectedServices(prev => { const n = {...prev}; delete n[loket.id]; return n; }); }} className={`w-full py-5 bg-${accentColor}-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 hover:brightness-110 uppercase text-[10px] tracking-widest`}>Selesai Melayani</button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-center space-x-2 bg-slate-100 py-2 rounded-xl border border-slate-200">
                                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{waitingCount} Antrean Menunggu</span>
                                </div>
                                <button disabled={waitingCount === 0} onClick={() => onCallNext(loket.id, assignedUser.npp)} className={`w-full py-6 bg-${accentColor}-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:grayscale uppercase text-[10px] tracking-widest hover:brightness-110`}>Panggil Berikutnya</button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          )}

          {activeTab === 'users' && isSuper && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-8 px-2">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Database Nama FL (Petugas)</h3>
                    <p className="text-xs text-slate-500 font-medium">Tambah, hapus, atau ganti penempatan petugas</p>
                 </div>
                 <button onClick={() => setIsAddUserModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-blue-700 shadow-lg shadow-blue-200 uppercase tracking-widest transition-all">TAMBAH NAMA FL</button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5">Nama Petugas</th>
                        <th className="px-8 py-5">NPP</th>
                        <th className="px-8 py-5">Penempatan Loket</th>
                        <th className="px-8 py-5">Peran</th>
                        <th className="px-8 py-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5"><div className="font-black text-slate-800 uppercase">{u.name}</div><div className="text-[10px] text-slate-400 font-medium">{u.email}</div></td>
                          <td className="px-8 py-5 font-mono font-bold text-slate-600">{u.npp}</td>
                          <td className="px-8 py-5">
                             <select 
                               className="bg-slate-100 border-none rounded-lg text-xs font-bold py-1 px-2 focus:ring-1 ring-blue-500"
                               value={u.assignedLoketId || ''}
                               onChange={(e) => handleAssignPetugas(e.target.value, u.npp)}
                             >
                               <option value="">-- Belum Ditugaskan --</option>
                               {lokets.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                             </select>
                          </td>
                          <td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role.replace('_', ' ')}</span></td>
                          <td className="px-8 py-5 text-right">
                             <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }} 
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Hapus Petugas"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'lokets' && isSuper && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-8 px-2">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Pengaturan Loket</h3>
                    <p className="text-xs text-slate-500 font-medium">Kelola jumlah loket aktif di sistem</p>
                 </div>
                 <button onClick={() => setIsAddLoketModalOpen(true)} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-[10px] hover:bg-purple-700 shadow-lg shadow-purple-200 uppercase tracking-widest transition-all">TAMBAH LOKET BARU</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {lokets.map(l => (
                   <div key={l.id} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex justify-between items-center">
                     <div>
                       <div className="flex items-center space-x-2">
                         <div className={`w-3 h-3 rounded-full bg-${l.color}-600`}></div>
                         <span className="font-black text-slate-800 uppercase">{l.name}</span>
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold mt-1">Status: {l.currentQueueId ? 'Sibuk' : 'Tersedia'}</p>
                     </div>
                     <button onClick={() => handleDeleteLoket(l.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-8 px-2">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Rekapan Layanan</h3>
                    <p className="text-xs text-slate-500 font-medium">Daftar antrean yang telah selesai dilayani</p>
                 </div>
                 <button onClick={onReset} className="text-[10px] font-black uppercase text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors border border-red-100">RESET HARI INI</button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5">Nomor</th>
                        <th className="px-8 py-5">Nama FL (Petugas)</th>
                        <th className="px-8 py-5">Layanan</th>
                        <th className="px-8 py-5 text-center">Tunggu</th>
                        <th className="px-8 py-5 text-center">Layanan</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                      {completedHistory.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase italic text-xs">Belum ada riwayat layanan</td></tr>
                      ) : completedHistory.map(q => {
                        const handler = users.find(u => u.npp === q.handledByNpp);
                        return (
                          <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 font-black text-slate-800">{q.prefix}-{q.number.toString().padStart(3, '0')}</td>
                            <td className="px-8 py-5 font-bold text-slate-600">{handler?.name || q.handledByNpp}</td>
                            <td className="px-8 py-5 text-slate-500 font-medium text-xs">{q.serviceType}</td>
                            <td className="px-8 py-5 font-mono font-bold text-center text-blue-600">{formatDuration((q.startTime || 0) - q.timestamp)}</td>
                            <td className="px-8 py-5 font-mono font-bold text-center text-purple-600">{formatDuration((q.endTime || 0) - (q.startTime || 0))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'settings' && isSuper && (
            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm space-y-12">
              <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tighter">Konfigurasi Sinkronisasi</h3>
              
              <div className="grid grid-cols-1 gap-8">
                <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100">
                   <h4 className="font-black text-blue-900 mb-4 uppercase text-xs tracking-widest">Alamat Endpoint Google Apps Script</h4>
                   <div className="flex space-x-4">
                     <input 
                       type="text" 
                       className="flex-1 px-6 py-4 bg-white border border-blue-200 rounded-2xl font-bold text-blue-900 outline-none focus:ring-2 ring-blue-500"
                       value={gasUrl || ''}
                       onChange={(e) => onUpdateGasUrl(e.target.value)}
                       placeholder="https://script.google.com/macros/s/..."
                     />
                     <button onClick={() => alert('Endpoint Diperbarui!')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200">Simpan URL</button>
                   </div>
                   <p className="mt-4 text-[10px] text-blue-400 font-bold italic">Catatan: Gunakan URL dari menu "Deploy" di Google Apps Script Anda.</p>
                </div>

                <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100">
                   <h4 className="font-black text-emerald-900 mb-4 uppercase text-xs tracking-widest">Link Google Spreadsheet (Reporting)</h4>
                   <div className="flex space-x-4">
                     <input 
                       type="text" 
                       className="flex-1 px-6 py-4 bg-white border border-emerald-200 rounded-2xl font-bold text-emerald-900 outline-none focus:ring-2 ring-emerald-500"
                       value={spreadsheetUrl || ''}
                       onChange={(e) => onUpdateSpreadsheetUrl(e.target.value)}
                       placeholder="https://docs.google.com/spreadsheets/d/..."
                     />
                     <button onClick={() => alert('Link Spreadsheet Diperbarui!')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200">Simpan Link</button>
                   </div>
                   <p className="mt-4 text-[10px] text-emerald-400 font-bold italic">Catatan: Masukkan URL lengkap spreadsheet tempat data disimpan.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter">Tambah Nama FL Baru</h3>
            <form onSubmit={handleAddUser} className="space-y-4 mt-6">
              <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="Nama Lengkap Petugas" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
              <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="NPP (Contoh: 250123)" value={newUser.npp || ''} onChange={e => setNewUser({...newUser, npp: e.target.value})} required />
              <input type="email" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="Email Kantor" value={newUser.email || ''} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                </select>
                <select className="px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" value={newUser.assignedLoketId || ''} onChange={e => setNewUser({...newUser, assignedLoketId: e.target.value})}>
                  <option value="">-- Loket --</option>
                  {lokets.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex space-x-3 pt-6">
                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Batal</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest">Simpan Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddLoketModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter">Buka Loket Baru</h3>
            <form onSubmit={handleAddLoket} className="space-y-6 mt-6">
              <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="Contoh: LOKET 4" value={newLoket.name || ''} onChange={e => setNewLoket({...newLoket, name: e.target.value})} required />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Pilih Warna</label>
                <div className="grid grid-cols-3 gap-3">
                  {['blue', 'pink', 'purple', 'emerald', 'orange', 'cyan'].map(c => (
                    <button key={c} type="button" onClick={() => setNewLoket({...newLoket, color: c})} className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${newLoket.color === c ? `border-${c}-600 bg-${c}-50 text-${c}-600` : 'border-slate-100 text-slate-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-6">
                <button type="button" onClick={() => setIsAddLoketModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Batal</button>
                <button type="submit" className="flex-1 py-4 bg-purple-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest">Aktifkan Loket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
