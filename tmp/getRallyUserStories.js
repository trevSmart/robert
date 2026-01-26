// Load the default export properly
const rally = require('ibm-rally-node').default || require('ibm-rally-node');

async function getUserStoriesWithScheduleState() {
	try {
		// Configuració de Rally
		const apiKey = process.env.RALLY_API_KEY || '_CHANGE_ME';
		const server = process.env.RALLY_SERVER || 'https://rally1.rallydev.com';

		if (apiKey === '_CHANGE_ME') {
			console.error('\n❌ ERROR: RALLY_API_KEY no està configurada');
			console.error('   Usa: export RALLY_API_KEY="tu_clau_api"');
			process.exit(1);
		}

		console.log('🚀 Inicialitzant cliente Rally...');
		console.log(`   Server: ${server}`);
		console.log(`   API Key: ***${apiKey.slice(-4)}\n`);

		// Inicialitzar client de Rally
		const rallyApi = rally({
			apiKey: apiKey,
			server: server,
			requestOptions: {
				headers: {
					'X-RallyIntegrationName': 'Robert Script',
					'X-RallyIntegrationVendor': 'IBM',
				}
			}
		});

		// Obtenir el projecte "Team.CC IBM_CC"
		console.log('🔍 Buscant projecte "Team.CC IBM_CC"...');
		const projectResults = await rallyApi.query({
			type: 'project',
			fetch: ['ObjectID', 'Name'],
			query: `(Name = "Team.CC IBM_CC")`
		});

		const projects = projectResults.Results || [];
		if (!projects || projects.length === 0) {
			console.error('❌ Projecte no trobat');
			return;
		}

		const project = projects[0];
		console.log(`✅ Projecte trobat: ${project.Name} (ObjectID: ${project.ObjectID})\n`);

		// Obtenir el sprint 86
		console.log('🔍 Buscant Sprint 86...');
		const iterations = await rallyApi.query({
			type: 'iteration',
			fetch: ['ObjectID', 'Name', 'State', 'StartDate', 'EndDate'],
			query: `(Project.ObjectID = ${project.ObjectID})`
		});

		const sprints = iterations.Results || [];
		const sprint = sprints.find(s => s.Name.includes('86'));

		if (!sprint) {
			console.error('❌ Sprint 86 no trobat');
			console.log('Sprints disponibles:');
			sprints.forEach(s => console.log(`  - ${s.Name}`));
			return;
		}

		console.log(`✅ Sprint trobat: ${sprint.Name}`);
		console.log(`   ObjectID: ${sprint.ObjectID}`);
		console.log(`   State: ${sprint.State}`);
		console.log(`   Dates: ${sprint.StartDate} - ${sprint.EndDate}\n`);

		// Obtenir les User Stories del sprint 86
		console.log('🔍 Recuperant User Stories del Sprint 86...');
		const storyResults = await rallyApi.query({
			type: 'hierarchicalrequirement',
			fetch: [
				'ObjectID',
				'FormattedID',
				'Name',
				'ScheduleState',
				'State',
				'Owner',
				'Iteration',
				'Blocked',
				'PlanEstimate',
				'TaskEstimateTotal',
			],
			query: `(Iteration.ObjectID = ${sprint.ObjectID})`,
			pageSize: 100
		});

		const userStories = storyResults.Results || [];

		console.log(`✅ S'han recuperat ${userStories.length} User Stories\n`);

		// Mostrar resultats en format taula
		console.log('📊 RESULTATS:\n');
		console.log(
			'│ FormattedID │ ScheduleState │ Name                                       │ Owner           │ Blocked │'
		);
		console.log(
			'├─────────────┼───────────────┼────────────────────────────────────────────┼─────────────────┼─────────┤'
		);

		userStories.forEach((us) => {
			const scheduleState = (us.ScheduleState || 'N/A').padEnd(13);
			const owner = ((us.Owner && us.Owner._refObjectName) || 'N/A').padEnd(15);
			const blocked = us.Blocked ? '✅ Yes' : '❌ No';
			const name = us.Name.substring(0, 42).padEnd(42);
			const formattedId = us.FormattedID.padEnd(11);

			console.log(
				`│ ${formattedId} │ ${scheduleState} │ ${name} │ ${owner} │ ${blocked}   │`
			);
		});

		// Resum per ScheduleState
		console.log('\n\n📈 RESUM PER SCHEDULE STATE:\n');
		const byScheduleState = {};
		userStories.forEach((us) => {
			const state = us.ScheduleState || 'N/A';
			byScheduleState[state] = (byScheduleState[state] || 0) + 1;
		});

		Object.entries(byScheduleState)
			.sort((a, b) => b[1] - a[1])
			.forEach(([state, count]) => {
				console.log(`  • ${state}: ${count} user stories`);
			});

		// JSON complet per a referència
		console.log('\n\n📋 DADES COMPLETES EN JSON:\n');
		const jsonData = userStories.map((us) => ({
			FormattedID: us.FormattedID,
			Name: us.Name,
			ScheduleState: us.ScheduleState || 'N/A',
			Owner: (us.Owner && us.Owner._refObjectName) || null,
			Blocked: us.Blocked,
			PlanEstimate: us.PlanEstimate,
			TaskEstimateTotal: us.TaskEstimateTotal,
		}));
		console.log(JSON.stringify(jsonData, null, 2));
	} catch (error) {
		console.error('\n❌ Error:', error.message);
		if (error.errors) {
			console.error('Rally Errors:', error.errors);
		}
		console.error('\nStackTrace:', error.stack);
	}
}

// Executar
getUserStoriesWithScheduleState();
