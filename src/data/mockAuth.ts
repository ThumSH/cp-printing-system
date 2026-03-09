// src/data/mockAuth.ts
import { User } from '../types';

// We map a password to each user for our mock login simulation
export const MOCK_CREDENTIALS = [
  { username: 'admin', password: '123', user: { id: '1', username: 'admin', name: 'System Admin', role: 'Admin' } },
  { username: 'dev', password: '123', user: { id: '2', username: 'dev', name: 'Software Dev', role: 'Developer' } },
  { username: 'qc', password: '123', user: { id: '3', username: 'qc', name: 'Quality Control', role: 'QC' } },
  { username: 'gate', password: '123', user: { id: '4', username: 'gate', name: 'Gate Manager', role: 'Gatepass' } },
  { username: 'worker', password: '123', user: { id: '5', username: 'worker', name: 'Floor Worker', role: 'Worker' } },
  { username: 'audit', password: '123', user: { id: '6', username: 'audit', name: 'Financial Auditor', role: 'Audit' } },
  { username: 'store', password: '123', user: { id: '7', username: 'store', name: 'Inventory Manager', role: 'Stores' } },
] as const;