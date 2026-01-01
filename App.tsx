
import React, { useState, useEffect, useCallback } from 'react';
import { QueueStatus, QueueItem, Loket, AppState, User } from './types.ts';
import Header from './components/Header.tsx';
import QueueButton from './components/QueueButton.tsx';
import LoketSection from './components/LoketSection.tsx';
import WaitingPanel from './components/WaitingPanel.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import TicketModal from './components/TicketModal.tsx';

const STORAGE_KEY = 'bpjs_queue_state_v6';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzotraoUKoJY9mgzHKo1e6PtXrHCLRaeJbqrO2D8Yk8BBcv16OFcyowLKTMwCMftupKTA/exec';
const TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FBK_y9mcqqNOkaw9kI9zJASO58RB4Rf48XQR1huozp8/edit?usp=sharing';

const DEFAULT_LOKETS: Loket[] = [
  { id: 'loket-1', name: 'LOKET 1', color: 'blue' },
  { id: 'loket-2', name: 'LOKET 2', color: 'pink' },
  { id: 'loket-3', name: 'LOKET 3', color: 'purple' },
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

const DEFAULT_USERS: User[] = [
  { id: 'u-super', name: 'nur syamsia octavia', npp: '08193', email: 'nur.syamsia@bpjs-kesehatan.go.id', role: 'SUPER_ADMIN' },
  { id: 'u1', name: 'Putri Oktavia Gupitasari', npp: '220060', email: 'putri.oktavia@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-1' },
  { id: 'u2', name: 'Anisa Dea Suryani', npp: '250168', email: '250168.anisa@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-2' },
  { id: 'u3', name: 'Fahri Wardiansah', npp: '250137', email: '250137.fahri@bpjs-kesehatan.go.id', role: 'ADMIN', assignedLoketId: 'loket-3' },
];

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const getTimeString = (timestamp: number) => {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const today = new Date().toDateString();
    const defaultState: AppState = {
      queues: [],
      lokets: DEFAULT_LOKETS,
      users: DEFAULT_USERS,
      serviceTypes: DEFAULT_SERVICE_TYPES,
      nextNumber: 1,
      lastDate: today,
      gasUrl: DEFAULT_GAS_URL,
      spreadsheetUrl: TARGET_SHEET_URL
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lastDate === today) {
          return { 
            ...defaultState,
            ...parsed,
            spreadsheetUrl: TARGET_SHEET_URL, // Selalu gunakan link yang baru
            lokets: parsed.lokets || DEFAULT_LOKETS,
            users: parsed.users || DEFAULT_USERS
          };
        }
      }
    } catch (error) {
      console.warn("Gagal memuat state:", error);
    }
    
    return defaultState;
  });

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [lastGeneratedTicket, setLastGeneratedTicket] = useState<QueueItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Gagal menyimpan state:", e);
    }
  }, [state]);

  const syncToSheets = async (payload: any) => {
    if (!state.gasUrl) return;
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("[Sync Error]:", e);
    }
  };

  const handleTakeQueue = useCallback(() => {
    const timestamp = Date.now();
    const newTicket: QueueItem = {
      id: `q-${timestamp}`,
      number: state.nextNumber,
      prefix: 'A',
      status: QueueStatus.WAITING,
      timestamp: timestamp
    };

    setState(prev => ({
      ...prev,
      queues: [...prev.queues, newTicket],
      nextNumber: prev.nextNumber + 1
    }));
    setLastGeneratedTicket(newTicket);

    syncToSheets({
      action: 'ADD',
      number: `A-${newTicket.number.toString().padStart(3, '0')}`,
      date: getTodayDateString(),
      timeTaken: getTimeString(timestamp)
    });
  }, [state.nextNumber, state.gasUrl]);

  const handleCallNext = useCallback((loketId: string, npp: string) => {
    const nextInLine = state.queues.find(q => q.status === QueueStatus.WAITING);
    if (!nextInLine) return;

    const startTime = Date.now();
    const loketName = state.lokets.find(l => l.id === loketId)?.name || loketId;
    const user = state.users.find(u => u.npp === npp);

    setState(prev => {
      const updatedQueues = prev.queues.map(q => {
        if (q.id === nextInLine.id) return { ...q, status: QueueStatus.CALLING, loketId, handledByNpp: npp, startTime };
        return q;
      });
      const updatedLokets = prev.lokets.map(l => l.id === loketId ? { ...l, currentQueueId: nextInLine.id } : l);
      return { ...prev, queues: updatedQueues, lokets: updatedLokets };
    });

    syncToSheets({
      action: 'UPDATE',
      status: 'CALLING',
      number: `A-${nextInLine.number.toString().padStart(3, '0')}`,
      date: getTodayDateString(),
      timeCalled: getTimeString(startTime),
      loket: loketName,
      handledBy: user?.name || npp 
    });
  }, [state.queues, state.lokets, state.users, state.gasUrl]);

  const handleCompleteQueue = useCallback((loketId: string, serviceType: string) => {
    const currentLoket = state.lokets.find(l => l.id === loketId);
    if (!currentLoket?.currentQueueId) return;
    
    const queueItem = state.queues.find(q => q.id === currentLoket.currentQueueId);
    if (!queueItem) return;

    const endTime = Date.now();
    const user = state.users.find(u => u.npp === queueItem.handledByNpp);

    setState(prev => {
      const updatedQueues = prev.queues.map(q => q.id === currentLoket.currentQueueId ? { ...q, status: QueueStatus.COMPLETED, endTime, serviceType } : q);
      const updatedLokets = prev.lokets.map(l => l.id === loketId ? { ...l, currentQueueId: undefined } : l);
      return { ...prev, queues: updatedQueues, lokets: updatedLokets };
    });

    syncToSheets({
      action: 'UPDATE',
      status: 'COMPLETED',
      number: `A-${queueItem.number.toString().padStart(3, '0')}`,
      date: getTodayDateString(),
      timeCompleted: getTimeString(endTime),
      serviceType: serviceType,
      handledBy: user?.name || (queueItem.handledByNpp || '')
    });
  }, [state.lokets, state.queues, state.users, state.gasUrl]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-12">
        <Header />
        <div className="flex flex-col items-center space-y-16">
          <QueueButton onClick={handleTakeQueue} />
          <LoketSection lokets={state.lokets} queues={state.queues} nextQueue={state.queues.find(q => q.status === QueueStatus.WAITING)} />
          <WaitingPanel count={state.queues.filter(q => q.status === QueueStatus.WAITING).length} />
          <div className="flex flex-col items-center space-y-4">
            <button onClick={() => setIsAdminOpen(true)} className="flex items-center space-x-2 text-slate-400 hover:text-blue-600 transition-colors duration-200 bg-white px-6 py-2 rounded-full shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <span>Panel Operasional</span>
            </button>
          </div>
        </div>
      </div>
      {isAdminOpen && (
        <AdminPanel 
          lokets={state.lokets} 
          queues={state.queues}
          users={state.users}
          serviceTypes={state.serviceTypes}
          gasUrl={state.gasUrl}
          spreadsheetUrl={state.spreadsheetUrl}
          onClose={() => setIsAdminOpen(false)}
          onReset={() => {
            if(confirm('Reset semua antrean hari ini?')) {
              setState(prev => ({...prev, queues: [], lokets: prev.lokets.map(l => ({...l, currentQueueId: undefined})), nextNumber: 1}));
            }
          }}
          onCallNext={handleCallNext}
          onComplete={handleCompleteQueue}
          onUpdateUsers={(u) => setState(prev => ({...prev, users: u}))}
          onUpdateServiceTypes={(t) => setState(prev => ({...prev, serviceTypes: t}))}
          onUpdateGasUrl={(url) => setState(prev => ({...prev, gasUrl: url}))}
          onUpdateSpreadsheetUrl={(url) => setState(prev => ({...prev, spreadsheetUrl: url}))}
          onUpdateLokets={(l) => setState(prev => ({...prev, lokets: l}))}
        />
      )}
      {lastGeneratedTicket && <TicketModal ticket={lastGeneratedTicket} onClose={() => setLastGeneratedTicket(null)} />}
    </div>
  );
};

export default App;
