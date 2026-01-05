
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QueueStatus, QueueItem, Loket, AppState, User } from './types.ts';
import Header from './components/Header.tsx';
import QueueButton from './components/QueueButton.tsx';
import LoketSection from './components/LoketSection.tsx';
import WaitingPanel from './components/WaitingPanel.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import TicketModal from './components/TicketModal.tsx';

const STORAGE_KEY = 'bpjs_jember_so_v15_final';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwgKhA3N2DutVFYYBUv5F9tAWccmJQtTcBQzrxW5l8ii432QXN-HgyR5A4rDvUb12JdFA/exec';
const TARGET_SHEET_NAME = 'NEWRekap';

const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Putri Oktavia Gupitasari', npp: '220060', email: 'putri.oktavia@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-1' },
  { id: 'u2', name: 'Anisa Dea Suryani', npp: '250168', email: '250168.anisa@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-2' },
  { id: 'u3', name: 'Laili', npp: '111111', email: 'laili@gmail.com', role: 'ASISTEN_ADMIN', assignedLoketId: 'loket-3' },
  { id: 'u4', name: 'Pundi', npp: '22222', email: 'pundi@gmail.com', role: 'ASISTEN_ADMIN', assignedLoketId: 'loket-4' },
  { id: 'u7', name: 'nur syamsia octavia', npp: '08193', email: 'nur.syamsia@bpjs-kesehatan.go.id', role: 'SUPER_ADMIN' },
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

// Helper: Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
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

const extractNumberFromRaw = (raw: string): number => {
  const match = raw.match(/\d+$/);
  return match ? parseInt(match[0]) : 0;
};

const mapCloudRowToQueueItem = (row: any, index: number): QueueItem | null => {
  const nomerRaw = (getVal(row, "Nomor Antrean", "noantrean", "nomer") || "").toString().trim();
  if (!nomerRaw || nomerRaw === "" || nomerRaw.toLowerCase() === "nomor antrean") return null;

  const rawStatus = (getVal(row, "Status Pengerjaan", "status") || "").toString().trim().toUpperCase();
  const rowDate = (getVal(row, "Tanggal") || "").toString().trim();
  
  let prefix = "A";
  if (nomerRaw.toUpperCase().startsWith("MJKN")) {
    prefix = "MJKN";
  } else {
    const match = nomerRaw.match(/^[a-zA-Z]+/);
    prefix = match ? match[0].toUpperCase() : "A";
  }
  
  const number = extractNumberFromRaw(nomerRaw);
  
  let status: QueueStatus = QueueStatus.WAITING;
  if (rawStatus.includes('DILAYANI') || rawStatus.includes('CALL') || rawStatus.includes('PANGGIL')) {
    status = QueueStatus.CALLING;
  } else if (rawStatus.includes('SELESAI') || rawStatus.includes('COMPLET') || rawStatus.includes('DONE')) {
    status = QueueStatus.COMPLETED;
  }

  const timeStr = getVal(row, "Waktu Ambil", "waktu", "jam") || "00:00:00";
  let timestamp = new Date(`${rowDate}T${timeStr}`).getTime();
  if (isNaN(timestamp)) timestamp = Date.now() - (1000000 - index);

  const loketRaw = getVal(row, "Loket") || "";
  const loketId = loketRaw ? `loket-${loketRaw.toString().replace(/[^0-9]/g, '')}` : undefined;

  return {
    id: `q-${nomerRaw}-${rowDate}-${index}`,
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
    return {
      users: parsed?.users || DEFAULT_USERS,
      lokets: parsed?.lokets || DEFAULT_LOKETS,
      serviceTypes: parsed?.serviceTypes || DEFAULT_SERVICE_TYPES,
      gasUrl: parsed?.gasUrl || DEFAULT_GAS_URL,
      spreadsheetUrl: parsed?.spreadsheetUrl || '',
      queues: [],
      assistantRecords: [],
      nextNumber: 1,
      nextMjknNumber: 1,
      lastDate: today,
    };
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [lastGeneratedTicket, setLastGeneratedTicket] = useState<QueueItem | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  const [isInitializing, setIsInitializing] = useState(true);
  const isSyncingRef = useRef(false);

  // Fetch data terbaru dari Cloud
  const fetchFreshData = async () => {
    if (!state.gasUrl) return null;
    try {
      const url = `${state.gasUrl}?action=getState&sheet=${TARGET_SHEET_NAME}&_=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const cloudData = await response.json();
      if (cloudData && Array.isArray(cloudData.queues)) {
        return cloudData.queues
          .map((row: any, idx: number) => mapCloudRowToQueueItem(row, idx))
          .filter((q: any): q is QueueItem => q !== null);
      }
    } catch (e) {
      console.error("Cloud Error:", e);
    }
    return null;
  };

  const syncStateWithCloud = useCallback(async (force = false) => {
    if (isSyncingRef.current && !force) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    
    const freshQueues = await fetchFreshData();
    const today = getLocalDate();

    if (freshQueues) {
      // Hanya hitung nomor berikutnya dari data HARI INI
      const todayQueues = freshQueues.filter(q => {
        const qDate = new Date(q.timestamp).toISOString().split('T')[0];
        return qDate === today;
      });

      const maxRegular = Math.max(0, ...todayQueues.filter(q => q.prefix === 'A').map(q => q.number));
      const maxMjkn = Math.max(0, ...todayQueues.filter(q => q.prefix === 'MJKN').map(q => q.number));

      setState(prev => ({
        ...prev,
        queues: freshQueues,
        nextNumber: maxRegular + 1,
        nextMjknNumber: maxMjkn + 1,
        lastDate: today
      }));
      setSyncStatus('success');
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSyncStatus('idle'), 1000);
    } else {
      setSyncStatus('error');
    }
    isSyncingRef.current = false;
    setIsInitializing(false);
  }, [state.gasUrl]);

  const pushToCloud = async (payload: any) => {
    if (!state.gasUrl) return;
    setSyncStatus('syncing');
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ ...payload, sheet: TARGET_SHEET_NAME })
      });
      setSyncStatus('success');
      setTimeout(() => syncStateWithCloud(true), 1500);
    } catch (e) {
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    syncStateWithCloud(true);
    const interval = setInterval(() => syncStateWithCloud(), 8000);
    return () => clearInterval(interval);
  }, [syncStateWithCloud]);

  // LOGIKA AMBIL ANTREAN: RESET HARIAN TERJAMIN
  const handleTakeQueue = useCallback(async (type: 'REGULAR' | 'MJKN') => {
    setSyncStatus('syncing');
    
    const freshQueues = await fetchFreshData();
    const referenceQueues = freshQueues || state.queues;
    const today = getLocalDate();
    
    const prefix = type === 'MJKN' ? 'MJKN' : 'A';
    
    // Filter data HARI INI saja untuk menentukan nomor urut
    const todayQueues = referenceQueues.filter(q => {
      const qDate = new Date(q.timestamp).toISOString().split('T')[0];
      return qDate === today && q.prefix === prefix;
    });

    const currentMax = Math.max(0, ...todayQueues.map(q => q.number));
    const nextNum = currentMax + 1;
    const formattedNo = `${prefix}-${nextNum.toString().padStart(3, '0')}`;
    
    const timestamp = Date.now();
    
    const newTicket: QueueItem = {
      id: `q-${formattedNo}-${today}-${timestamp}`,
      number: nextNum,
      prefix,
      rawNumber: formattedNo,
      status: QueueStatus.WAITING,
      timestamp
    };

    setLastGeneratedTicket(newTicket);
    
    await pushToCloud({
      action: 'ADD',
      "Nomor Antrean": formattedNo,
      "Status Pengerjaan": "Menunggu",
      "Tanggal": today,
      "Waktu Ambil": getTimeString(timestamp)
    });
  }, [state.queues, state.gasUrl]);

  // LOGIKA PANGGIL: SINKRONISASI TOTAL 1-4 LOKET
  const handleCallNext = useCallback(async (loketId: string, npp: string) => {
    setSyncStatus('syncing');
    
    const freshQueues = await fetchFreshData();
    const referenceQueues = freshQueues || state.queues;
    const today = getLocalDate();
    
    const user = state.users.find(u => u.npp === npp);
    
    // Ambil antrean menunggu hari ini yang belum diproses siapapun
    const waitingQueues = referenceQueues
      .filter(q => {
        const qDate = new Date(q.timestamp).toISOString().split('T')[0];
        return qDate === today && q.status === QueueStatus.WAITING;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const nextInLine = waitingQueues[0];

    if (!nextInLine) {
      alert("Antrean hari ini sudah habis. Silakan tunggu peserta baru.");
      syncStateWithCloud(true);
      return;
    }

    const startTime = Date.now();
    const loketNum = loketId.split('-').pop();

    await pushToCloud({
      action: 'UPDATE',
      "Nomor Antrean": nextInLine.rawNumber,
      "Status Pengerjaan": "Dilayani",
      "Waktu Panggil": getTimeString(startTime),
      "Loket": loketNum,
      "Nama FL (Petugas)": user?.name || npp,
      "handledByNpp": npp,
      "Tanggal": today // Pastikan update dilakukan pada baris tanggal yang sama
    });
  }, [state.queues, state.users, state.gasUrl, syncStateWithCloud]);

  const handleCompleteQueue = useCallback(async (loketId: string, serviceType: string, cardNumber?: string) => {
    const currentLoket = state.lokets.find(l => l.id === loketId);
    const queueItem = state.queues.find(q => q.id === currentLoket?.currentQueueId);
    if (!queueItem) return;

    const today = getLocalDate();
    const endTime = Date.now();
    const waitMs = queueItem.startTime ? (queueItem.startTime - queueItem.timestamp) : 0;
    const serviceMs = (endTime - (queueItem.startTime || endTime));

    await pushToCloud({
      action: 'UPDATE',
      "Nomor Antrean": queueItem.rawNumber,
      "Status Pengerjaan": "Selesai",
      "Waktu Selesai": getTimeString(endTime),
      "Jenis Layanan": serviceType,
      "Waktu Tunggu": formatDuration(waitMs),
      "Waktu Layanan": formatDuration(serviceMs),
      "Noka": cardNumber || '',
      "Tanggal": today
    });
  }, [state.lokets, state.queues, state.gasUrl]);

  if (isInitializing && state.queues.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Memvalidasi Hari...</h2>
        <p className="text-slate-500 text-sm mt-2 animate-pulse font-medium">BPJS Kesehatan Jember - DSO System</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="fixed top-4 right-4 z-[100] flex flex-col items-end space-y-2">
        <button 
          onClick={() => syncStateWithCloud(true)}
          className={`px-5 py-2.5 rounded-full shadow-xl flex flex-col items-start border transition-all duration-500 hover:scale-105 active:scale-95 ${
          syncStatus === 'syncing' ? 'bg-white border-blue-100' : 
          syncStatus === 'success' ? 'bg-emerald-50 border-emerald-200' : 
          syncStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-ping' : syncStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus === 'syncing' ? 'text-blue-600' : syncStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {syncStatus === 'syncing' ? 'Menghubungkan...' : 'Terhubung'}
            </span>
          </div>
          <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Cloud Sync: {lastSyncTime}</span>
        </button>
      </div>

      <div className="w-full max-w-5xl space-y-12">
        <Header />
        <div className="flex flex-col items-center space-y-16">
          <QueueButton onClick={handleTakeQueue} />
          
          <LoketSection 
            lokets={state.lokets} 
            queues={state.queues} 
            users={state.users} 
            nextQueue={state.queues.filter(q => q.status === QueueStatus.WAITING && new Date(q.timestamp).toISOString().split('T')[0] === getLocalDate()).sort((a,b) => a.timestamp - b.timestamp)[0]}
          />

          <WaitingPanel count={state.queues.filter(q => q.status === QueueStatus.WAITING && new Date(q.timestamp).toISOString().split('T')[0] === getLocalDate()).length} />
          
          <div className="flex flex-col items-center space-y-6">
             <button onClick={() => setIsAdminOpen(true)} className="group flex items-center space-x-3 text-slate-500 hover:text-blue-600 transition-all bg-white px-8 py-3 rounded-full shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-1">
                <div className="bg-slate-100 group-hover:bg-blue-100 p-2 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em]">Otoritas Petugas Jember</span>
             </button>
             <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.4em]">Sistem Restart Otomatis Setiap Jam 00:00</p>
          </div>
        </div>
      </div>

      {isAdminOpen && (
        <AdminPanel 
          lokets={state.lokets} queues={state.queues} users={state.users} serviceTypes={state.serviceTypes} 
          gasUrl={state.gasUrl} spreadsheetUrl={state.spreadsheetUrl} onClose={() => setIsAdminOpen(false)}
          onReset={() => { if(confirm('⚠️ Reset Harian: Data hari ini akan diarsipkan.')) syncStateWithCloud(true); }}
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
