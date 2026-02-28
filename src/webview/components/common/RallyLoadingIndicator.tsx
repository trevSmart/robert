import React from 'react';
import styled, { keyframes } from 'styled-components';

const softPulse = keyframes`
  0%   { opacity: 0.55; }
  50%  { opacity: 0.95; }
  100% { opacity: 0.55; }
`;

const Wrapper = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 6px;
  border-radius: 8px;
  background: rgba(15, 18, 25, 0.35);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  opacity: ${props => (props.$visible ? 1 : 0)};
  transform: translateY(${props => (props.$visible ? '0' : '2px')});
  transition: opacity 220ms ease, transform 220ms ease;
`;

const Logo = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  animation: ${softPulse} 1.2s ease-in-out infinite;
`;

interface Props {
  rallyLogoUri: string;
  visible?: boolean;
}

export const RallyLoadingIndicator: React.FC<Props> = ({ rallyLogoUri, visible = false }) => (
  <Wrapper $visible={visible}>
    <Logo src={rallyLogoUri} alt="Loading..." />
  </Wrapper>
);
