import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { isLightTheme } from '../../utils/themeColors';
import type { StateDistribution } from '../../utils/metricsUtils';

interface StateDistributionPieProps {
	data: StateDistribution[];
	loading?: boolean;
}

const StateDistributionPie: React.FC<StateDistributionPieProps> = ({ data, loading = false }) => {
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

		// Colors per cada estat
		const stateColors: Record<string, string> = {
			Defined: '#9e9e9e',
			'In-Progress': '#2196f3',
			Completed: '#4caf50',
			Accepted: '#66bb6a',
			Unknown: '#757575'
		};

		// Preparar dades per echarts
		const chartData = data.map(item => ({
			value: item.count,
			name: `${item.state} (${item.percentage}%)`,
			itemStyle: {
				color: stateColors[item.state] || '#9e9e9e'
			}
		}));

		const option: echarts.EChartsOption = {
			title: {
				text: 'State Distribution',
				subtext: 'Current Backlog',
				left: 'center',
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
				bottom: 10,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc'
				}
			},
			series: [
				{
					name: 'State',
					type: 'pie',
					radius: ['40%', '70%'], // Donut chart
					avoidLabelOverlap: false,
					center: ['50%', '50%'],
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
	}, [data, loading]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (chartInstanceRef.current) {
				chartInstanceRef.current.dispose();
				chartInstanceRef.current = null;
			}
		};
	}, []);

	if (loading) {
		return (
			<div
				style={{
					backgroundColor: 'var(--vscode-editor-background)',
					border: '1px solid var(--vscode-panel-border)',
					borderRadius: '12px',
					padding: '20px',
					height: '350px',
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
					height: '350px',
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
			<div ref={chartRef} style={{ width: '100%', height: '350px' }} />
		</div>
	);
};

export default StateDistributionPie;
