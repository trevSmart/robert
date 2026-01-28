import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { isLightTheme } from '../../utils/themeColors';
import type { DefectsBySeverity } from '../../utils/metricsUtils';

interface DefectSeverityChartProps {
	data: DefectsBySeverity[];
	loading?: boolean;
}

const DefectSeverityChart: React.FC<DefectSeverityChartProps> = ({ data, loading = false }) => {
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

		// Extreure sprints únics
		const sprints = [...new Set(data.map(d => d.sprint))];

		// Agrupar dades per severitat i estat
		const severities = ['Critical', 'Major', 'Minor', 'Cosmetic'];
		const seriesData: Record<string, number[]> = {
			'Critical-Open': [],
			'Critical-Closed': [],
			'Major-Open': [],
			'Major-Closed': [],
			'Minor-Open': [],
			'Minor-Closed': [],
			'Cosmetic-Open': [],
			'Cosmetic-Closed': []
		};

		// Omplir dades per cada sprint
		sprints.forEach(sprint => {
			severities.forEach(severity => {
				const openCount = data.find(d => d.sprint === sprint && d.severity === severity)?.open || 0;
				const closedCount = data.find(d => d.sprint === sprint && d.severity === severity)?.closed || 0;

				seriesData[`${severity}-Open`].push(openCount);
				seriesData[`${severity}-Closed`].push(closedCount);
			});
		});

		// Colors per severitat
		const severityColors: Record<string, { open: string; closed: string }> = {
			Critical: { open: '#d32f2f', closed: '#ffcdd2' },
			Major: { open: '#f57c00', closed: '#ffe0b2' },
			Minor: { open: '#fbc02d', closed: '#fff9c4' },
			Cosmetic: { open: '#7e57c2', closed: '#d1c4e9' }
		};

		// Crear sèries
		const series: any[] = [];
		severities.forEach(severity => {
			// Open defects
			series.push({
				name: `${severity} (Open)`,
				type: 'bar',
				stack: 'total',
				data: seriesData[`${severity}-Open`],
				itemStyle: {
					color: severityColors[severity].open
				},
				emphasis: {
					focus: 'series'
				}
			});

			// Closed defects
			series.push({
				name: `${severity} (Closed)`,
				type: 'bar',
				stack: 'total',
				data: seriesData[`${severity}-Closed`],
				itemStyle: {
					color: severityColors[severity].closed,
					opacity: 0.6
				},
				emphasis: {
					focus: 'series'
				}
			});
		});

		const option: echarts.EChartsOption = {
			title: {
				text: 'Defects trend',
				subtext: 'Last 6 Sprints',
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
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				backgroundColor: lightTheme ? 'rgba(255, 255, 255, 0.9)' : 'rgba(50, 50, 50, 0.9)',
				borderColor: lightTheme ? '#ccc' : '#555',
				borderWidth: 1,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc'
				},
				formatter: (params: any) => {
					if (!Array.isArray(params)) return '';
					let result = `<strong>${params[0].axisValue}</strong><br/>`;
					params.forEach((param: any) => {
						if (param.value > 0) {
							result += `${param.marker} ${param.seriesName}: ${param.value}<br/>`;
						}
					});
					return result;
				}
			},
			legend: {
				bottom: 10,
				type: 'scroll',
				textStyle: {
					color: lightTheme ? '#333' : '#ccc',
					fontSize: 11
				}
			},
			grid: {
				left: '3%',
				right: '4%',
				top: '15%',
				bottom: '20%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: sprints,
				axisLine: {
					lineStyle: {
						color: lightTheme ? '#ddd' : '#444'
					}
				},
				axisLabel: {
					color: lightTheme ? '#666' : '#999'
				}
			},
			yAxis: {
				type: 'value',
				name: 'Defects',
				min: 0,
				max: (value: any) => {
					// Assegurar mínim de 5 unitats i reescalar si n'hi ha més
					return Math.max(5, Math.ceil(value.max / 5) * 5);
				},
				nameTextStyle: {
					color: lightTheme ? '#666' : '#999'
				},
				axisLine: {
					lineStyle: {
						color: lightTheme ? '#ddd' : '#444'
					}
				},
				axisLabel: {
					color: lightTheme ? '#666' : '#999'
				},
				splitLine: {
					lineStyle: {
						color: lightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
					}
				}
			},
			series: series
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
				Loading defects data...
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
				No defects data available
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

export default DefectSeverityChart;
