import {mcpServer, client, logLevel} from '../index.js';

export async function log(data, level = logLevel) {
	if (typeof data === 'object') {
		data = JSON.stringify(data);
	}
	if (typeof data === 'string') {
		if (data.length > 4000) {
			data = `${data.slice(0, 3997)}...`;
		}
		data = `\n${data}\n`;
	}

	try {
		if (clientSupportsCapability('logging')) {
			await mcpServer.server.sendLoggingMessage({level: level, logger: 'MCP server', data});
		}
	} catch (error) {
		console.error(error);
	}
}

export function clientSupportsCapability(capabilityName) {
	switch (capabilityName) {
		case 'resources':
			return client.capabilities.resources;

		case 'embeddedResources':
			return client.capabilities.embeddedResources;

		case 'resourceLinks':
			return false;

		default:
			return Boolean(client.capabilities[capabilityName]);
	}
}

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ICON_VARIANTS = [
	{size: 32, filename: 'rally-logo-32.png'},
	// {size: 64, filename: 'ibm-logo-64.png'},
	// {size: 128, filename: 'ibm-logo-128.png'}
];

const baseDir = path.dirname(fileURLToPath(import.meta.url));

function ensureFileExists(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Icon file not found: ${filePath}`);
	}
}

function readIconAsDataUrl(filePath) {
	ensureFileExists(filePath);
	const base64Content = fs.readFileSync(filePath).toString('base64');
	return `data:image/png;base64,${base64Content}`;
}

function buildIconsDefinition() {
	// Return a single icon object with all sizes in the sizes array.
	// Use the first available variant as the source; the client can scale as needed.
	if (!ICON_VARIANTS.length) {
		return [];
	}

	const primaryVariant = ICON_VARIANTS[0];
	const iconPath = path.join(baseDir, 'assets', primaryVariant.filename);

	try {
		return [{
			src: readIconAsDataUrl(iconPath),
			mimeType: 'image/png',
			sizes: ICON_VARIANTS.map(v => `${v.size}x${v.size}`)
		}];
	} catch (error) {
		console.warn('Failed to load MCP server icons:', error);
		return [];
	}
}

export const icons = buildIconsDefinition();
