// src/types/index.ts

export type Role = 'Admin' | 'Developer' | 'QC' | 'Gatepass' | 'Worker' | 'Audit' | 'Stores';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}