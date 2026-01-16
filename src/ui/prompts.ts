import * as p from '@clack/prompts';
import color from 'picocolors';

/**
 * Error thrown when user cancels a prompt (ESC or Ctrl+C)
 */
export class CancelledError extends Error {
  constructor() {
    super('Operation cancelled');
    this.name = 'CancelledError';
  }
}

/**
 * Check if an error is a cancellation
 */
export function isCancelled(error: unknown): error is CancelledError {
  return error instanceof CancelledError;
}

export interface SelectChoice<T = string> {
  title: string;
  value: T;
  description?: string;
  disabled?: boolean;
}

export async function promptText(message: string, defaultValue?: string): Promise<string> {
  const result = await p.text({
    message,
    placeholder: defaultValue,
    defaultValue
  });

  if (p.isCancel(result)) {
    throw new CancelledError();
  }

  return result;
}

export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  const result = await p.confirm({
    message,
    initialValue: defaultValue
  });

  if (p.isCancel(result)) {
    throw new CancelledError();
  }

  return result;
}

export async function promptSelect<T = string>(
  message: string,
  choices: SelectChoice<T>[]
): Promise<T> {
  const options = choices
    .filter(c => !c.disabled)
    .map(c => ({
      value: c.value as T,
      label: c.title,
      hint: c.description
    }));

  const result = await p.select({
    message,
    options: options as any
  });

  if (p.isCancel(result)) {
    throw new CancelledError();
  }

  return result as T;
}

export async function promptMultiSelect<T = string>(
  message: string,
  choices: SelectChoice<T>[]
): Promise<T[]> {
  const options = choices
    .filter(c => !c.disabled)
    .map(c => ({
      value: c.value as T,
      label: c.title,
      hint: c.description
    }));

  const result = await p.multiselect({
    message,
    options: options as any,
    required: false
  });

  if (p.isCancel(result)) {
    throw new CancelledError();
  }

  return result as T[];
}

export async function promptPassword(message: string): Promise<string> {
  const result = await p.password({
    message
  });

  if (p.isCancel(result)) {
    throw new CancelledError();
  }

  return result;
}

export async function confirmAction(action: string): Promise<boolean> {
  console.log();
  p.log.warn(`This will ${action}.`);

  const result = await p.confirm({
    message: 'Are you sure you want to continue?',
    initialValue: false
  });

  if (p.isCancel(result)) {
    throw new CancelledError();
  }

  return result;
}
