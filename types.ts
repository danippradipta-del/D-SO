
export const QueueStatus = {
  WAITING: 'Menunggu',
  CALLING: 'Dilayani',
  COMPLETED: 'Selesai'
} as const;

export type QueueStatus = typeof QueueStatus[keyof typeof QueueStatus];

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  npp: string;
  role: UserRole;
  assignedLoketId?: string;
}

export interface QueueItem {
  id: string;
  number: number;
  prefix: string;
  rawNumber: string; 
  status: QueueStatus;
  timestamp: number;
  loketId?: string;
  serviceType?: string;
  handledByNpp?: string;
  cardNumber?: string;
}

export interface Loket {
  id: string;
  name: string;
  color: 'blue' | 'pink' | 'purple' | 'emerald' | 'amber' | 'indigo';
  currentQueueId?: string;
}

export interface AppState {
  queues: QueueItem[];
  lokets: Loket[];
  users: User[];
  serviceTypes: string[];
  gasUrl: string;
}
