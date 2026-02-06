import { FC } from 'react';

export interface TeamMember {
	name: string;
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
}

const TeamSection: FC<TeamSectionProps> = ({ teamMembers, teamMembersLoading, teamMembersError, selectedTeamIteration, onTeamIterationChange, iterations, currentIterationName }) => {
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

	return (
		<div style={{ padding: '20px' }}>
			{/* Team Header */}
			<div style={{ marginBottom: '30px', textAlign: 'center' }}>
				<h2 style={{ margin: '0 0 8px 0', color: 'var(--vscode-foreground)', fontSize: '24px', fontWeight: '600' }}>Team Dashboard</h2>
				<p style={{ margin: 0, color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>Monitor team activity, collaboration, and project progress</p>
			</div>

			{/* Loading Spinner */}
			{teamMembersLoading && (
				<div style={{ textAlign: 'center', padding: '40px 20px' }}>
					<div
						style={{
							border: '2px solid var(--vscode-panel-border)',
							borderTop: '2px solid var(--vscode-progressBar-background)',
							borderRadius: '50%',
							width: '24px',
							height: '24px',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 16px'
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
												opacity: 0.7
											}}
										>
											Active in Sprint
										</h4>
										<div
											style={{
												display: 'grid',
												gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
												gap: '12px'
											}}
										>
											{activeMembers.map(member => {
												const initials = member.name
													.split(' ')
													.map(part => part.charAt(0).toUpperCase())
													.join('')
													.slice(0, 2);

												const percentage = member.progress.percentage;
												const progressColor = percentage >= 75 ? 'var(--vscode-charts-green, #4caf50)' : percentage >= 50 ? 'var(--vscode-charts-orange, #ff9800)' : percentage >= 25 ? 'var(--vscode-charts-yellow, #ffc107)' : 'var(--vscode-charts-red, #f44336)';

												return (
													<div
														key={member.name}
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
															transition: 'transform 0.2s ease, box-shadow 0.2s ease'
														}}
														onMouseEnter={e => {
															e.currentTarget.style.transform = 'translateY(-2px)';
															e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
														}}
														onMouseLeave={e => {
															e.currentTarget.style.transform = 'translateY(0)';
															e.currentTarget.style.boxShadow = 'none';
														}}
													>
														{/* Avatar with Progress Ring */}
														<div role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${member.progress.completedHours}h / ${member.progress.totalHours}h (${percentage}%)`} style={{ position: 'relative' }}>
															<svg
																width="64"
																height="64"
																style={{
																	position: 'absolute',
																	top: '-8px',
																	left: '-8px',
																	transform: 'rotate(-90deg)'
																}}
															>
																<circle cx="32" cy="32" r="28" stroke="var(--vscode-widget-border)" strokeWidth="3" fill="none" />
																<circle
																	cx="32"
																	cy="32"
																	r="28"
																	stroke={progressColor}
																	strokeWidth="3"
																	fill="none"
																	strokeDasharray={2 * Math.PI * 28}
																	strokeDashoffset={2 * Math.PI * 28 * (1 - percentage / 100)}
																	strokeLinecap="round"
																	style={{
																		transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease'
																	}}
																/>
															</svg>
															<div
																style={{
																	width: '48px',
																	height: '48px',
																	borderRadius: '50%',
																	background: 'linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)',
																	display: 'flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																	color: 'white',
																	fontWeight: 'bold',
																	fontSize: '16px',
																	marginBottom: '6px'
																}}
															>
																{initials}
															</div>
														</div>

														{/* Member Info */}
														<div style={{ width: '100%' }}>
															<div style={{ marginBottom: '6px' }}>
																<h4 style={{ margin: '0 0 2px 0', color: 'var(--vscode-foreground)', fontSize: '14px', fontWeight: '400' }}>{member.name}</h4>
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
								{inactiveMembers.length > 0 && (
									<div>
										<h4
											style={{
												margin: '0 0 12px 0',
												color: 'var(--vscode-foreground)',
												fontSize: '13px',
												fontWeight: '600',
												textTransform: 'uppercase',
												letterSpacing: '0.5px',
												opacity: 0.7
											}}
										>
											Other Team Members
										</h4>
										<div
											style={{
												display: 'grid',
												gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
												gap: '12px'
											}}
										>
											{inactiveMembers.map(member => {
												const initials = member.name
													.split(' ')
													.map(part => part.charAt(0).toUpperCase())
													.join('')
													.slice(0, 2);

												return (
													<div
														key={member.name}
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
															transition: 'transform 0.2s ease, box-shadow 0.2s ease'
														}}
														onMouseEnter={e => {
															e.currentTarget.style.transform = 'translateY(-2px)';
															e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
														}}
														onMouseLeave={e => {
															e.currentTarget.style.transform = 'translateY(0)';
															e.currentTarget.style.boxShadow = 'none';
														}}
													>
														{/* Avatar without Progress Ring */}
														<div style={{ position: 'relative' }}>
															<svg
																width="48"
																height="48"
																style={{
																	position: 'absolute',
																	top: '-6px',
																	left: '-6px'
																}}
															>
																<circle cx="24" cy="24" r="21" stroke="var(--vscode-widget-border)" strokeWidth="3" fill="none" />
															</svg>
															<div
																style={{
																	width: '36px',
																	height: '36px',
																	borderRadius: '50%',
																	background: 'linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)',
																	display: 'flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																	color: 'white',
																	fontWeight: 'bold',
																	fontSize: '12px',
																	marginBottom: '6px'
																}}
															>
																{initials}
															</div>
														</div>

														{/* Member Info */}
														<div style={{ width: '100%' }}>
															<div style={{ marginBottom: '6px' }}>
																<h4 style={{ margin: '0', color: 'var(--vscode-foreground)', fontSize: '12px', fontWeight: '400' }}>{member.name}</h4>
															</div>
														</div>
													</div>
												);
											})}
										</div>
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
