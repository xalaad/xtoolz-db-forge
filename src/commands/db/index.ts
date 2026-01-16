export { dbCreateCommand, DbCreateCommand } from './create';
export { dbDropCommand, DbDropCommand } from './drop';
export { dbFreshCommand, DbFreshCommand } from './fresh';

import { dbCreateCommand } from './create';
import { dbDropCommand } from './drop';
import { dbFreshCommand } from './fresh';
import type { Command } from '../../types';

export const dbCommands: Command[] = [
  dbCreateCommand,
  dbDropCommand,
  dbFreshCommand
];
