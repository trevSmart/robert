#!/usr/bin/env node

/**
 * Test the updated HolidayService with nager.date API
 */

async function testNagerAPI() {
	console.log('[TEST] Testing nager.date API directly...\n');

	const url = 'https://date.nager.at/api/v3/PublicHolidays/2026/ES';
	console.log(`[TEST] Fetching from: ${url}`);

	try {
		const response = await fetch(url);
		console.log(`[TEST] Response status: ${response.status} ${response.statusText}`);

		if (response.ok) {
			const data = await response.json();
			console.log(`[TEST] ✓ Success! Got ${data.length} holidays`);
			console.log(`\n[TEST] Sample holidays for 2026 (Spain):`);
			data.slice(0, 10).forEach(h => {
				console.log(`  - ${h.date}: ${h.name}`);
			});
		} else {
			console.log(`[TEST] ✗ API returned error: ${response.status}`);
		}
	} catch (error) {
		console.log(`[TEST] ✗ Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
	}
}

testNagerAPI().catch(err => {
	console.error('[TEST] Fatal error:', err);
	process.exit(1);
});
