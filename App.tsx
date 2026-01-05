
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QueueStatus, QueueItem, Loket, AppState, User } from './types.ts';
import Header from './components/Header.tsx';
import QueueButton from './components/QueueButton.tsx';
import LoketSection from './components/LoketSection.tsx';
import WaitingPanel from './components/WaitingPanel.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import TicketModal from './components/TicketModal.tsx';

const STORAGE_KEY = 'bpjs_jember_so_shared_v4';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwgKhA3N2DutVFYYBUv5F9tAWccmJQtTcBQzrxW5l8ii432QXN-HgyR5A4rDvUb12JdFA/exec';
const TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FBK_y9mcqqNOkaw9kI9zJASO58RB4Rf48XQR1huozp8/edit?usp=sharing';

const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Putri Oktavia Gupitasari', npp: '220060', email: 'putri.oktavia@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-1' },
  { id: 'u2', name: 'Anisa Dea Suryani', npp: '250168', email: '250168.anisa@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-2' },
  { id: 'u3', name: 'Laili', npp: '111111', email: 'laili@gmail.com', role: 'ASISTEN_ADMIN', assignedLoketId: 'loket-3' },
  { id: 'u4', name: 'Pundi', npp: '22222', email: 'pundi@gmail.com', role: 'ASISTEN_ADMIN', assignedLoketId: 'loket-4' },
  { id: 'u5', name: 'Fahri Wardiansah', npp: '250137', email: '250137.fahri@bpjs-kesehatan.go.id', role: 'ADMIN' },
  { id: 'u6', name: "Vina Nihayatus Sa'adah", npp: '05315', email: 'vina.nihayatus@bpjs-kesehatan.go.id', role: 'ADMIN' },
  { id: 'u7', name: 'nur syamsia octavia', npp: '08193', email: 'nur.syamsia@bpjs-kesehatan.go.id', role: 'SUPER_ADMIN' },
  { id: 'u8', name: 'Ririt Eka Agustania', npp: '04586', email: 'ririt.eka@bpjs-kesehatan.go.id', role: 'ADMIN' },
];

const DEFAULT_LOKETS: Loket[] = [
  { id: 'loket-1', name: 'LOKET 1', color: 'blue' },
  { id: 'loket-2', name: 'LOKET 2', color: 'pink' },
  { id: 'loket-3', name: 'LOKET 3', color: 'purple' },
  { id: 'loket-4', name: 'LOKET 4', color: 'emerald' },
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

const getTimeString = (timestamp: number) => new Date(timestamp).toTimeString().split(' ')[0];

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
    const isSameDay = parsed?.lastDate === today;

    return {
      users: parsed?.users || DEFAULT_USERS,
      lokets: parsed?.lokets || DEFAULT_LOKETS,
      serviceTypes: parsed?.serviceTypes || DEFAULT_SERVICE_TYPES,
      gasUrl: parsed?.gasUrl || DEFAULT_GAS_URL,
      spreadsheetUrl: parsed?.spreadsheetUrl || TARGET_SHEET_URL,
      queues: isSameDay ? (parsed?.queues || []) : [],
      assistantRecords: [],
      nextNumber: isSameDay ? (parsed?.nextNumber || 1) : 1,
      nextMjknNumber: isSameDay ? (parsed?.nextMjknNumber || 1) : 1,
      lastDate: today,
    };
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [lastGeneratedTicket, setLastGeneratedTicket] = useState<QueueItem | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  /**
   * FUNGSI UTAMA: MENGAMBIL DATA DARI CLOUD (SPREADSHEET)
   * Ini memastikan semua perangkat memiliki data yang sama.
   */
  const fetchGlobalState = useCallback(async () => {
    if (!state.gasUrl) return;
    
    try {
      // Mengirim GET request ke GAS dengan parameter action=getState
      const response = await fetch(`${state.gasUrl}?action=getState`);
      const cloudData = await response.json();

      if (cloudData && cloudData.queues) {
        setState(prev => {
          // Hanya update jika tanggal sama atau cloud memiliki data terbaru
          const cloudDate = cloudData.lastDate || new Date().toDateString();
          if (cloudDate !== prev.lastDate) {
             // Reset harian jika cloud mendeteksi hari baru
             return { ...prev, queues: [], nextNumber: 1, nextMjknNumber: 1, lastDate: cloudDate };
          }

          return {
            ...prev,
            queues: cloudData.queues,
            lokets: cloudData.lokets || prev.lokets,
            nextNumber: cloudData.nextNumber || prev.nextNumber,
            nextMjknNumber: cloudData.nextMjknNumber || prev.nextMjknNumber,
            users: cloudData.users || prev.users
          };
        });
      }
      setSyncStatus('idle');
    } catch (e) {
      console.warn('Sync Pull Error (Mungkin GAS belum dikonfigurasi untuk GET):', e);
    } finally {
      setIsInitializing(false);
    }
  }, [state.gasUrl]);

  /**
   * SINKRONISASI PUSH: Mengirim perubahan ke Cloud
   */
  const pushToCloud = async (actionPayload: any) => {
    if (!state.gasUrl) return;
    setSyncStatus('syncing');
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...actionPayload, fullState: state })
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (e) {
      console.error('Push Error:', e);
      setSyncStatus('error');
    }
  };

  // Jalankan polling setiap 10 detik untuk mendapatkan data terbaru dari Spreadsheet
  useEffect(() => {
    fetchGlobalState(); // Initial fetch
    const interval = setInterval(fetchGlobalState, 10000); 
    return () => clearInterval(interval);
  }, [fetchGlobalState]);

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

      pushToCloud({
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
      
      pushToCloud({
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
      
      pushToCloud({
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

  if (isInitializing && state.queues.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold animate-pulse">Menghubungkan ke Database Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className={`fixed top-4 right-4 px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 border z-[100] transition-all duration-500 ${
        syncStatus === 'syncing' ? 'bg-white border-blue-100' : 
        syncStatus === 'success' ? 'bg-emerald-50 border-emerald-200' : 
        syncStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-ping' : syncStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'syncing' ? 'text-blue-600' : syncStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {syncStatus === 'syncing' ? 'Cloud Sync...' : syncStatus === 'success' ? 'Tersinkron' : syncStatus === 'error' ? 'Sync Error' : 'Database Terhubung'}
        </span>
      </div>

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
            <span>Panel Operasional (Login NPP)</span>
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
