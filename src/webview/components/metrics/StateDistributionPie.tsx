import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { isLightTheme } from '../../utils/themeColors';
import type { StateDistribution, BlockedDistribution } from '../../utils/metricsUtils';

interface IterationOption {
	objectId: string;
	name: string;
	startDate: string;
}

interface StateDistributionPieProps {
	data: StateDistribution[];
	blockedData?: BlockedDistribution[];
	sprintName?: string;
	loading?: boolean;
	selectedSprint?: string;
	onSprintChange?: (sprint: string) => void;
	iterations?: IterationOption[];
	showSelector?: boolean;
}

const StateDistributionPie: React.FC<StateDistributionPieProps> = ({ data, blockedData = [], sprintName = 'Next Sprint', loading = false, selectedSprint = 'next', onSprintChange, iterations = [], showSelector = false }) => {
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<echarts.ECharts | null>(null);

	useEffect(() => {
		if (!chartRef.current || loading || data.length === 0) return;

		// Initialize chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}

		const chart = chartInstanceRef.current;
		const lightTheme = isLightTheme();

		// Colors per cada estat - Versió Viva
		const stateColors: Record<string, string> = {
			Defined: '#ff8c00', // Taronja viu
			'In-Progress': '#ffd700', // Groc viu
			Completed: '#0d8bf9', // Blau viu
			Accepted: '#20c997', // Verd viu
			Unknown: '#6c757d' // Gris
		};

		// Colors per blocked status - Versió Viva
		const blockedColors: Record<string, string> = {
			Blocked: '#e74c3c', // Roig viu
			'Not Blocked': '#27ae60' // Verd viu
		};

		// Preparar dades per echarts
		const chartData = data.map(item => ({
			value: item.count,
			name: `${item.state} (${item.percentage}%)`,
			itemStyle: {
				color: stateColors[item.state] || '#9e9e9e'
			}
		}));

		// Preparar dades blocked/not blocked per echarts
		const blockedChartData = blockedData.map(item => ({
			value: item.count,
			name: `${item.status} (${item.percentage}%)`,
			itemStyle: {
				color: blockedColors[item.status] || '#999'
			}
		}));

		const option: echarts.EChartsOption = {
			title: {
				text: `${sprintName} Readiness`,
				subtext: sprintName,
				left: 'center',
				top: 10,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc',
					fontSize: 16,
					fontWeight: '600'
				},
				subtextStyle: {
					color: lightTheme ? '#666' : '#999',
					fontSize: 12
				}
			},
			tooltip: {
				trigger: 'item',
				backgroundColor: lightTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(50, 50, 50, 0.9)',
				borderColor: lightTheme ? '#ccc' : '#555',
				borderWidth: 1,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc'
				},
				formatter: (params: any) => {
					return `${params.marker} <strong>${params.name}</strong><br/>Stories: ${params.value}`;
				}
			},
			legend: {
				orient: 'horizontal',
				bottom: 5,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc'
				},
				data: [...data.map(d => d.state), ...(blockedData.length > 0 ? blockedData.map(d => d.status) : [])]
			},
			series: [
				...(blockedData.length > 0
					? [
							{
								name: 'Blocked Status',
								type: 'pie',
								radius: ['20%', '25%'],
								avoidLabelOverlap: false,
								center: ['50%', '55%'],
								label: {
									show: false
								},
								emphasis: {
									label: {
										show: true,
										fontSize: 12,
										fontWeight: 'bold'
									},
									itemStyle: {
										shadowBlur: 10,
										shadowOffsetX: 0,
										shadowColor: 'rgba(0, 0, 0, 0.5)'
									}
								},
								labelLine: {
									show: false
								},
								itemStyle: {
									borderColor: lightTheme ? '#fff' : '#1e1e1e',
									borderWidth: 2
								},
								data: blockedChartData
							}
						]
					: []),
				{
					name: 'State',
					type: 'pie',
					radius: ['28%', '42%'],
					avoidLabelOverlap: false,
					center: ['50%', '55%'],
					label: {
						show: true,
						position: 'outside',
						formatter: '{b}',
						color: lightTheme ? '#333' : '#ccc'
					},
					emphasis: {
						label: {
							show: true,
							fontSize: 14,
							fontWeight: 'bold'
						},
						itemStyle: {
							shadowBlur: 10,
							shadowOffsetX: 0,
							shadowColor: 'rgba(0, 0, 0, 0.5)'
						}
					},
					labelLine: {
						show: true,
						lineStyle: {
							color: lightTheme ? '#999' : '#666'
						}
					},
					itemStyle: {
						borderColor: lightTheme ? '#fff' : '#1e1e1e',
						borderWidth: 2
					},
					data: chartData
				}
			]
		};

		chart.setOption(option);

		// Handle resize
		const handleResize = () => {
			chart.resize();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, [data, blockedData, sprintName, loading]);

	// Cleanup when data becomes empty or on unmount
	useEffect(() => {
		if (data.length === 0 || loading) {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.dispose();
				chartInstanceRef.current = null;
			}
		}

		return () => {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.dispose();
				chartInstanceRef.current = null;
			}
		};
	}, [data.length, loading]);

	if (loading) {
		return (
			<div
				style={{
					backgroundColor: 'var(--vscode-editor-background)',
					border: '1px solid var(--vscode-panel-border)',
					borderRadius: '12px',
					padding: '20px',
					height: '400px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--vscode-descriptionForeground)'
				}}
			>
				Loading state distribution...
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div
				style={{
					backgroundColor: 'var(--vscode-editor-background)',
					border: '1px solid var(--vscode-panel-border)',
					borderRadius: '12px',
					padding: '20px',
					height: '400px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--vscode-descriptionForeground)'
				}}
			>
				No state data available
			</div>
		);
	}

	return (
		<div
			style={{
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				borderRadius: '12px',
				padding: '20px'
			}}
		>
			{showSelector && (
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
					<h3 style={{ margin: 0, color: 'var(--vscode-foreground)', fontSize: '18px', fontWeight: '600' }}>Next Sprint Readiness</h3>
					<select
						value={selectedSprint}
						onChange={e => onSprintChange?.(e.target.value)}
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
						<option value="next">Next Sprint</option>
						{iterations.map(it => (
							<option key={it.objectId} value={it.name}>
								{it.name}
							</option>
						))}
					</select>
				</div>
			)}
			<div ref={chartRef} style={{ width: '100%', height: '550px' }} />
		</div>
	);
};

export default StateDistributionPie;
