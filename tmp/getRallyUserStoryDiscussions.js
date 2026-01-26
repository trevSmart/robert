// Script per recuperar discussions d'una user story Rally amb ibm-rally-node
// Usage: node tmp/getRallyUserStoryDiscussions.js <FormattedID> [ProjectName]

const rally = require('ibm-rally-node').default || require('ibm-rally-node');

async function main() {
	const formattedId = process.argv[2];
	const projectName = process.argv[3] || 'Team.CC IBM_CC';
	if (!formattedId) {
		console.error('Usage: node getRallyUserStoryDiscussions.js <FormattedID> [ProjectName]');
		process.exit(1);
	}

	const apiKey = process.env.RALLY_API_KEY || '_CHANGE_ME';
	const server = process.env.RALLY_SERVER || 'https://rally1.rallydev.com';
	if (apiKey === '_CHANGE_ME') {
		console.error('❌ ERROR: RALLY_API_KEY no està configurada');
		process.exit(1);
	}

	const rallyApi = rally({
		apiKey,
		server,
		requestOptions: {
			headers: {
				'X-RallyIntegrationName': 'Robert Script',
				'X-RallyIntegrationVendor': 'IBM',
			}
		}
	});

	// Troba el projecte
	const projectResults = await rallyApi.query({
		type: 'project',
		fetch: ['ObjectID', 'Name'],
		query: `(Name = "${projectName}")`
	});
	const project = (projectResults.Results || [])[0];
	if (!project) {
		console.error('❌ Projecte no trobat:', projectName);
		process.exit(2);
	}

	// Troba la user story només pel FormattedID (sense Project.ObjectID per evitar error de sintaxi)
	const usResults = await rallyApi.query({
		type: 'hierarchicalrequirement',
		fetch: ['ObjectID', 'FormattedID', 'Name', 'Discussion'],
		query: `(FormattedID = "${formattedId}")`
	});
	const us = (usResults.Results || [])[0];
	if (!us) {
		console.error('❌ User story no trobada:', formattedId);
		process.exit(3);
	}

	// Si Discussion és només un recompte, fem query a ConversationPost
	let discussions = [];
	const authorFields = ['Author', 'Author._refObjectName', 'Author._ref', 'Author.Name'];
	if (!us.Discussion || (typeof us.Discussion === 'object' && us.Discussion.Count !== undefined && !us.Discussion.Results)) {
		const discResults = await rallyApi.query({
			type: 'conversationpost',
			fetch: ['ObjectID', 'Text', 'Author', 'Author._refObjectName', 'Author._ref', 'Author.Name', 'CreationDate', 'Artifact'],
			query: `(Artifact.ObjectID = ${us.ObjectID})`
		});
		discussions = discResults.Results || [];
	} else if (Array.isArray(us.Discussion.Results)) {
		// Si Discussion té Results, fem query per cada ID
		const ids = us.Discussion.Results.map(d => d.ObjectID).filter(Boolean);
		if (ids.length) {
			const discResults = await rallyApi.query({
				type: 'conversationpost',
				fetch: ['ObjectID', 'Text', 'Author', 'Author._refObjectName', 'Author._ref', 'Author.Name', 'CreationDate', 'Artifact'],
				query: ids.map(id => `(ObjectID = ${id})`).join(' or ')
			});
			discussions = discResults.Results || [];
		}
	}

	// Analitza i mostra
	if (!discussions.length) {
		console.log('No discussions found.');
		return;
	}
	console.log(`\nTotal discussions: ${discussions.length}`);
	const authors = new Set(discussions.map(d => d.Author?._refObjectName || d.Author?.refObjectName || 'Unknown'));
	const dates = discussions.map(d => d.CreationDate).sort();
	console.log(`Authors: ${Array.from(authors).join(', ')}`);
	console.log(`First date: ${dates[0]}`);
	console.log(`Last date: ${dates[dates.length - 1]}`);
	console.log('\nSample discussions:');
	discussions.slice(0, 3).forEach((d, i) => {
		console.log(`\n#${i + 1}`);
		console.log('All keys:', Object.keys(d));
		console.log('Full discussion object:', JSON.stringify(d, null, 2));
		if (d.CreatedBy?._refObjectName) {
			console.log('CreatedBy:', d.CreatedBy._refObjectName);
		}
		if (d.Owner?._refObjectName) {
			console.log('Owner:', d.Owner._refObjectName);
		}
		if (d.Author?._refObjectName || d.Author?.refObjectName) {
			console.log('Author:', d.Author._refObjectName || d.Author.refObjectName);
		} else if (d['Author._refObjectName']) {
			console.log('Author (Author._refObjectName):', d['Author._refObjectName']);
		} else if (d['Author.Name']) {
			console.log('Author (Author.Name):', d['Author.Name']);
		} else {
			console.log('Author: Unknown');
		}
		console.log('Date:', d.CreationDate);
		console.log('Text:', d.Text);
	});
}

main().catch(e => { console.error('Error:', e); process.exit(10); });
