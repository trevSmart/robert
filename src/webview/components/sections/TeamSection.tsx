import { FC, useState } from 'react';
import Avatar from '../common/Avatar';
import TeamMemberDetail from './team/TeamMemberDetail';

export interface TeamMember {
	name: string;
	emailAddress?: string;
	progress: {
		completedHours: number;
		totalHours: number;
		percentage: number;
		source: string;
		userStoriesCount?: number;
	};
}

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

export interface TeamSectionProps {
	teamMembers: TeamMember[];
	teamMembersLoading: boolean;
	teamMembersError: string | null;
	selectedTeamIteration: string;
	onTeamIterationChange: (value: string) => void;
	iterations: Iteration[];
	currentIterationName: string | null;
	otherMembersLoading: boolean;
}

const TeamSection: FC<TeamSectionProps> = ({ teamMembers, teamMembersLoading, teamMembersError, selectedTeamIteration, onTeamIterationChange, iterations, currentIterationName, otherMembersLoading }) => {
	// Filter past iterations for dropdown
	const pastIterations = iterations
		.filter(it => {
			// Find current iteration by name to exclude it
			if (currentIterationName && it.name === currentIterationName) {
				return false;
			}
			const endDate = new Date(it.endDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			endDate.setHours(0, 0, 0, 0);
			return endDate < today;
		})
		.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
		.slice(0, 12);

	// State for team member detail view
	const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);

	const handleMemberClick = (member: TeamMember) => {
		setSelectedTeamMember(member);
	};

	const handleBackToTeam = () => {
		setSelectedTeamMember(null);
	};

	// Resolve the name of the currently selected sprint for the header
	const selectedSprintName = selectedTeamIteration === 'current' ? currentIterationName || 'Current Sprint' : iterations.find(it => it.objectId === selectedTeamIteration)?.name || currentIterationName || 'Current Sprint';

	// Split members into active and inactive
	const activeMembers = teamMembers.filter(m => {
		const hasStories = (m.progress as any).userStoriesCount > 0;
		const hasHours = m.progress.totalHours > 0;
		return hasStories || hasHours;
	});
	const inactiveMembers = teamMembers.filter(m => {
		const hasStories = (m.progress as any).userStoriesCount > 0;
		const hasHours = m.progress.totalHours > 0;
		return !hasStories && !hasHours;
	});

	// Show detail view if a team member is selected
	if (selectedTeamMember) {
		return <TeamMemberDetail member={selectedTeamMember} onBack={handleBackToTeam} />;
	}

	return (
		<div style={{ padding: '20px' }}>
			{/* Team Header */}
			<div style={{ marginBottom: '30px', textAlign: 'center' }}>
				<h2 style={{ margin: '0 0 8px 0', color: 'var(--vscode-foreground)', fontSize: '24px', fontWeight: '600' }}>Team Dashboard</h2>
				<p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>Monitor team activity, collaboration, and project progress</p>
			</div>

			{/* Loading Spinner */}
			{teamMembersLoading && (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '10px' }}>
					<div
						style={{
							border: '2px solid var(--vscode-panel-border)',
							borderTop: '2px solid var(--vscode-progressBar-background)',
							borderRadius: '50%',
							width: '24px',
							height: '24px',
							animation: 'spin 1s linear infinite'
						}}
					/>
					<p style={{ color: 'var(--vscode-descriptionForeground)' }}>Loading team data...</p>
				</div>
			)}

			{/* Team Content - only show when not loading */}
			{!teamMembersLoading && (
				<>
					<div style={{ marginBottom: '20px' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
							<h3 style={{ margin: 0, color: 'var(--vscode-foreground)', fontSize: '18px', fontWeight: '600' }}>Team Members</h3>
							<select
								value={selectedTeamIteration}
								onChange={e => onTeamIterationChange(e.target.value)}
								style={{
									padding: '4px 8px',
									borderRadius: '4px',
									backgroundColor: 'var(--vscode-dropdown-background)',
									color: 'var(--vscode-dropdown-foreground)',
									border: '1px solid var(--vscode-dropdown-border)',
									cursor: 'pointer',
									fontSize: '12px'
								}}
							>
								<option value="current">{currentIterationName || 'Current Sprint'} (current)</option>
								{pastIterations.map(it => (
									<option key={it.objectId} value={it.objectId}>
										{it.name}
									</option>
								))}
							</select>
						</div>

						{teamMembersError && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-errorForeground)' }}>{teamMembersError}</div>}

						{!teamMembersError && teamMembers.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>No team members found in the last 6 sprints</div>}

						{!teamMembersError && teamMembers.length > 0 && (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
								{/* Active Members Section */}
								{activeMembers.length > 0 && (
									<div>
										<h4
											style={{
												margin: '0 0 12px 0',
												color: 'var(--vscode-foreground)',
												fontSize: '13px',
												fontWeight: '600',
												textTransform: 'uppercase',
												letterSpacing: '0.5px',
												opacity: 0.7,
												textAlign: 'center'
											}}
										>
											Collaborating in {selectedSprintName}
										</h4>
										<div
											style={{
												display: 'grid',
												gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
												gap: '12px'
											}}
										>
											{activeMembers.map(member => {
												const percentage = member.progress.percentage;
												const progressColor = percentage >= 75 ? 'var(--vscode-charts-green, #4caf50)' : percentage >= 50 ? 'var(--vscode-charts-orange, #ff9800)' : percentage >= 25 ? 'var(--vscode-charts-yellow, #ffc107)' : 'var(--vscode-charts-red, #f44336)';

												return (
													<div
														key={member.name}
															onClick={() => handleMemberClick(member)}
														style={{
															backgroundColor: 'var(--vscode-editor-background)',
															border: '1px solid var(--vscode-panel-border)',
															borderRadius: '8px',
															padding: '12px',
															display: 'flex',
															flexDirection: 'column',
															alignItems: 'center',
															textAlign: 'center',
															cursor: 'pointer',
															transition: 'box-shadow 0.2s ease'
														}}
														onMouseEnter={e => {
															e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
														}}
														onMouseLeave={e => {
															e.currentTarget.style.boxShadow = 'none';
														}}
													>
														{/* Avatar with Progress Ring */}
														<Avatar name={member.name} size={40} showRing={true} ringProgress={percentage} ringColor={progressColor} />

														{/* Member Info */}
														<div style={{ width: '100%', minWidth: 0 }}>
															<div style={{ marginBottom: '6px', marginTop: '8px' }}>
																<h4 style={{ margin: '0 0 2px 0', color: 'var(--vscode-foreground)', fontSize: '13px', fontWeight: '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</h4>
																<div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>{percentage}% complete</div>
																<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>
																	{member.progress.completedHours}h / {member.progress.totalHours}h
																</div>
															</div>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								)}

								{/* Inactive Members Section */}
								{(inactiveMembers.length > 0 || otherMembersLoading) && (
									<div>
										<h4
											style={{
												margin: '0 0 12px 0',
												color: 'var(--vscode-foreground)',
												fontSize: '13px',
												fontWeight: '600',
												textTransform: 'uppercase',
												letterSpacing: '0.5px',
												opacity: 0.7,
												textAlign: 'center'
											}}
										>
											Other Team Members
										</h4>
										{inactiveMembers.length === 0 && otherMembersLoading ? (
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', color: 'var(--vscode-descriptionForeground)' }}>
												<div
													style={{
														border: '2px solid var(--vscode-panel-border)',
														borderTop: '2px solid var(--vscode-progressBar-background)',
														borderRadius: '50%',
														width: '14px',
														height: '14px',
														animation: 'spin 1s linear infinite'
													}}
												/>
												<span style={{ fontSize: '12px' }}>Loading other team members…</span>
											</div>
										) : (
											<div
												style={{
													display: 'grid',
													gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
													gap: '12px'
												}}
											>
												{inactiveMembers.map(member => {
													return (
														<div
															key={member.name}
														onClick={() => handleMemberClick(member)}
															style={{
																backgroundColor: 'var(--vscode-editor-background)',
																border: '1px solid var(--vscode-panel-border)',
																borderRadius: '8px',
																padding: '12px',
																display: 'flex',
																flexDirection: 'column',
																alignItems: 'center',
																textAlign: 'center',
																cursor: 'pointer',
																transition: 'box-shadow 0.2s ease'
															}}
															onMouseEnter={e => {
																e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
															}}
															onMouseLeave={e => {
																e.currentTarget.style.boxShadow = 'none';
															}}
														>
															{/* Avatar without Progress Ring */}
															<Avatar name={member.name} size={36} />

															{/* Member Info */}
															<div style={{ width: '100%', minWidth: 0 }}>
																<div style={{ marginBottom: '6px', marginTop: '8px' }}>
																	<h4 style={{ margin: '0', color: 'var(--vscode-foreground)', fontSize: '12px', fontWeight: '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</h4>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default TeamSection;
