// src/types/index.ts

export const ROLES = ['Admin', 'Developer', 'QC', 'Gatepass', 'Audit', 'Stores','Worker'] as const;

export type ManagedRole = typeof ROLES[number];
export type Role = ManagedRole | 'SuperAdmin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}