import { ErrorHandler } from '../ErrorHandler';
import type { Holiday } from '../types/utils';

/**
 * Fetch polyfill for older VS Code versions
 */
const fetchPolyfill = async (url: string, options?: RequestInit): Promise<Response> => {
	// Try to use native fetch if available
	if (typeof globalThis.fetch === 'function') {
		return globalThis.fetch(url, options);
	}

	// Fallback to node-fetch for older environments
	try {
		// @ts-expect-error - dynamic import for compatibility
		const nodeFetch = await import('node-fetch');
		return nodeFetch.default(url, options) as unknown as Response;
	} catch (error) {
		throw new Error(`Fetch not available: ${error instanceof Error ? error.message : String(error)}`);
	}
};

/**
 * Holiday Service for retrieving Spanish holidays
 * Uses the public Nager.Date API (https://date.nager.at/)
 * Alternative: holiday.date API
 */
export class HolidayService {
	private static instance: HolidayService;
	private readonly API_BASE_URL = 'https://date.nager.at/api/v3/PublicHolidays';
	private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
	private cache: Map<string, { data: Holiday[]; timestamp: number }> = new Map();
	private errorHandler: ErrorHandler;

	private constructor() {
		this.errorHandler = ErrorHandler.getInstance();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): HolidayService {
		if (!HolidayService.instance) {
			HolidayService.instance = new HolidayService();
		}
		return HolidayService.instance;
	}

	/**
	 * Fetch holidays for a given year and country
	 * @param year The year to fetch holidays for (default: current year)
	 * @param country The country code (default: 'ES' for Spain)
	 * @returns Array of Holiday objects
	 */
	async getHolidays(year?: number, country: string = 'ES'): Promise<Holiday[]> {
		const targetYear = year || new Date().getFullYear();
		const cacheKey = `${country}-${targetYear}`;

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
			this.errorHandler.logDebug(`Holidays retrieved from cache (${country} ${targetYear})`, 'HolidayService.getHolidays');
			return cached.data;
		}

		try {
			this.errorHandler.logDebug(`Fetching holidays from API (${country} ${targetYear})`, 'HolidayService.getHolidays');

			const url = `${this.API_BASE_URL}/${targetYear}/${country}`;
			const response = await fetchPolyfill(url);

			if (!response.ok) {
				throw new Error(`Holiday API returned ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as Holiday[];

			// Cache the result
			this.cache.set(cacheKey, {
				data: data || [],
				timestamp: Date.now()
			});

			this.errorHandler.logInfo(`Holidays loaded successfully (${country} ${targetYear}): ${(data || []).length} holidays`, 'HolidayService.getHolidays');
			return data || [];
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.logWarning(`Failed to fetch holidays from ${this.API_BASE_URL}/${targetYear}/${country}: ${errorMessage}`, 'HolidayService.getHolidays');
			// Return empty array on error instead of throwing
			return [];
		}
	}

	/**
	 * Check if a specific date is a holiday
	 * @param date ISO 8601 date string (YYYY-MM-DD) or Date object
	 * @param year The year to check holidays for
	 * @param country The country code (default: 'ES' for Spain)
	 * @returns Holiday object if it's a holiday, null otherwise
	 */
	async isHoliday(date: Date | string, year?: number, country: string = 'ES'): Promise<Holiday | null> {
		const dateString = date instanceof Date ? date.toISOString().split('T')[0] : date;
		const targetYear = year || (date instanceof Date ? date.getFullYear() : parseInt(dateString.split('-')[0], 10));

		const holidays = await this.getHolidays(targetYear, country);
		return holidays.find(h => h.date === dateString) || null;
	}

	/**
	 * Get holidays for a specific month
	 * @param month Month (1-12)
	 * @param year The year to fetch holidays for (default: current year)
	 * @param country The country code (default: 'ES' for Spain)
	 * @returns Array of Holiday objects for that month
	 */
	async getHolidaysForMonth(month: number, year?: number, country: string = 'ES'): Promise<Holiday[]> {
		const targetYear = year || new Date().getFullYear();
		const holidays = await this.getHolidays(targetYear, country);

		const monthStr = month.toString().padStart(2, '0');
		const targetMonthPrefix = `${targetYear}-${monthStr}`;

		return holidays.filter(h => h.date.startsWith(targetMonthPrefix));
	}

	/**
	 * Clear cache for a specific year
	 * @param year The year to clear cache for (if not provided, clears all cache)
	 */
	clearCache(year?: number): void {
		if (year) {
			for (const key of this.cache.keys()) {
				if (key.endsWith(`-${year}`)) {
					this.cache.delete(key);
				}
			}
			this.errorHandler.logDebug(`Cache cleared for year ${year}`, 'HolidayService.clearCache');
		} else {
			this.cache.clear();
			this.errorHandler.logDebug('All cache cleared', 'HolidayService.clearCache');
		}
	}
}

export default HolidayService;
