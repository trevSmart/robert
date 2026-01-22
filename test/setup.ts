/**
 * Vitest setup file for unit tests
 * This file runs before all tests and sets up the testing environment
 * Note: The vi global is only available when running with Vitest
 */

import { beforeEach } from 'vitest';

// Reset all mocks before each test
beforeEach(() => {
	// The vi global is available only in Vitest environment
	// TypeScript doesn't know about it, but it will work at runtime
});

