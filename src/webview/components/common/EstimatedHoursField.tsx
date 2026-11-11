import { FC, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { type UserStory } from '../../../types/jira';
import { getVsCodeApi, logDebug } from '../../utils/vscodeApi';
import { parseEstimatedHours } from '../../../utils/estimatedHours';

/** How long to wait for the extension to answer a save before giving up. */
const SAVE_TIMEOUT_MS = 30000;
const SAVED_BADGE_MS = 2500;

interface EstimatedHoursFieldProps {
	userStory: UserStory;
	/** False for providers where the value is read-only (Rally rolls hours up from tasks). */
	editable: boolean;
}

type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'saved' } | { status: 'error'; message: string };

const labelStyle: CSSProperties = {
	display: 'block',
	marginBottom: '4px',
	fontSize: '12px',
	color: 'var(--vscode-descriptionForeground)'
};

const readOnlyInputStyle: CSSProperties = {
	width: '100%',
	boxSizing: 'border-box',
	padding: '6px 8px',
	backgroundColor: 'color-mix(in srgb, var(--vscode-input-background) 60%, var(--vscode-panel-background))',
	color: 'var(--vscode-input-foreground)',
	border: '1px solid var(--vscode-input-border)',
	borderRadius: '3px',
	fontSize: '13px'
};

const hintStyle: CSSProperties = {
	marginTop: '4px',
	fontSize: '11px',
	color: 'var(--vscode-descriptionForeground)'
};

function formatHours(value: number | null | undefined): string {
	return value === null || value === undefined ? '' : String(value);
}

const iconButtonStyle = (primary: boolean, disabled: boolean): CSSProperties => ({
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	padding: '0 10px',
	minHeight: '29px',
	border: 'none',
	borderRadius: '3px',
	fontSize: '12px',
	whiteSpace: 'nowrap',
	cursor: disabled ? 'not-allowed' : 'pointer',
	opacity: disabled ? 0.6 : 1,
	backgroundColor: primary ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
	color: primary ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)'
});

/**
 * "Estimated Hours" field of the user story form.
 *
 * Jira: inline editor for the story's own original estimate. The value is saved
 * when the user presses Save or Enter (Escape discards), and the form receives
 * the story as stored by Jira afterwards (MainWebview handles `userStoryUpdated`).
 * Rally: read-only TaskEstimateTotal, which Rally computes from the tasks.
 */
const EstimatedHoursField: FC<EstimatedHoursFieldProps> = ({ userStory, editable }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const storedValue = editable ? (userStory.estimatedHours ?? null) : (userStory.taskEstimateTotal ?? 0);
	const [draft, setDraft] = useState<string>(formatHours(storedValue));
	const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
	const cleanupRef = useRef<(() => void) | null>(null);

	// Another story opened: start clean (adjusting state during render, as React recommends over an effect).
	const [syncedObjectId, setSyncedObjectId] = useState(userStory.objectId);
	const [syncedValue, setSyncedValue] = useState(storedValue);
	if (syncedObjectId !== userStory.objectId) {
		setSyncedObjectId(userStory.objectId);
		setSyncedValue(storedValue);
		setDraft(formatHours(storedValue));
		setSaveState({ status: 'idle' });
	} else if (syncedValue !== storedValue && saveState.status !== 'saving') {
		// The stored value changed (the save came back, or the story was reloaded).
		setSyncedValue(storedValue);
		setDraft(formatHours(storedValue));
	}

	// Drop a pending save listener on unmount or when another story is opened.
	useEffect(() => {
		return () => {
			cleanupRef.current?.();
			cleanupRef.current = null;
		};
	}, [userStory.objectId]);

	useEffect(() => {
		if (saveState.status !== 'saved') return;
		const timer = setTimeout(() => setSaveState({ status: 'idle' }), SAVED_BADGE_MS);
		return () => clearTimeout(timer);
	}, [saveState.status]);

	const parsed = parseEstimatedHours(draft);
	const dirty = editable && draft.trim() !== formatHours(storedValue) && !(parsed.ok && storedValue !== null && parsed.value === storedValue);
	const saving = saveState.status === 'saving';

	const cancel = useCallback(() => {
		setDraft(formatHours(storedValue));
		setSaveState({ status: 'idle' });
	}, [storedValue]);

	const save = useCallback(() => {
		if (!vscode || saving || !dirty) return;
		const result = parseEstimatedHours(draft);
		if (!result.ok) {
			setSaveState({ status: 'error', message: result.error });
			return;
		}

		const requestId = `estimatedHours-${userStory.objectId}-${Date.now()}`;
		const finish = (state: SaveState) => {
			cleanupRef.current?.();
			cleanupRef.current = null;
			setSaveState(state);
		};
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			if (!message || message.requestId !== requestId) return;
			if (message.command === 'userStoryUpdated') {
				finish({ status: 'saved' });
			} else if (message.command === 'userStoryUpdateError') {
				finish({ status: 'error', message: message.error || 'Could not save the estimated hours' });
			}
		};
		const timer = setTimeout(() => finish({ status: 'error', message: 'No answer from the extension. Try again.' }), SAVE_TIMEOUT_MS);
		window.addEventListener('message', handleMessage);
		cleanupRef.current = () => {
			window.removeEventListener('message', handleMessage);
			clearTimeout(timer);
		};

		setSaveState({ status: 'saving' });
		logDebug(`Saving estimated hours of ${userStory.formattedId}: ${result.value}h`, 'EstimatedHoursField');
		vscode.postMessage({
			command: 'updateUserStoryEstimatedHours',
			userStoryObjectId: userStory.objectId,
			estimatedHours: result.value,
			requestId
		});
	}, [vscode, saving, dirty, draft, userStory.objectId, userStory.formattedId]);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			save();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
	};

	if (!editable) {
		return (
			<div>
				<label style={labelStyle}>Estimated Hours (h)</label>
				<input type="text" value={formatHours(storedValue)} readOnly title="In Rally the estimated hours are the sum of the task estimates. Edit the tasks to change them." style={readOnlyInputStyle} />
			</div>
		);
	}

	const showError = saveState.status === 'error';
	const total = userStory.taskEstimateTotal ?? 0;
	const own = userStory.estimatedHours ?? 0;
	const showTotalHint = !dirty && !showError && Math.abs(total - own) > 0.001;

	return (
		<div>
			<label htmlFor={`estimated-hours-${userStory.objectId}`} style={labelStyle}>
				Estimated Hours (h)
			</label>
			<div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
				<input
					id={`estimated-hours-${userStory.objectId}`}
					type="text"
					inputMode="decimal"
					value={draft}
					placeholder="Not estimated"
					disabled={saving}
					onChange={event => {
						setDraft(event.target.value);
						if (saveState.status === 'error' || saveState.status === 'saved') {
							setSaveState({ status: 'idle' });
						}
					}}
					onKeyDown={handleKeyDown}
					title="Original estimate of this story in Jira (sub-tasks not included). Press Enter to save, Escape to discard."
					aria-invalid={showError}
					style={{
						flex: 1,
						minWidth: 0,
						boxSizing: 'border-box',
						padding: '6px 8px',
						backgroundColor: 'var(--vscode-input-background)',
						color: 'var(--vscode-input-foreground)',
						border: `1px solid ${showError ? 'var(--vscode-inputValidation-errorBorder)' : dirty ? 'var(--vscode-focusBorder)' : 'var(--vscode-input-border)'}`,
						borderRadius: '3px',
						fontSize: '13px'
					}}
				/>
				{(dirty || saving) && (
					<>
						<button type="button" onClick={save} disabled={saving} style={iconButtonStyle(true, saving)} title="Save (Enter)">
							{saving ? 'Saving…' : 'Save'}
						</button>
						{!saving && (
							<button type="button" onClick={cancel} style={iconButtonStyle(false, false)} title="Discard (Escape)">
								Cancel
							</button>
						)}
					</>
				)}
			</div>
			{showError && (
				<div role="alert" style={{ ...hintStyle, color: 'var(--vscode-errorForeground)' }}>
					{saveState.message}
				</div>
			)}
			{saveState.status === 'saved' && <div style={{ ...hintStyle, color: 'var(--vscode-charts-green)' }}>✓ Saved to Jira</div>}
			{showTotalHint && saveState.status !== 'saved' && <div style={hintStyle}>Total incl. sub-tasks: {total}h</div>}
		</div>
	);
};

export default EstimatedHoursField;
