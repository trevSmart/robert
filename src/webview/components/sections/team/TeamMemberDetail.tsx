import type { FC } from 'react';
import Avatar from '../../common/Avatar';
import ScreenHeader from '../../common/ScreenHeader';
import type { TeamMember } from '../TeamSection';

interface TeamMemberDetailProps {
  member: TeamMember;
  onBack: () => void;
}

const TeamMemberDetail: FC<TeamMemberDetailProps> = ({ member, onBack }) => {
  const percentage = member.progress.percentage;
  const progressColor =
    percentage >= 75
      ? 'var(--vscode-charts-green, #4caf50)'
      : percentage >= 50
        ? 'var(--vscode-charts-orange, #ff9800)'
        : percentage >= 25
          ? 'var(--vscode-charts-yellow, #ffc107)'
          : 'var(--vscode-charts-red, #f44336)';

  const hasActivity = member.progress.totalHours > 0 || (member.progress.userStoriesCount ?? 0) > 0;

  return (
    <div style={{ padding: '0 20px' }}>
      <ScreenHeader title={member.name} showBackButton={true} onBack={onBack} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          paddingTop: '20px'
        }}
      >
        {/* Avatar gran amb progrés */}
        <Avatar
          name={member.name}
          size={72}
          showRing={hasActivity}
          ringProgress={percentage}
          ringColor={progressColor}
        />

        {/* Nom */}
        <h2
          style={{
            margin: 0,
            color: 'var(--vscode-foreground)',
            fontSize: '20px',
            fontWeight: '600'
          }}
        >
          {member.name}
        </h2>

        {/* Stats cards */}
        {hasActivity && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '480px'
            }}
          >
            {/* % completat */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: progressColor
                }}
              >
                {percentage}%
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Completed
              </div>
            </div>

            {/* Hores completades */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--vscode-foreground)'
                }}
              >
                {member.progress.completedHours}h
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Done
              </div>
            </div>

            {/* Hores totals */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--vscode-foreground)'
                }}
              >
                {member.progress.totalHours}h
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Total
              </div>
            </div>
          </div>
        )}

        {/* User stories count (si disponible) */}
        {hasActivity && (member.progress.userStoriesCount ?? 0) > 0 && (
          <div
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '8px',
              padding: '12px 24px',
              textAlign: 'center'
            }}
          >
            <span style={{ color: 'var(--vscode-foreground)', fontSize: '14px' }}>
              <strong>{member.progress.userStoriesCount}</strong>
              {' '}user {member.progress.userStoriesCount === 1 ? 'story' : 'stories'} this sprint
            </span>
          </div>
        )}

        {/* Sense activitat */}
        {!hasActivity && (
          <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>
            No activity recorded for this sprint.
          </p>
        )}
      </div>
    </div>
  );
};

export default TeamMemberDetail;
