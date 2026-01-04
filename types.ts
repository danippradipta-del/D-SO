
export const QueueStatus = {
  WAITING: 'WAITING',
  CALLING: 'CALLING',
  COMPLETED: 'COMPLETED'
} as const;

export type QueueStatus = typeof QueueStatus[keyof typeof QueueStatus];

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ASISTEN_ADMIN';

export interface User {
  id: string;
  name: string;
  npp: string;
  email: string;
  gmail?: string;
  role: UserRole;
  assignedLoketId?: string;
}

export interface QueueItem {
  id: string;
  number: number;
  prefix: string;
  status: QueueStatus;
  timestamp: number;
  startTime?: number;
  endTime?: number;
  loketId?: string;
  serviceType?: string;
  handledByNpp?: string;
}

export interface AssistantRecord {
  id: string;
  timestamp: number;
  npp: string;
  loketId: string;
  serviceType: string;
  cardNumber: string;
}

export interface Loket {
  id: string;
  name: string;
  color: string;
  currentQueueId?: string;
}

export interface AppState {
  queues: QueueItem[];
  assistantRecords: AssistantRecord[];
  lokets: Loket[];
  users: User[];
  serviceTypes: string[];
  nextNumber: number;
  lastDate: string;
  gasUrl?: string;
  spreadsheetUrl?: string;
}
