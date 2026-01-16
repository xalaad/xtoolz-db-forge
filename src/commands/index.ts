export * from './db';
export * from './migrate';
export * from './seed';

import { dbCommands } from './db';
import { migrateCommands } from './migrate';
import { seedCommands } from './seed';
import type { Command } from '../types';

export const allCommands: Command[] = [
  ...dbCommands,
  ...migrateCommands,
  ...seedCommands
];
