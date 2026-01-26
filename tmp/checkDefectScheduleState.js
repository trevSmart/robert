// Load the default export properly
const rally = require('ibm-rally-node').default || require('ibm-rally-node');

async function checkDefectFields() {
	try {
		const apiKey = process.env.RALLY_API_KEY || '_CHANGE_ME';
		const server = process.env.RALLY_SERVER || 'https://rally1.rallydev.com';

		if (apiKey === '_CHANGE_ME') {
			console.error('\n❌ ERROR: RALLY_API_KEY no està configurada');
			process.exit(1);
		}

		console.log('🚀 Inicialitzant cliente Rally...\n');

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
		if (!projects.length) {
			console.error('❌ Projecte no trobat');
			return;
		}

		const project = projects[0];
		console.log(`✅ Projecte trobat: ${project.Name}\n`);

		// Obtenir el sprint 86
		console.log('🔍 Buscant Sprint 86...');
		const iterations = await rallyApi.query({
			type: 'iteration',
			fetch: ['ObjectID', 'Name'],
			query: `(Project.ObjectID = ${project.ObjectID})`
		});

		const sprints = iterations.Results || [];
		const sprint = sprints.find(s => s.Name.includes('86'));

		if (!sprint) {
			console.error('❌ Sprint 86 no trobat');
			return;
		}

		console.log(`✅ Sprint trobat: ${sprint.Name}\n`);

		// Obtenir UNA defect del sprint per veure TOTS els camps disponibles
		console.log('🔍 Buscant Defects del Sprint 86...');
		const defectsResult = await rallyApi.query({
			type: 'defect',
			fetch: ['ObjectID', 'FormattedID', 'Name', 'State', 'ScheduleState', 'Status', 'Severity', 'Priority', 'Owner', 'Iteration', 'Blocked', 'Description', 'Discussion'],
			query: `(Iteration.ObjectID = ${sprint.ObjectID})`,
			limit: 1
		});

		const defects = defectsResult.Results || [];
		if (!defects.length) {
			console.log('⚠️  No hi ha defects al sprint 86');
			return;
		}

		const firstDefect = defects[0];
		console.log(`✅ S'ha trobat una defect: ${firstDefect.FormattedID}\n`);

		console.log('📋 TOTS ELS CAMPS DISPONIBLES:\n');
		const allKeys = Object.keys(firstDefect).sort();
		allKeys.forEach(key => {
			if (!key.startsWith('_')) {
				const value = firstDefect[key];
				console.log(`  • ${key}: ${JSON.stringify(value).substring(0, 60)}`);
			}
		});

		// Especial search per ScheduleState
		console.log('\n\n🔎 CERCA ESPECÍFICA:\n');
		if (firstDefect.ScheduleState) {
			console.log(`  ✅ ScheduleState ENCONTRAT: ${firstDefect.ScheduleState}`);
		} else {
			console.log(`  ❌ ScheduleState NO ENCONTRAT`);
		}

		if (firstDefect.State) {
			console.log(`  ✅ State ENCONTRAT: ${firstDefect.State}`);
		}

		if (firstDefect.Status) {
			console.log(`  ✅ Status ENCONTRAT: ${firstDefect.Status}`);
		}

		// JSON complet de la primera defect
		console.log('\n\n📊 FULL DEFECT DATA:\n');
		console.log(JSON.stringify(firstDefect, null, 2));

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
checkDefectFields();
