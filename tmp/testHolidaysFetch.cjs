#!/usr/bin/env node

/**
 * Test script to verify holiday API fetch works
 * Uses the same fetch polyfill approach as the extension
 */

async function testHolidaysFetch() {
	console.log('[TEST] Starting holiday fetch test...\n');

	// Test 1: Native fetch
	console.log('[TEST] Attempt 1: Using native fetch');
	try {
		if (typeof globalThis.fetch === 'function') {
			console.log('[TEST] ✓ globalThis.fetch is available');
			const url = 'https://holiday.date/holidays?country=ES&year=2026';
			console.log(`[TEST] Fetching from: ${url}`);

			const response = await fetch(url);
			console.log(`[TEST] Response status: ${response.status} ${response.statusText}`);

			if (response.ok) {
				const data = await response.json();
				console.log(`[TEST] ✓ Success! Got ${data.length} holidays`);
				console.log(`[TEST] First 3 holidays:`);
				data.slice(0, 3).forEach(h => {
					console.log(`  - ${h.date}: ${h.name}`);
				});
			} else {
				console.log(`[TEST] ✗ API returned error: ${response.status}`);
			}
		} else {
			console.log('[TEST] ✗ globalThis.fetch is NOT available');
		}
	} catch (error) {
		console.log(`[TEST] ✗ Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
	}

	// Test 2: Using node-fetch
	console.log('\n[TEST] Attempt 2: Using node-fetch');
	try {
		const nodeFetch = await import('node-fetch');
		console.log('[TEST] ✓ node-fetch imported successfully');
		const url = 'https://holiday.date/holidays?country=ES&year=2026';
		console.log(`[TEST] Fetching from: ${url}`);

		const response = await nodeFetch.default(url);
		console.log(`[TEST] Response status: ${response.status} ${response.statusText}`);

		if (response.ok) {
			const data = await response.json();
			console.log(`[TEST] ✓ Success! Got ${data.length} holidays`);
			console.log(`[TEST] First 3 holidays:`);
			data.slice(0, 3).forEach(h => {
				console.log(`  - ${h.date}: ${h.name}`);
			});
		} else {
			console.log(`[TEST] ✗ API returned error: ${response.status}`);
		}
	} catch (error) {
		console.log(`[TEST] ✗ node-fetch failed: ${error instanceof Error ? error.message : String(error)}`);
	}

	// Test 3: Direct fetch with alternative API
	console.log('\n[TEST] Attempt 3: Testing alternative API (nager.date)');
	try {
		const url = 'https://date.nager.at/api/v3/PublicHolidays/2026/ES';
		console.log(`[TEST] Fetching from: ${url}`);

		let response;
		if (typeof globalThis.fetch === 'function') {
			response = await fetch(url);
		} else {
			const nodeFetch = await import('node-fetch');
			response = await nodeFetch.default(url);
		}

		console.log(`[TEST] Response status: ${response.status} ${response.statusText}`);

		if (response.ok) {
			const data = await response.json();
			console.log(`[TEST] ✓ Success! Got ${data.length} holidays`);
			console.log(`[TEST] First 3 holidays:`);
			data.slice(0, 3).forEach(h => {
				console.log(`  - ${h.date}: ${h.name}`);
			});
		} else {
			console.log(`[TEST] ✗ API returned error: ${response.status}`);
		}
	} catch (error) {
		console.log(`[TEST] ✗ Alternative API failed: ${error instanceof Error ? error.message : String(error)}`);
	}
}

testHolidaysFetch().catch(err => {
	console.error('[TEST] Fatal error:', err);
	process.exit(1);
});
