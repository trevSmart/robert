import React from 'react';
import styled, { keyframes } from 'styled-components';
import { isLightTheme } from '../../utils/themeColors';

const softPulse = keyframes`
  0%   { opacity: 0.30; }
  50%  { opacity: 0.50; }
  100% { opacity: 0.30; }
`;

const Wrapper = styled.div<{ $visible: boolean; $light: boolean }>`
	position: fixed;
	bottom: 16px;
	right: 16px;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	padding: 3px;
	border-radius: 8px;
	background: ${props => (props.$light ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 18, 25, 0.35)')};
	backdrop-filter: blur(6px);
	box-shadow: ${props => (props.$light ? '0 2px 10px rgba(0, 0, 0, 0.12)' : '0 4px 12px rgba(0, 0, 0, 0.18)')};
	pointer-events: none;
	opacity: ${props => (props.$visible ? 1 : 0)};
	transform: translateY(${props => (props.$visible ? '0' : '2px')});
	transition:
		opacity 220ms ease,
		transform 220ms ease;
`;

const Logo = styled.img`
	width: 24px;
	height: 24px;
	object-fit: contain;
	animation: ${softPulse} 1.2s ease-in-out infinite;
`;

interface Props {
	rallyLogoUri: string;
	visible?: boolean;
}

export const RallyLoadingIndicator: React.FC<Props> = ({ rallyLogoUri, visible = false }) => (
	<Wrapper $visible={visible} $light={isLightTheme()}>
		<Logo src={rallyLogoUri} alt="Loading..." />
	</Wrapper>
);
