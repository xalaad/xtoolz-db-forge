/**
 * Jest setup file
 */

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

// Mock readline for non-interactive tests
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((_, cb) => cb('')),
    close: jest.fn(),
  })),
  emitKeypressEvents: jest.fn(),
}));

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
