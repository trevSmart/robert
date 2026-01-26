// Script per recuperar i analitzar discussions d'una user story Rally
// Usage: node tmp/getUserStoryDiscussions.js <userStoryId>

const { getUserStoryDiscussions } = require('../src/libs/rally/rallyServices');

async function main() {
	const userStoryId = process.argv[2];
	if (!userStoryId) {
		console.error('Usage: node getUserStoryDiscussions.js <userStoryId>');
		process.exit(1);
	}
	try {
		const result = await getUserStoryDiscussions(userStoryId);
		console.log('Discussions:', JSON.stringify(result, null, 2));
		if (result.discussions && result.discussions.length > 0) {
			const authors = new Set(result.discussions.map(d => d.author));
			const dates = result.discussions.map(d => d.createdDate);
			console.log(`\nTotal discussions: ${result.discussions.length}`);
			console.log(`Authors: ${Array.from(authors).join(', ')}`);
			console.log(`First date: ${dates[0]}`);
			console.log(`Last date: ${dates[dates.length - 1]}`);
		} else {
			console.log('No discussions found.');
		}
	} catch (err) {
		console.error('Error:', err);
		process.exit(2);
	}
}

main();
