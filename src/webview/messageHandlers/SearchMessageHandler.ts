import * as vscode from 'vscode';
import { ErrorHandler } from '../../ErrorHandler';
import { globalSearch, getUserStoryByObjectId, getDefectByObjectId, getTaskWithParent, getTestCaseWithParent, getUserStoryRevisions, getUserStoryRevisionsCount } from '../../libs/rally/rallyServices';

/**
 * Handles search and lookup-related webview messages
 * Manages global searches and loading specific objects by ID
 */
export class SearchMessageHandler {
	constructor(private errorHandler: ErrorHandler) {}

	async handle(command: string, webview: vscode.Webview, message: any): Promise<boolean> {
		switch (command) {
			case 'globalSearch':
				await this.handleGlobalSearch(webview, message);
				return true;
			case 'loadUserStoryByObjectId':
				await this.handleLoadUserStoryByObjectId(webview, message);
				return true;
			case 'loadDefectByObjectId':
				await this.handleLoadDefectByObjectId(webview, message);
				return true;
			case 'loadTaskWithParent':
				await this.handleLoadTaskWithParent(webview, message);
				return true;
			case 'loadTestCaseWithParent':
				await this.handleLoadTestCaseWithParent(webview, message);
				return true;
			case 'getUserStoryRevisionsCount':
				await this.handleGetUserStoryRevisionsCount(webview, message);
				return true;
			case 'getUserStoryRevisions':
				await this.handleGetUserStoryRevisions(webview, message);
				return true;
			default:
				return false;
		}
	}

	private async handleGlobalSearch(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const searchResult = await globalSearch(message.term ?? '', { limitPerType: message.limitPerType ?? 50, searchType: message.searchType, offset: message.offset ?? 0 });
			webview.postMessage({
				command: 'globalSearchResults',
				results: searchResult.results,
				hasMore: searchResult.hasMore,
				term: message.term
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'globalSearch');
			webview.postMessage({
				command: 'globalSearchError',
				error: errorMessage,
				term: message.term
			});
		}
	}

	private async handleLoadUserStoryByObjectId(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const usResult = await getUserStoryByObjectId(message.objectId);
			webview.postMessage({
				command: 'userStoryByObjectIdLoaded',
				userStory: usResult.userStory,
				objectId: message.objectId
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadUserStoryByObjectId');
			webview.postMessage({
				command: 'userStoryByObjectIdError',
				error: errorMessage,
				objectId: message.objectId
			});
		}
	}

	private async handleLoadDefectByObjectId(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const defResult = await getDefectByObjectId(message.objectId);
			webview.postMessage({
				command: 'defectByObjectIdLoaded',
				defect: defResult.defect,
				objectId: message.objectId
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadDefectByObjectId');
			webview.postMessage({
				command: 'defectByObjectIdError',
				error: errorMessage,
				objectId: message.objectId
			});
		}
	}

	private async handleLoadTaskWithParent(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const taskResult = await getTaskWithParent(message.objectId);
			webview.postMessage({
				command: 'taskWithParentLoaded',
				task: taskResult.task,
				userStoryObjectId: taskResult.userStoryObjectId,
				objectId: message.objectId
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTaskWithParent');
			webview.postMessage({
				command: 'taskWithParentError',
				error: errorMessage,
				objectId: message.objectId
			});
		}
	}

	private async handleLoadTestCaseWithParent(webview: vscode.Webview, message: any): Promise<void> {
		try {
			const tcResult = await getTestCaseWithParent(message.objectId);
			webview.postMessage({
				command: 'testCaseWithParentLoaded',
				testCase: tcResult.testCase,
				userStoryObjectId: tcResult.userStoryObjectId,
				objectId: message.objectId
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTestCaseWithParent');
			webview.postMessage({
				command: 'testCaseWithParentError',
				error: errorMessage,
				objectId: message.objectId
			});
		}
	}

	private async handleGetUserStoryRevisionsCount(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Fetching revisions count for user story: ${message.userStoryObjectId}`, 'SearchMessageHandler');
			const result = await getUserStoryRevisionsCount(message.userStoryObjectId);
			webview.postMessage({
				type: 'revisionsCountLoaded',
				objectId: message.userStoryObjectId,
				count: result.count
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getUserStoryRevisionsCount');
			webview.postMessage({
				type: 'revisionsCountLoaded',
				objectId: message.userStoryObjectId,
				count: 0
			});
		}
	}

	private async handleGetUserStoryRevisions(webview: vscode.Webview, message: any): Promise<void> {
		try {
			this.errorHandler.logInfo(`Fetching revisions for user story: ${message.userStoryObjectId}`, 'SearchMessageHandler');
			const result = await getUserStoryRevisions(message.userStoryObjectId);
			webview.postMessage({
				type: 'revisionsLoaded',
				revisions: result.revisions
			});
		} catch (error) {
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'getUserStoryRevisions');
			webview.postMessage({
				type: 'revisionsLoaded',
				revisions: []
			});
		}
	}
}
