import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as vscode from 'vscode';

export class TemplateManager {
	private readonly _extensionUri: vscode.Uri;
	private readonly _templatesDir: string;

	constructor(extensionUri: vscode.Uri) {
		this._extensionUri = extensionUri;
		this._templatesDir = path.join(this._extensionUri.fsPath, 'src', 'templates');
	}

	/**
	 * Load and process an HTML template with placeholder replacement
	 */
	public async loadTemplate(templateName: string, placeholders: Record<string, string>): Promise<string> {
		try {
			const templatePath = path.join(this._templatesDir, templateName);
			const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
			return this.replacePlaceholders(templateContent, placeholders);
		} catch (error) {
			console.error(`Failed to load template ${templateName}:`, error);
			return this.getFallbackHtml(templateName);
		}
	}

	/**
	 * Replace placeholders in template content
	 */
	private replacePlaceholders(content: string, placeholders: Record<string, string>): string {
		let processedContent = content;

		for (const [key, value] of Object.entries(placeholders)) {
			const placeholder = `{{${key}}}`;
			processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
		}

		return processedContent;
	}

	/**
	 * Get fallback HTML when template loading fails
	 */
	private getFallbackHtml(templateName: string): string {
		return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Robert - Error</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #1e1e1e;
            background-color: #f3f3f3;
            padding: 20px;
            text-align: center;
        }
        body.dark {
            color: #eeeeee;
            background-color: #1e1e1e;
        }
        .error {
            color: #c72222;
            margin: 20px 0;
        }
        body.dark .error { color: #f48771; }
    </style>
</head>
<body>
    <h1>Robert</h1>
    <div class="error">
        Error loading template: ${templateName}
    </div>
    <p>Please check the extension configuration.</p>
</body>
</html>`;
	}

	/**
	 * Get the path to a template file
	 */
	public getTemplatePath(templateName: string): string {
		return path.join(this._templatesDir, templateName);
	}

	/**
	 * Check if a template file exists
	 */
	public async templateExists(templateName: string): Promise<boolean> {
		try {
			const templatePath = this.getTemplatePath(templateName);
			await fs.promises.access(templatePath);
			return true;
		} catch {
			return false;
		}
	}
}
