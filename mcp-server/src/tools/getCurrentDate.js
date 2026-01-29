export async function getCurrentDate() {
	try {
		let now;
		if (typeof Date === 'function' && typeof Date.now === 'function') {
			now = new Date(Date.now());
		} else {
			// If Date has been mocked and doesn't have .now (common in tests),
			// call Date() as a function so that mocks that throw will surface
			// their intended error message instead of causing "is not a constructor".
			const nowStr = Date();
			now = new Date(nowStr);
		}

		const result = {
			now,
			nowLocaleString: now.toLocaleString(),
			nowIsoString: now.toISOString(),
			timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone
		};

		return {
			content: [{
				type: 'text',
				text: `Data i hora actual:\n\n${JSON.stringify(result, null, '\t')}`,
			}]
		};

	} catch (error) {
		//console.error(`Error en getCurrentDate: ${error.message}`);
		return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error en getCurrentDate: ${error.message}`,
			}]
		};
	}
}

export const getCurrentDateTool = {
	name: 'getCurrentDate',
	title: 'Get Current Date',
	description: 'This tool retrieves the current date and time information.',
	inputSchema: {},
	annotations: {
		readOnlyHint: true
	}
};