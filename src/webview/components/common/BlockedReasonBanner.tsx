import { FC } from 'react';
import styled from 'styled-components';

const Banner = styled.div`
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 8px 10px;
	border-radius: 6px;
	background: color(srgb 0.75 0.2 0.2 / 0.12);
	border: 1px solid color(srgb 0.75 0.2 0.2 / 0.3);
	color: var(--vscode-foreground);
	font-size: 12px;
	line-height: 1.45;
`;

const Label = styled.span`
	flex-shrink: 0;
	font-weight: 500;
	color: color(srgb 0.82 0.32 0.32 / 1);
`;

const Reason = styled.span`
	white-space: pre-wrap;
	word-break: break-word;
`;

interface BlockedReasonBannerProps {
	blocked: boolean;
	blockedReason?: string | null;
}

/**
 * Mostra el motiu del bloqueig (camp BlockedReason de Rally).
 * No renderitza res si l'item no està bloquejat o no té motiu informat.
 */
const BlockedReasonBanner: FC<BlockedReasonBannerProps> = ({ blocked, blockedReason }) => {
	const reason = blockedReason?.trim();
	if (!blocked || !reason) {
		return null;
	}

	return (
		<Banner>
			<Label>Blocked reason:</Label>
			<Reason>{reason}</Reason>
		</Banner>
	);
};

export default BlockedReasonBanner;
