// src/types/index.ts

export const ROLES = ['Admin', 'Developer', 'QC', 'Gatepass', 'Audit', 'Stores'] as const;

export type Role = typeof ROLES[number];

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}