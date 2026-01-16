export { migrateRunCommand, MigrateRunCommand } from './run';
export { migrateRevertCommand, MigrateRevertCommand } from './revert';
export { migrateStatusCommand, MigrateStatusCommand } from './status';
export { migrateGenerateCommand, MigrateGenerateCommand } from './generate';

import { migrateRunCommand } from './run';
import { migrateRevertCommand } from './revert';
import { migrateStatusCommand } from './status';
import { migrateGenerateCommand } from './generate';
import type { Command } from '../../types';

export const migrateCommands: Command[] = [
  migrateRunCommand,
  migrateRevertCommand,
  migrateStatusCommand,
  migrateGenerateCommand
];
