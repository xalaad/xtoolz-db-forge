export { seedRunCommand, SeedRunCommand } from './run';
export { seedMakeCommand, SeedMakeCommand } from './make';

import { seedRunCommand } from './run';
import { seedMakeCommand } from './make';
import type { Command } from '../../types';

export const seedCommands: Command[] = [
  seedRunCommand,
  seedMakeCommand
];
