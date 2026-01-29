#!/usr/bin/env node

/**
 * Test script to inspect the detailed holiday data structure
 */

async function inspectHolidayData() {
	console.log('[TEST] Inspecting detailed holiday data from nager.date API...\n');

	const url = 'https://date.nager.at/api/v3/PublicHolidays/2026/ES';

	try {
		const response = await fetch(url);
		const data = await response.json();

		console.log(`[TEST] Total holidays: ${data.length}\n`);
		console.log('[TEST] Holiday data structure:');
		console.log('=====================================\n');

		// Show first 15 holidays with all their properties
		data.slice(0, 15).forEach((holiday, index) => {
			console.log(`Holiday ${index + 1}:`);
			console.log(`  Date: ${holiday.date}`);
			console.log(`  Name: ${holiday.name}`);
			console.log(`  Type: ${holiday.type || 'N/A'}`);
			console.log(`  County Code: ${holiday.countryCode || 'N/A'}`);
			console.log(`  All properties: ${JSON.stringify(Object.keys(holiday))}`);
			console.log(`  Full object: ${JSON.stringify(holiday, null, 2)}\n`);
		});

		// Check for regional/local specific holidays
		console.log('=====================================');
		console.log('[TEST] Analyzing holiday types:\n');

		const typeGroups = {};
		data.forEach(holiday => {
			const type = holiday.type || 'Unknown';
			if (!typeGroups[type]) {
				typeGroups[type] = [];
			}
			typeGroups[type].push(holiday.name);
		});

		Object.entries(typeGroups).forEach(([type, holidays]) => {
			console.log(`Type: ${type} (${holidays.length} holidays)`);
			holidays.forEach(name => {
				console.log(`  - ${name}`);
			});
			console.log();
		});
	} catch (error) {
		console.log(`[TEST] ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
	}
}

inspectHolidayData().catch(err => {
	console.error('[TEST] Fatal error:', err);
	process.exit(1);
});
