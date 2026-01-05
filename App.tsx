
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QueueStatus, QueueItem, Loket, AppState, User } from './types.ts';
import Header from './components/Header.tsx';
import QueueButton from './components/QueueButton.tsx';
import LoketSection from './components/LoketSection.tsx';
import WaitingPanel from './components/WaitingPanel.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import TicketModal from './components/TicketModal.tsx';

// Updated storage key to force reset settings and use the new URL
const STORAGE_KEY = 'jember_so_v8_atomic';
// New GAS URL provided by the user
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw0JTSvVkYgq-pw3lN6Fo0VOKNvWrJZNRAuRMC92cKpNxPpszWbWyM59mqkq0Y-dcHqXw/exec';

const getJemberDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).split('-').reverse().join('/');
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      users: parsed?.users || [
        { id: 'u1', name: 'Putri Oktavia Gupitasari', npp: '220060', role: 'ADMIN', assignedLoketId: 'loket-1' },
        { id: 'u2', name: 'Anisa Dea Suryani', npp: '250168', role: 'ADMIN', assignedLoketId: 'loket-2' },
        { id: 'u3', name: 'nur syamsia octavia', npp: '08193', role: 'SUPER_ADMIN', assignedLoketId: 'loket-3' },
      ],
      lokets: parsed?.lokets || [
        { id: 'loket-1', name: 'LOKET 1', color: 'blue' },
        { id: 'loket-2', name: 'LOKET 2', color: 'pink' },
        { id: 'loket-3', name: 'LOKET 3', color: 'purple' },
      ],
      serviceTypes: parsed?.serviceTypes || [
        "Pindah faskes melalui pandawa/mjkn", "Peralihan segmen PBPU", "Perubahan identitas/alamat",
        "Registrasi aplikasi MJKN", "Penonaktifan meninggal dunia", "Permintaan informasi lainnya"
      ],
      gasUrl: parsed?.gasUrl || DEFAULT_GAS_URL,
      queues: [],
    };
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [lastGeneratedTicket, setLastGeneratedTicket] = useState<QueueItem | null>(null);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'error' | 'success'>('success');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const syncInProgress = useRef(false);

  const fetchLatestQueues = useCallback(async () => {
    try {
      const cacheBuster = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const resp = await fetch(`${state.gasUrl}?action=getState&_cb=${cacheBuster}`);
      const data = await resp.json();
      if (data?.queues) {
        return data.queues.map((row: any, i: number) => {
          const rawNo = (row["Nomor Antrean"] || "").toString();
          const rawStatus = (row["Status Pengerjaan"] || "Menunggu").toUpperCase();
          let status: QueueStatus = QueueStatus.WAITING;
          if (rawStatus.includes("DILAYANI")) status = QueueStatus.CALLING;
          if (rawStatus.includes("SELESAI")) status = QueueStatus.COMPLETED;

          return {
            id: `q-${rawNo}-${row["Tanggal"]}-${i}`,
            number: parseInt(rawNo.split('-').pop()) || 0,
            prefix: rawNo.includes("MJKN") ? "MJKN" : "A",
            rawNumber: rawNo,
            status,
            timestamp: new Date(`${row["Tanggal"].split('/').reverse().join('-')}T${row["Waktu Ambil"] || "00:00:00"}`).getTime(),
            loketId: row["Loket"] ? `loket-${row["Loket"]}` : undefined,
            serviceType: row["Jenis Layanan"],
          } as QueueItem;
        }).filter((q: any) => q.rawNumber);
      }
    } catch (e) { 
      console.error("Sync Error:", e);
      setSyncStatus('error');
    }
    return null;
  }, [state.gasUrl]);

  const sync = useCallback(async (manual = false) => {
    if (syncInProgress.current && !manual) return;
    syncInProgress.current = true;
    if (manual) setSyncStatus('syncing');

    const fresh = await fetchLatestQueues();
    if (fresh) {
      const today = getJemberDate();
      setState(prev => {
        const updatedLokets = prev.lokets.map(l => {
          const active = fresh.find(q => q.status === QueueStatus.CALLING && q.loketId === l.id && new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta'}).format(new Date(q.timestamp)).split('-').reverse().join('/') === today);
          return { ...l, currentQueueId: active?.id };
        });
        const newState = { ...prev, queues: fresh, lokets: updatedLokets };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
      });
      setSyncStatus('success');
    }
    syncInProgress.current = false;
    setIsLoading(false);
  }, [fetchLatestQueues]);

  useEffect(() => {
    sync();
    const inv = setInterval(() => sync(), 5000);
    return () => clearInterval(inv);
  }, [sync]);

  const handleTakeQueue = async (type: 'REGULAR' | 'MJKN') => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSyncStatus('syncing');

    try {
      const today = getJemberDate();
      const prefix = type === 'MJKN' ? 'MJKN' : 'A';
      const now = new Date();

      // KIRIM KE SERVER TANPA MENGHITUNG NOMOR DI CLIENT
      const response = await fetch(state.gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'ADD',
          "Prefix": prefix,
          "Tanggal": today,
          "Waktu Ambil": now.toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
        })
      });

      const result = await response.json();

      if (result.success && result.number) {
        const newTicket: QueueItem = {
          id: `confirmed-${Date.now()}`,
          number: parseInt(result.number.split('-').pop()),
          prefix,
          rawNumber: result.number,
          status: QueueStatus.WAITING,
          timestamp: now.getTime()
        };

        setLastGeneratedTicket(newTicket);
        await sync(true);
      } else {
        throw new Error("Gagal mendapatkan nomor dari server.");
      }
    } catch (error) {
      console.error("Take Queue Error:", error);
      alert("Sistem sedang sibuk atau URL script salah. Silakan periksa kembali.");
      setSyncStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallNext = async (loketId: string, npp: string) => {
    const today = getJemberDate();
    const waiting = state.queues.filter(q => {
      const qDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta'}).format(new Date(q.timestamp)).split('-').reverse().join('/');
      return q.status === QueueStatus.WAITING && qDate === today;
    }).sort((a, b) => a.timestamp - b.timestamp);

    if (waiting.length === 0) return alert("Antrean sedang kosong.");

    const next = waiting[0];
    const user = state.users.find(u => u.npp === npp);
    const loketNum = loketId.split('-').pop();

    setSyncStatus('syncing');
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'UPDATE',
          "Nomor Antrean": next.rawNumber,
          "Status Pengerjaan": "Dilayani",
          "Loket": loketNum,
          "handledByNpp": npp,
          "Nama FL (Petugas)": user?.name,
          "Tanggal": today,
          "Waktu Panggil": new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
        })
      });
      setTimeout(() => sync(true), 1500);
    } catch (e) {
      alert("Gagal memanggil antrean. Periksa koneksi.");
      setSyncStatus('error');
    }
  };

  const handleComplete = async (loketId: string, service: string, card: string) => {
    const loket = state.lokets.find(l => l.id === loketId);
    const q = state.queues.find(qi => qi.id === loket?.currentQueueId);
    if (!q) return;

    setSyncStatus('syncing');
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'UPDATE',
          "Nomor Antrean": q.rawNumber,
          "Status Pengerjaan": "Selesai",
          "Jenis Layanan": service,
          "Noka": card,
          "Tanggal": getJemberDate(),
          "Waktu Selesai": new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
        })
      });
      setTimeout(() => sync(true), 1500);
    } catch (e) {
      alert("Gagal menyelesaikan layanan. Periksa koneksi.");
      setSyncStatus('error');
    }
  };

  const handleAddLoket = () => {
    const newId = `loket-${state.lokets.length + 1}`;
    const colors: Loket['color'][] = ['blue', 'pink', 'purple', 'emerald', 'amber', 'indigo'];
    const newLoket: Loket = {
      id: newId,
      name: `LOKET ${state.lokets.length + 1}`,
      color: colors[state.lokets.length % colors.length]
    };
    setState(prev => ({ ...prev, lokets: [...prev.lokets, newLoket] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <div className="text-center">
          <h2 className="font-black text-blue-900 uppercase tracking-widest text-sm mb-1">MEMUAT SISTEM JEMBER</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Versi 8.0 - Update Script URL</p>
        </div>
      </div>
    );
  }

  const todayStr = getJemberDate();
  const waitingCount = state.queues.filter(q => {
    const qDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta'}).format(new Date(q.timestamp)).split('-').reverse().join('/');
    return qDate === todayStr && q.status === QueueStatus.WAITING;
  }).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 flex flex-col items-center space-y-12">
      {isProcessing && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[1000] flex items-center justify-center">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl flex flex-col items-center border border-blue-100">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="font-black text-blue-900 uppercase tracking-widest text-[10px]">Menghubungi Server...</p>
          </div>
        </div>
      )}

      {/* Koneksi Status */}
      <div className="fixed top-6 right-6 z-[100]">
        <div className={`px-4 py-2.5 rounded-2xl shadow-lg border flex items-center space-x-3 bg-white transition-colors duration-500 ${syncStatus === 'error' ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : syncStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span className="text-[9px] font-black uppercase text-slate-800 tracking-tight">
            {syncStatus === 'syncing' ? 'Sinkronisasi...' : syncStatus === 'error' ? 'Gangguan Server' : 'Terhubung'}
          </span>
        </div>
      </div>

      <Header />

      <div className="w-full max-w-7xl space-y-16">
        <QueueButton onClick={handleTakeQueue} isProcessing={isProcessing} />
        
        <LoketSection 
          lokets={state.lokets} 
          queues={state.queues} 
          users={state.users} 
          nextQueue={state.queues.filter(q => {
            const qDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta'}).format(new Date(q.timestamp)).split('-').reverse().join('/');
            return qDate === todayStr && q.status === QueueStatus.WAITING;
          }).sort((a,b) => a.timestamp - b.timestamp)[0]}
        />

        <WaitingPanel count={waitingCount} />

        <div className="flex justify-center pt-8">
           <button onClick={() => setIsAdminOpen(true)} className="flex items-center space-x-3 bg-white px-8 py-4 rounded-2xl shadow-md border border-slate-100 hover:shadow-xl transition-all active:scale-95 group">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Login SO Jember</span>
           </button>
        </div>
      </div>

      {isAdminOpen && (
        <AdminPanel 
          {...state} 
          onClose={() => setIsAdminOpen(false)}
          onCallNext={handleCallNext} 
          onComplete={handleComplete} 
          onAddLoket={handleAddLoket}
          onUpdateUsers={(u) => setState(p => ({...p, users: u}))}
          onTakeQueue={handleTakeQueue}
        />
      )}

      {lastGeneratedTicket && <TicketModal ticket={lastGeneratedTicket} onClose={() => setLastGeneratedTicket(null)} />}
    </div>
  );
};

export default App;
