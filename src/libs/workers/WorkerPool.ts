/**
 * WorkerPool - Gestiona un pool de worker threads per processament paral·lel
 * Evita el overhead de crear un worker per a cada tasca
 */

import { Worker } from 'worker_threads';
import path from 'path';

export interface ProcessingTask {
	type: 'formatUserStories' | 'formatIterations' | 'formatTasks' | 'formatDefects';
	payload: unknown[];
}

interface WorkerResult {
	success: boolean;
	data?: unknown[];
	error?: string;
	processed: number;
}

interface PendingTask {
	task: ProcessingTask;
	resolve: (value: unknown[]) => void;
	reject: (error: Error) => void;
}

export class WorkerPool {
	private workers: Worker[] = [];
	private queue: PendingTask[] = [];
	private busyWorkers: Set<Worker> = new Set();
	private poolSize: number;
	private workerScript: string;

	constructor(poolSize: number = 2) {
		this.poolSize = poolSize;
		this.workerScript = path.join(__dirname, 'dataProcessorWorker.js');
		this.initializeWorkers();
	}

	private initializeWorkers(): void {
		for (let i = 0; i < this.poolSize; i++) {
			this.createWorker();
		}
	}

	private createWorker(): void {
		const worker = new Worker(this.workerScript);

		worker.on('message', (result: WorkerResult) => {
			this.busyWorkers.delete(worker);

			if (result.success) {
				const pending = this.queue.shift();
				if (pending) {
					pending.resolve(result.data);
					this.processTask(pending.task, pending.resolve, pending.reject);
				}
			} else {
				const pending = this.queue.shift();
				if (pending) {
					pending.reject(new Error(result.error));
					const next = this.queue.shift();
					if (next) {
						this.processTask(next.task, next.resolve, next.reject);
					}
				}
			}
		});

		worker.on('error', error => {
			// eslint-disable-next-line no-console
			console.error('[Robert] Worker error:', error);
			this.busyWorkers.delete(worker);

			const pending = this.queue.shift();
			if (pending) {
				pending.reject(error instanceof Error ? error : new Error(String(error)));
			}

			// Recrea el worker que ha fallat
			const workerIndex = this.workers.indexOf(worker);
			if (workerIndex !== -1) {
				this.workers[workerIndex].terminate();
				this.workers[workerIndex] = new Worker(this.workerScript);
				this.createWorker();
			}
		});

		this.workers.push(worker);
	}

	private processTask(task: ProcessingTask, resolve: (value: unknown[]) => void, reject: (error: Error) => void): void {
		// Buscar un worker disponible
		const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));

		if (availableWorker) {
			this.busyWorkers.add(availableWorker);
			availableWorker.postMessage(task);
		} else {
			// No hi ha workers disponibles, posar a la cua
			this.queue.push({ task, resolve, reject });
		}
	}

	async process<T>(task: ProcessingTask): Promise<T> {
		return new Promise((resolve, reject) => {
			this.processTask(task, resolve, reject);
		});
	}

	async formatUserStories(data: unknown[]): Promise<unknown[]> {
		return this.process({
			type: 'formatUserStories',
			payload: data
		});
	}

	async formatIterations(data: unknown[]): Promise<unknown[]> {
		return this.process({
			type: 'formatIterations',
			payload: data
		});
	}

	async formatTasks(data: unknown[]): Promise<unknown[]> {
		return this.process({
			type: 'formatTasks',
			payload: data
		});
	}

	async formatDefects(data: unknown[]): Promise<unknown[]> {
		return this.process({
			type: 'formatDefects',
			payload: data
		});
	}

	terminate(): void {
		for (const worker of this.workers) {
			worker.terminate();
		}
		this.workers = [];
		this.queue = [];
		this.busyWorkers.clear();
	}

	getStats(): {
		totalWorkers: number;
		busyWorkers: number;
		queuedTasks: number;
	} {
		return {
			totalWorkers: this.workers.length,
			busyWorkers: this.busyWorkers.size,
			queuedTasks: this.queue.length
		};
	}
}

// Pool singleton
let globalWorkerPool: WorkerPool | null = null;

export function getWorkerPool(poolSize: number = 2): WorkerPool {
	if (!globalWorkerPool) {
		globalWorkerPool = new WorkerPool(poolSize);
	}
	return globalWorkerPool;
}

export function destroyWorkerPool(): void {
	if (globalWorkerPool) {
		globalWorkerPool.terminate();
		globalWorkerPool = null;
	}
}
