import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutputChannelManager } from '../src/utils/OutputChannelManager.js';

// Mock vscode module
vi.mock('vscode', () => ({
	window: {
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			append: vi.fn(),
			show: vi.fn(),
			clear: vi.fn(),
			dispose: vi.fn()
		}))
	}
}));

describe('OutputChannelManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = OutputChannelManager.getInstance();
			const instance2 = OutputChannelManager.getInstance();
			
			expect(instance1).toBe(instance2);
		});
	});

	describe('getOutputChannel', () => {
		it('should return output channel instance', () => {
			const manager = OutputChannelManager.getInstance();
			const channel = manager.getOutputChannel();
			
			expect(channel).toBeDefined();
			expect(channel.appendLine).toBeDefined();
			expect(channel.show).toBeDefined();
		});
	});

	describe('appendLine', () => {
		it('should append line to output channel', () => {
			const manager = OutputChannelManager.getInstance();
			const channel = manager.getOutputChannel();
			const appendLineSpy = vi.spyOn(channel, 'appendLine');
			
			manager.appendLine('Test message');
			
			expect(appendLineSpy).toHaveBeenCalledWith('Test message');
		});
	});

	describe('append', () => {
		it('should append text to output channel', () => {
			const manager = OutputChannelManager.getInstance();
			const channel = manager.getOutputChannel();
			const appendSpy = vi.spyOn(channel, 'append');
			
			manager.append('Test text');
			
			expect(appendSpy).toHaveBeenCalledWith('Test text');
		});
	});

	describe('show', () => {
		it('should show output channel', () => {
			const manager = OutputChannelManager.getInstance();
			const channel = manager.getOutputChannel();
			const showSpy = vi.spyOn(channel, 'show');
			
			manager.show();
			
			expect(showSpy).toHaveBeenCalled();
		});
	});

	describe('clear', () => {
		it('should clear output channel', () => {
			const manager = OutputChannelManager.getInstance();
			const channel = manager.getOutputChannel();
			const clearSpy = vi.spyOn(channel, 'clear');
			
			manager.clear();
			
			expect(clearSpy).toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('should dispose output channel', () => {
			const manager = OutputChannelManager.getInstance();
			const channel = manager.getOutputChannel();
			const disposeSpy = vi.spyOn(channel, 'dispose');
			
			manager.dispose();
			
			expect(disposeSpy).toHaveBeenCalled();
		});
	});
});
