
import React, { useState, useEffect, useCallback } from 'react';
import { QueueStatus, QueueItem, Loket, AppState, User, AssistantRecord } from './types.ts';
import Header from './components/Header.tsx';
import QueueButton from './components/QueueButton.tsx';
import LoketSection from './components/LoketSection.tsx';
import WaitingPanel from './components/WaitingPanel.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import TicketModal from './components/TicketModal.tsx';

// Menggunakan key yang lebih spesifik untuk mencegah konflik
const STORAGE_KEY = 'bpjs_jember_so_permanent_v1';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwgKhA3N2DutVFYYBUv5F9tAWccmJQtTcBQzrxW5l8ii432QXN-HgyR5A4rDvUb12JdFA/exec';
const TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FBK_y9mcqqNOkaw9kI9zJASO58RB4Rf48XQR1huozp8/edit?usp=sharing';

const DEFAULT_LOKETS: Loket[] = [
  { id: 'loket-1', name: 'LOKET 1', color: 'blue' },
  { id: 'loket-2', name: 'LOKET 2', color: 'pink' },
  { id: 'loket-3', name: 'LOKET 3', color: 'purple' },
];

const DEFAULT_USERS: User[] = [
  { id: 'u-super', name: 'nur syamsia octavia', npp: '08193', email: 'nur.syamsia@bpjs-kesehatan.go.id', role: 'SUPER_ADMIN' },
  { id: 'u1', name: 'Putri Oktavia Gupitasari', npp: '220060', email: 'putri.oktavia@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-1' },
  { id: 'u2', name: 'Anisa Dea Suryani', npp: '250168', email: '250168.anisa@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-2' },
  { id: 'u3', name: 'Fahri Wardiansah', npp: '250137', email: '250137.fahri@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-3' },
  { id: 'u-assist', name: 'Asisten Layanan', npp: '99999', email: 'asisten@bpjs-kesehatan.go.id', role: 'ASISTEN_ADMIN' },
];

const DEFAULT_SERVICE_TYPES = [
  "Pindah faskes melalui pandawa/mjkn",
  "Peralihan segmen ke PBPU dengan 14 hari melalui pandawa/mjkn",
  "Perubahan identitas/alamat melalui pandawa/mjkn",
  "Update surat keterangan kuliah melalui pandawa",
  "Penambahan anggota keluarga PPU melalui pandawa",
  "Pendaftaran baru/anggota keluarga PBPU pandawa/mjkn",
  "Perubahan administrasi lainnya",
  "Permintaan informasi lainnya",
  "Penonaktifan meninggal dunia",
  "Registrasi aplikasi MJKN",
  "Pendaftaran/perubahan autodebet",
  "Daftar BBL melalui pandawa",
  "Update virtual account pembayaran",
  "Pendaftaran program rehab",
  "Tidak bisa dilayani di SO"
];

const getTimeString = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toTimeString().split(' ')[0];
};

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;

    // Data Master (Users, Lokets, ServiceTypes) harus selalu dari storage atau default, tidak reset per hari
    const masterData = {
      users: parsed?.users || DEFAULT_USERS,
      lokets: (parsed?.lokets || DEFAULT_LOKETS).map((l: Loket) => ({
        ...l,
        currentQueueId: parsed?.lastDate === today ? l.currentQueueId : undefined // Reset status pemanggilan loket jika hari baru
      })),
      serviceTypes: parsed?.serviceTypes || DEFAULT_SERVICE_TYPES,
      gasUrl: parsed?.gasUrl || DEFAULT_GAS_URL,
      spreadsheetUrl: parsed?.spreadsheetUrl || TARGET_SHEET_URL,
    };

    // Data Transaksi (Queues, Numbers) reset HANYA jika tanggal berganti
    const transactionData = {
      queues: parsed?.lastDate === today ? (parsed?.queues || []) : [],
      assistantRecords: parsed?.lastDate === today ? (parsed?.assistantRecords || []) : [],
      nextNumber: parsed?.lastDate === today ? (parsed?.nextNumber || 1) : 1,
      nextMjknNumber: parsed?.lastDate === today ? (parsed?.nextMjknNumber || 1) : 1,
      lastDate: today,
    };

    return { ...masterData, ...transactionData };
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [lastGeneratedTicket, setLastGeneratedTicket] = useState<QueueItem | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Efek untuk menyimpan setiap kali ada perubahan state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const syncToSheets = async (payload: any) => {
    if (!state.gasUrl) return;
    setSyncStatus('syncing');
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      setSyncStatus('idle');
    } catch (e) {
      console.error('Cloud Sync Error:', e);
      setSyncStatus('error');
    }
  };

  const handleTakeQueue = useCallback((type: 'REGULAR' | 'MJKN') => {
    const timestamp = Date.now();
    const isMjkn = type === 'MJKN';
    const dateStr = new Date().toISOString().split('T')[0];
    
    setState(prev => {
      const number = isMjkn ? prev.nextMjknNumber : prev.nextNumber;
      const prefix = isMjkn ? 'MJKN' : 'A';
      
      const newTicket: QueueItem = {
        id: `q-${timestamp}`,
        number: number,
        prefix: prefix,
        status: QueueStatus.WAITING,
        timestamp: timestamp
      };

      setLastGeneratedTicket(newTicket);

      syncToSheets({
        action: 'ADD',
        "Nomor Antrean": `${prefix}-${number.toString().padStart(3, '0')}`,
        "Status Pengerjaan": "WAITING",
        "Tanggal": dateStr,
        "Waktu Ambil": getTimeString(timestamp)
      });

      return {
        ...prev,
        queues: [...prev.queues, newTicket],
        nextNumber: isMjkn ? prev.nextNumber : prev.nextNumber + 1,
        nextMjknNumber: isMjkn ? prev.nextMjknNumber + 1 : prev.nextMjknNumber
      };
    });
  }, [state.gasUrl]);

  const handleCallNext = useCallback((loketId: string, npp: string) => {
    const user = state.users.find(u => u.npp === npp);
    const isAsisten = user?.role === 'ASISTEN_ADMIN';
    const targetPrefix = isAsisten ? 'MJKN' : 'A';
    
    const nextInLine = state.queues
      .filter(q => q.status === QueueStatus.WAITING && q.prefix === targetPrefix)
      .sort((a, b) => a.number - b.number)[0];

    if (!nextInLine) return;

    const startTime = Date.now();
    const loketName = state.lokets.find(l => l.id === loketId)?.name || loketId;

    setState(prev => {
      const updatedQueues = prev.queues.map(q => q.id === nextInLine.id ? { ...q, status: QueueStatus.CALLING, loketId, handledByNpp: npp, startTime } : q);
      const updatedLokets = prev.lokets.map(l => l.id === loketId ? { ...l, currentQueueId: nextInLine.id } : l);
      
      syncToSheets({
        action: 'UPDATE',
        "Nomor Antrean": `${nextInLine.prefix}-${nextInLine.number.toString().padStart(3, '0')}`,
        "Status Pengerjaan": "CALLING",
        "Waktu Panggil": getTimeString(startTime),
        "Loket": loketName,
        "Nama FL (Petugas)": user?.name || npp
      });

      return { ...prev, queues: updatedQueues, lokets: updatedLokets };
    });
  }, [state.queues, state.lokets, state.users, state.gasUrl]);

  const handleCompleteQueue = useCallback((loketId: string, serviceType: string, cardNumber?: string) => {
    const currentLoket = state.lokets.find(l => l.id === loketId);
    if (!currentLoket?.currentQueueId) return;
    const queueItem = state.queues.find(q => q.id === currentLoket.currentQueueId);
    if (!queueItem) return;

    const endTime = Date.now();
    const user = state.users.find(u => u.npp === queueItem.handledByNpp);
    const waitMs = queueItem.startTime ? (queueItem.startTime - queueItem.timestamp) : 0;
    const serviceMs = (endTime - (queueItem.startTime || endTime));

    setState(prev => {
      const updatedQueues = prev.queues.map(q => q.id === currentLoket.currentQueueId ? { ...q, status: QueueStatus.COMPLETED, endTime, serviceType, cardNumber } : q);
      const updatedLokets = prev.lokets.map(l => l.id === loketId ? { ...l, currentQueueId: undefined } : l);
      
      syncToSheets({
        action: 'UPDATE',
        "Nomor Antrean": `${queueItem.prefix}-${queueItem.number.toString().padStart(3, '0')}`,
        "Status Pengerjaan": "COMPLETED",
        "Waktu Selesai": getTimeString(endTime),
        "Jenis Layanan": serviceType,
        "Waktu Tunggu": formatDuration(waitMs),
        "Kesesuaian Waktu Tunggu": waitMs <= 30 * 60 * 1000 ? "SESUAI" : "TIDAK SESUAI",
        "Waktu Layanan": formatDuration(serviceMs),
        "Kesesuaian Waktu Layanan": serviceMs <= 15 * 60 * 1000 ? "SESUAI" : "TIDAK SESUAI",
        "Nama FL (Petugas)": user?.name || queueItem.handledByNpp || '',
        "Noka": cardNumber || ''
      });

      return { ...prev, queues: updatedQueues, lokets: updatedLokets };
    });
  }, [state.lokets, state.queues, state.users, state.gasUrl]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      {syncStatus !== 'idle' && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 border z-[100] ${syncStatus === 'syncing' ? 'bg-white border-blue-100' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-ping' : 'bg-red-500'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'syncing' ? 'text-blue-600' : 'text-red-600'}`}>
            {syncStatus === 'syncing' ? 'Cloud Sync...' : 'Sync Error!'}
          </span>
        </div>
      )}
      <div className="w-full max-w-4xl space-y-12">
        <Header />
        <div className="flex flex-col items-center space-y-16">
          <QueueButton onClick={handleTakeQueue} />
          <LoketSection 
            lokets={state.lokets} 
            queues={state.queues} 
            users={state.users} 
            nextQueue={state.queues.filter(q => q.status === QueueStatus.WAITING).sort((a,b) => a.number - b.number)[0]}
          />
          <WaitingPanel count={state.queues.filter(q => q.status === QueueStatus.WAITING).length} />
          <button onClick={() => setIsAdminOpen(true)} className="flex items-center space-x-2 text-slate-400 hover:text-blue-600 transition-colors bg-white px-6 py-2 rounded-full shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            <span>Panel Operasional</span>
          </button>
        </div>
      </div>
      {isAdminOpen && (
        <AdminPanel 
          lokets={state.lokets} queues={state.queues} users={state.users} serviceTypes={state.serviceTypes} 
          gasUrl={state.gasUrl} spreadsheetUrl={state.spreadsheetUrl} onClose={() => setIsAdminOpen(false)}
          onReset={() => { if(confirm('Reset semua antrean?')) setState(prev => ({...prev, queues: [], nextNumber: 1, nextMjknNumber: 1})); }}
          onCallNext={handleCallNext} onComplete={handleCompleteQueue} 
          onUpdateUsers={(u) => setState(prev => ({...prev, users: u}))}
          onUpdateServiceTypes={(t) => setState(prev => ({...prev, serviceTypes: t}))}
          onUpdateGasUrl={(url) => setState(prev => ({...prev, gasUrl: url.trim()}))}
          onUpdateSpreadsheetUrl={(url) => setState(prev => ({...prev, spreadsheetUrl: url.trim()}))}
          onUpdateLokets={(l) => setState(prev => ({...prev, lokets: l}))}
        />
      )}
      {lastGeneratedTicket && <TicketModal ticket={lastGeneratedTicket} onClose={() => setLastGeneratedTicket(null)} />}
    </div>
  );
};

export default App;
