
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QueueStatus, QueueItem, Loket, AppState, User } from './types.ts';
import Header from './components/Header.tsx';
import QueueButton from './components/QueueButton.tsx';
import LoketSection from './components/LoketSection.tsx';
import WaitingPanel from './components/WaitingPanel.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import TicketModal from './components/TicketModal.tsx';

const STORAGE_KEY = 'bpjs_jember_so_shared_v11';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwgKhA3N2DutVFYYBUv5F9tAWccmJQtTcBQzrxW5l8ii432QXN-HgyR5A4rDvUb12JdFA/exec';
const TARGET_SPREADSHEET_ID = '1FBK_y9mcqqNOkaw9kI9zJASO58RB4Rf48XQR1huozp8';
const TARGET_SHEET_NAME = 'NEWRekap';
const TARGET_SHEET_URL = `https://docs.google.com/spreadsheets/d/${TARGET_SPREADSHEET_ID}/edit`;

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

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

const getVal = (row: any, ...keys: string[]) => {
  if (!row) return null;
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const target = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === target);
    if (found) return row[found];
  }
  return null;
};

const mapCloudRowToQueueItem = (row: any, index: number): QueueItem | null => {
  const nomerRaw = (getVal(row, "Nomor Antrean", "noantrean", "nomer") || "").toString().trim();
  if (!nomerRaw || nomerRaw === "" || nomerRaw.toLowerCase() === "nomor antrean") return null;

  const rawStatus = (getVal(row, "Status Pengerjaan", "status") || "").toString().trim().toUpperCase();
  
  let prefix = "A";
  let number = 0;
  
  if (nomerRaw.includes('-')) {
    const parts = nomerRaw.split('-');
    prefix = parts[0].trim().toUpperCase();
    number = parseInt(parts[1].trim()) || 0;
  } else {
    const match = nomerRaw.match(/^([a-zA-Z]+)?\s*(\d+)$/);
    if (match) {
      prefix = (match[1] || "A").trim().toUpperCase();
      number = parseInt(match[2]) || 0;
    }
  }
  
  let status: QueueStatus = QueueStatus.WAITING;
  // Deteksi status Indonesia atau Inggris
  if (rawStatus.includes('DILAYANI') || rawStatus.includes('CALL') || rawStatus.includes('PANGGIL')) {
    status = QueueStatus.CALLING;
  } else if (rawStatus.includes('SELESAI') || rawStatus.includes('COMPLET') || rawStatus.includes('DONE')) {
    status = QueueStatus.COMPLETED;
  } else if (rawStatus.includes('MENUNGGU') || rawStatus.includes('WAITING') || rawStatus.includes('WAIT')) {
    status = QueueStatus.WAITING;
  }

  const dateStr = getLocalDate();
  const timeStr = getVal(row, "Waktu Ambil", "waktu", "jam") || "00:00:00";
  let timestamp = new Date(`${dateStr}T${timeStr}`).getTime();
  if (isNaN(timestamp)) timestamp = Date.now() - (1000000 - index);

  const loketRaw = getVal(row, "Loket") || "";
  const loketId = loketRaw ? `loket-${loketRaw.toString().replace(/[^0-9]/g, '')}` : undefined;

  return {
    id: `q-${nomerRaw}-${dateStr}-${index}`,
    number,
    prefix,
    rawNumber: nomerRaw, 
    status,
    timestamp,
    loketId,
    serviceType: getVal(row, "Jenis Layanan", "layanan"),
    handledByNpp: getVal(row, "handledByNpp", "NPP Petugas"),
    cardNumber: getVal(row, "Noka", "Nomor Kartu")
  };
};

const getTimeString = (ts: number) => new Date(ts).toTimeString().split(' ')[0];

const formatDuration = (ms: number) => {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const today = getLocalDate();
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
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  const [isInitializing, setIsInitializing] = useState(true);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const fetchGlobalState = useCallback(async (force = false) => {
    if (!state.gasUrl || (isSyncingRef.current && !force)) return;
    
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const url = `${state.gasUrl}?action=getState&sheet=${TARGET_SHEET_NAME}&_=${Date.now()}`;
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      
      if (!response.ok) throw new Error();
      const cloudData = await response.json();
      
      if (cloudData && Array.isArray(cloudData.queues)) {
        const mappedQueues = cloudData.queues
          .map((row: any, idx: number) => mapCloudRowToQueueItem(row, idx))
          .filter((q: any): q is QueueItem => q !== null);

        setState(prev => ({
          ...prev,
          queues: mappedQueues,
          lokets: cloudData.lokets || prev.lokets,
          nextNumber: cloudData.nextNumber || prev.nextNumber,
          nextMjknNumber: cloudData.nextMjknNumber || prev.nextMjknNumber,
          lastDate: getLocalDate()
        }));
        setSyncStatus('success');
        setLastSyncTime(new Date().toLocaleTimeString());
        setTimeout(() => setSyncStatus('idle'), 1500);
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
      setIsInitializing(false);
    }
  }, [state.gasUrl]);

  const pushToCloud = async (actionPayload: any) => {
    if (!state.gasUrl) return;
    setSyncStatus('syncing');
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          ...actionPayload, 
          sheet: TARGET_SHEET_NAME,
          fullState: state 
        })
      });
      setSyncStatus('success');
      setTimeout(() => fetchGlobalState(true), 1000);
    } catch (e) {
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    fetchGlobalState(true);
    const interval = setInterval(() => fetchGlobalState(), 5000);
    return () => clearInterval(interval);
  }, [fetchGlobalState]);

  const handleTakeQueue = useCallback((type: 'REGULAR' | 'MJKN') => {
    const timestamp = Date.now();
    const isMjkn = type === 'MJKN';
    const dateStr = getLocalDate();
    const number = isMjkn ? state.nextMjknNumber : state.nextNumber;
    const prefix = isMjkn ? 'MJKN' : 'A';
    const formattedNo = `${prefix}-${number.toString().padStart(3, '0')}`;
    
    const newTicket: QueueItem = {
      id: `q-${formattedNo}-${dateStr}-${timestamp}`,
      number,
      prefix,
      rawNumber: formattedNo,
      status: QueueStatus.WAITING,
      timestamp
    };

    setLastGeneratedTicket(newTicket);
    const nextNumber = isMjkn ? state.nextNumber : state.nextNumber + 1;
    const nextMjknNumber = isMjkn ? state.nextMjknNumber + 1 : state.nextMjknNumber;

    setState(prev => ({
      ...prev,
      queues: [...prev.queues, newTicket],
      nextNumber,
      nextMjknNumber
    }));

    pushToCloud({
      action: 'ADD',
      "Nomor Antrean": formattedNo,
      "Status Pengerjaan": "Menunggu",
      "Tanggal": dateStr,
      "Waktu Ambil": getTimeString(timestamp),
      nextNumber,
      nextMjknNumber
    });
  }, [state.nextNumber, state.nextMjknNumber, state.gasUrl]);

  const handleCallNext = useCallback((loketId: string, npp: string) => {
    const user = state.users.find(u => u.npp === npp);
    const isAsisten = user?.role === 'ASISTEN_ADMIN';
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    
    const waitingQueues = state.queues
      .filter(q => q.status === QueueStatus.WAITING && (isAdmin || q.prefix === 'MJKN'))
      .sort((a, b) => a.timestamp - b.timestamp);

    const nextInLine = waitingQueues[0];

    if (!nextInLine) {
      const typeLabel = isAsisten ? "MJKN" : "Apapun (A atau MJKN)";
      alert(`Antrean ${typeLabel} dengan status MENUNGGU tidak ditemukan di Spreadsheet.`);
      fetchGlobalState(true);
      return;
    }

    const startTime = Date.now();
    const loketObj = state.lokets.find(l => l.id === loketId);
    const loketName = loketObj?.name || `LOKET ${loketId.split('-').pop()}`;

    setState(prev => {
      const updatedQueues = prev.queues.map(q => q.id === nextInLine.id ? { ...q, status: QueueStatus.CALLING, loketId, handledByNpp: npp, startTime } : q);
      const updatedLokets = prev.lokets.map(l => l.id === loketId ? { ...l, currentQueueId: nextInLine.id } : l);
      
      pushToCloud({
        action: 'UPDATE',
        "Nomor Antrean": nextInLine.rawNumber,
        "Status Pengerjaan": "Dilayani",
        "Waktu Panggil": getTimeString(startTime),
        "Loket": loketName,
        "Nama FL (Petugas)": user?.name || npp,
        "handledByNpp": npp
      });

      return { ...prev, queues: updatedQueues, lokets: updatedLokets };
    });
  }, [state.queues, state.lokets, state.users, fetchGlobalState]);

  const handleCompleteQueue = useCallback((loketId: string, serviceType: string, cardNumber?: string) => {
    const currentLoket = state.lokets.find(l => l.id === loketId);
    const queueItem = state.queues.find(q => q.id === currentLoket?.currentQueueId);
    if (!queueItem) return;

    const endTime = Date.now();
    const waitMs = queueItem.startTime ? (queueItem.startTime - queueItem.timestamp) : 0;
    const serviceMs = (endTime - (queueItem.startTime || endTime));

    setState(prev => {
      const updatedQueues = prev.queues.map(q => q.id === queueItem.id ? { ...q, status: QueueStatus.COMPLETED, endTime, serviceType, cardNumber } : q);
      const updatedLokets = prev.lokets.map(l => l.id === loketId ? { ...l, currentQueueId: undefined } : l);
      
      pushToCloud({
        action: 'UPDATE',
        "Nomor Antrean": queueItem.rawNumber,
        "Status Pengerjaan": "Selesai",
        "Waktu Selesai": getTimeString(endTime),
        "Jenis Layanan": serviceType,
        "Waktu Tunggu": formatDuration(waitMs),
        "Waktu Layanan": formatDuration(serviceMs),
        "Noka": cardNumber || ''
      });

      return { ...prev, queues: updatedQueues, lokets: updatedLokets };
    });
  }, [state.lokets, state.queues, state.gasUrl]);

  if (isInitializing && state.queues.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-slate-800 uppercase italic">Sinkronisasi Jember...</h2>
        <p className="text-slate-500 text-sm mt-2 animate-pulse font-medium">Memastikan status layanan terupdate...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <button 
        onClick={() => fetchGlobalState(true)}
        className={`fixed top-4 right-4 px-5 py-2.5 rounded-full shadow-xl flex flex-col items-start border z-[100] transition-all duration-500 hover:scale-105 active:scale-95 ${
        syncStatus === 'syncing' ? 'bg-white border-blue-100' : 
        syncStatus === 'success' ? 'bg-emerald-50 border-emerald-200' : 
        syncStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-ping' : syncStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'syncing' ? 'text-blue-600' : syncStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
            {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'success' ? 'Cloud Connected' : syncStatus === 'error' ? 'Sync Error' : 'Refresh Data'}
          </span>
        </div>
        <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Last Sync: {lastSyncTime}</span>
      </button>

      <div className="w-full max-w-5xl space-y-12">
        <Header />
        <div className="flex flex-col items-center space-y-16">
          <QueueButton onClick={handleTakeQueue} />
          
          <LoketSection 
            lokets={state.lokets} 
            queues={state.queues} 
            users={state.users} 
            nextQueue={state.queues.filter(q => q.status === QueueStatus.WAITING).sort((a,b) => a.timestamp - b.timestamp)[0]}
          />

          <WaitingPanel count={state.queues.filter(q => q.status === QueueStatus.WAITING).length} />
          
          <div className="flex flex-col items-center space-y-6">
             <button onClick={() => setIsAdminOpen(true)} className="group flex items-center space-x-3 text-slate-500 hover:text-blue-600 transition-all bg-white px-8 py-3 rounded-full shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-1">
                <div className="bg-slate-100 group-hover:bg-blue-100 p-2 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">Panel Operasional Petugas</span>
             </button>
             <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em] animate-pulse italic text-center max-w-sm">
               Status Antrean: Menunggu, Dilayani, dan Selesai.
             </p>
          </div>
        </div>
      </div>

      {isAdminOpen && (
        <AdminPanel 
          lokets={state.lokets} queues={state.queues} users={state.users} serviceTypes={state.serviceTypes} 
          gasUrl={state.gasUrl} spreadsheetUrl={state.spreadsheetUrl} onClose={() => setIsAdminOpen(false)}
          onReset={() => { if(confirm('⚠️ Reset Harian: Kosongkan seluruh antrean di Spreadsheet?')) setState(prev => ({...prev, queues: [], nextNumber: 1, nextMjknNumber: 1})); }}
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
