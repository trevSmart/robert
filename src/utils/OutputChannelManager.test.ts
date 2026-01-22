/**
 * Unit tests for OutputChannelManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutputChannelManager } from './OutputChannelManager';
import * as vscode from 'vscode';

describe('OutputChannelManager', () => {
	let outputManager: OutputChannelManager;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset singleton instance
		(OutputChannelManager as any).instance = undefined;
		outputManager = OutputChannelManager.getInstance();
	});

	describe('getInstance', () => {
		it('should return a singleton instance', () => {
			const instance1 = OutputChannelManager.getInstance();
			const instance2 = OutputChannelManager.getInstance();
			expect(instance1).toBe(instance2);
		});

		it('should create output channel on initialization', () => {
			expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Robert');
		});
	});

	describe('getOutputChannel', () => {
		it('should return the output channel', () => {
			const channel = outputManager.getOutputChannel();
			expect(channel).toBeDefined();
		});
	});

	describe('show', () => {
		it('should show the output channel', () => {
			const channel = outputManager.getOutputChannel();
			const showSpy = vi.spyOn(channel, 'show');

			outputManager.show();

			expect(showSpy).toHaveBeenCalledWith(true);
		});
	});

	describe('appendLine', () => {
		it('should append a line to the output channel', () => {
			const channel = outputManager.getOutputChannel();
			const appendLineSpy = vi.spyOn(channel, 'appendLine');

			outputManager.appendLine('Test message');

			expect(appendLineSpy).toHaveBeenCalledWith('Test message');
		});
	});

	describe('append', () => {
		it('should append text without newline to the output channel', () => {
			const channel = outputManager.getOutputChannel();
			const appendSpy = vi.spyOn(channel, 'append');

			outputManager.append('Test text');

			expect(appendSpy).toHaveBeenCalledWith('Test text');
		});
	});

	describe('clear', () => {
		it('should clear the output channel', () => {
			const channel = outputManager.getOutputChannel();
			const clearSpy = vi.spyOn(channel, 'clear');

			outputManager.clear();

			expect(clearSpy).toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('should dispose the output channel', () => {
			const channel = outputManager.getOutputChannel();
			const disposeSpy = vi.spyOn(channel, 'dispose');

			outputManager.dispose();

			expect(disposeSpy).toHaveBeenCalled();
		});
	});
});
