const rally = require('ibm-rally-node').default || require('ibm-rally-node');

const rallyApi = rally({
	apiKey: process.env.RALLY_API_KEY,
	server: process.env.RALLY_SERVER || 'https://eu1.rallydev.com',
	requestOptions: {
		headers: {
			'X-RallyIntegrationName': 'Robert Script',
			'X-RallyIntegrationVendor': 'IBM'
		}
	}
});

// Project objectID from context: Team.CC IBM_CC
const projectOID = '74278607305';

async function checkDefectsScheduleState() {
	try {
		console.log('\n📋 CHECKING DEFECTS SCHEDULE STATE IN PROJECT...\n');
		console.log(`Project: Team.CC IBM_CC (ObjectID: ${projectOID})\n`);

		const defectsResult = await rallyApi.query({
			type: 'defect',
			fetch: ['FormattedID', 'Name', 'ScheduleState', 'State', 'Severity', 'Priority', 'Owner', 'Iteration'],
			query: `(Project.ObjectID = ${projectOID})`,
			limit: 200
		});

		const results = defectsResult.Results || [];
		console.log(`✅ Found ${results.length} defects in project\n`);

		if (results.length === 0) {
			console.log('No defects found in this project.');
			return;
		}

		const hasScheduleState = {};
		const scheduleStateValues = {};
		let withoutScheduleState = 0;

		// Analyze each defect
		results.forEach((defect) => {
			const scheduleState = defect.ScheduleState || null;
			const state = defect.State || null;

			// Track if defect has ScheduleState
			if (scheduleState) {
				hasScheduleState[defect.FormattedID] = scheduleState;
				scheduleStateValues[scheduleState] = (scheduleStateValues[scheduleState] || 0) + 1;
			} else {
				withoutScheduleState++;
			}

			// Log first 10 defects for detail
			if (Object.keys(hasScheduleState).length + withoutScheduleState <= 10) {
				console.log(`${defect.FormattedID} "${defect.Name.substring(0, 50)}"`);
				console.log(`  ScheduleState: ${scheduleState || '(empty)'}`);
				console.log(`  State: ${state || '(empty)'}`);
				console.log(`  Severity: ${defect.Severity || '(empty)'}`);
				console.log('');
			}
		});

		// Summary
		console.log('\n📊 SUMMARY:\n');
		console.log(`Total defects: ${results.length}`);
		console.log(`Defects WITH ScheduleState: ${Object.keys(hasScheduleState).length}`);
		console.log(`Defects WITHOUT ScheduleState: ${withoutScheduleState}`);

		if (Object.keys(scheduleStateValues).length > 0) {
			console.log('\n📈 ScheduleState Distribution:');
			Object.entries(scheduleStateValues).forEach(([value, count]) => {
				console.log(`  ${value}: ${count} defects`);
			});
		}

		console.log('\n');
		process.exit(0);
	} catch (error) {
		console.error('❌ Error:', error.message);
		if (error.errors) {
			console.error('Rally Errors:', error.errors);
		}
		process.exit(1);
	}
}

checkDefectsScheduleState();
