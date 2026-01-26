const fs = require('fs');
const path = require('path');

/**
 * Script per recuperar User Stories del Sprint 86 del projecte "Team.CC IBM_CC"
 * Utilitza la clau API de Rally configurada a VS Code
 */

async function getUserStoriesWithScheduleState() {
	try {
		// Intenta llegir la clau API de la configuració VS Code
		const configPath = path.expand('~/.config/Code/User/settings.json');
		if (!fs.existsSync(configPath)) {
			console.warn('⚠️  No s\'ha trobat la configuració VS Code. Usa el paràmetre RALLY_API_KEY:');
			console.warn('   export RALLY_API_KEY="tua_clau_api"');
			process.exit(1);
		}

		let config = {};
		try {
			const configContent = fs.readFileSync(configPath, 'utf-8');
			const fullConfig = JSON.parse(configContent);
			// Buscar la configuració de Robert
			config = Object.keys(fullConfig)
				.filter(k => k.startsWith('robert.'))
				.reduce((obj, k) => {
					obj[k.replace('robert.', '')] = fullConfig[k];
					return obj;
				}, {});
		} catch (e) {
			console.warn('⚠️  No s\'ha pogut llegir la configuració VS Code');
		}

		const apiKey = process.env.RALLY_API_KEY || config.rallyApiKey;
		const server = config.rallyInstance || 'https://rally1.rallydev.com';

		if (!apiKey) {
			console.error('\n❌ ERROR: RALLY_API_KEY no està configurada');
			console.error('   Opcions:');
			console.error('   1. Configura-la a VS Code: File > Preferences > Settings > robert.rallyApiKey');
			console.error('   2. O usa variable d\'entorn: export RALLY_API_KEY="tua_clau_api"');
			process.exit(1);
		}

		// Load the ibm-rally-node library
		let rally;
		try {
			rally = require('ibm-rally-node').default || require('ibm-rally-node');
		} catch (e) {
			console.error('❌ Error: No s\'ha pogut cargar ibm-rally-node');
			console.error('   Assegura que estàs al directori del projecte i has executat: npm install');
			process.exit(1);
		}

		console.log('🚀 Inicialitzant client Rally...');
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

		if (!projectResults || projectResults.length === 0) {
			console.error('❌ Projecte "Team.CC IBM_CC" no trobat');
			return;
		}

		const project = projectResults[0];
		console.log(`✅ Projecte trobat: ${project.Name}`);
		console.log(`   ObjectID: ${project.ObjectID}\n`);

		// Obtenir el sprint 86
		console.log('🔍 Buscant Sprint 86...');
		const iterations = await rallyApi.query({
			type: 'iteration',
			fetch: ['ObjectID', 'Name', 'State', 'StartDate', 'EndDate'],
			query: `(Project.ObjectID = "${project.ObjectID}" AND (Name contains "86" OR Name contains "Sprint 86"))`
		});

		if (!iterations || iterations.length === 0) {
			console.error('❌ Sprint 86 no trobat');
			return;
		}

		const sprint = iterations[0];
		console.log(`✅ Sprint trobat: ${sprint.Name}`);
		console.log(`   ObjectID: ${sprint.ObjectID}`);
		console.log(`   State: ${sprint.State}`);
		console.log(`   Dates: ${sprint.StartDate} - ${sprint.EndDate}\n`);

		// Obtenir les User Stories del sprint 86
		console.log('🔍 Recuperant User Stories del Sprint 86...');
		const userStories = await rallyApi.query({
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
			query: `(Iteration.ObjectID = "${sprint.ObjectID}")`,
			pageSize: 100
		});

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
			const owner = ((us.Owner && us.Owner.Name) || 'N/A').padEnd(15);
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
			Owner: (us.Owner && us.Owner.Name) || null,
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
		if (process.env.DEBUG) {
			console.error('\nStackTrace:', error.stack);
		}
	}
}

// Executar
getUserStoriesWithScheduleState();
