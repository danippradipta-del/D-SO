
export enum QueueStatus {
  WAITING = 'WAITING',
  CALLING = 'CALLING',
  COMPLETED = 'COMPLETED'
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

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

export interface Loket {
  id: string;
  name: string;
  color: string;
  currentQueueId?: string;
}

export interface AppState {
  queues: QueueItem[];
  lokets: Loket[];
  users: User[];
  serviceTypes: string[];
  nextNumber: number;
  lastDate: string;
  gasUrl?: string; // Endpoint Google Apps Script
  spreadsheetUrl?: string; // Link to the Google Spreadsheet
}
