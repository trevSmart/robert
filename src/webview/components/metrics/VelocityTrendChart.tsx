import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { isLightTheme } from '../../utils/themeColors';
import type { VelocityData } from '../../utils/metricsUtils';

interface VelocityTrendChartProps {
	data: VelocityData[];
	loading?: boolean;
}

const VelocityTrendChart: React.FC<VelocityTrendChartProps> = ({ data, loading = false }) => {
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

		// Preparar dades
		const sprintNames = data.map(d => d.sprintName);
		const points = data.map(d => d.points);

		// Calcular mitjana mòbil (simple moving average)
		const movingAvg: number[] = [];
		const windowSize = Math.min(3, data.length); // Finestra de 3 sprints o menys
		for (let i = 0; i < points.length; i++) {
			const start = Math.max(0, i - windowSize + 1);
			const window = points.slice(start, i + 1);
			const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
			movingAvg.push(Math.round(avg));
		}

		const option: echarts.EChartsOption = {
			title: {
				text: 'Velocity Trend',
				subtext: 'Last 12 Months',
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
					type: 'cross',
					crossStyle: {
						color: '#999'
					}
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
						result += `${param.marker} ${param.seriesName}: ${param.value} pts<br/>`;
					});
					return result;
				}
			},
			legend: {
				data: ['Story Points', 'Moving Average'],
				bottom: 10,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc'
				}
			},
			grid: {
				left: '3%',
				right: '4%',
				top: '15%',
				bottom: '15%',
				containLabel: true
			},
			xAxis: {
				type: 'category',
				data: sprintNames,
				axisLine: {
					lineStyle: {
						color: lightTheme ? '#ddd' : '#444'
					}
				},
				axisLabel: {
					color: lightTheme ? '#666' : '#999',
					rotate: 0
				}
			},
			yAxis: {
				type: 'value',
				name: 'Story Points',
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
			series: [
				{
					name: 'Story Points',
					type: 'bar',
					data: points,
					itemStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: '#6b7a9a' },
							{ offset: 1, color: '#7a6b9a' }
						])
					},
					emphasis: {
						itemStyle: {
							shadowBlur: 10,
							shadowOffsetX: 0,
							shadowColor: 'rgba(0, 0, 0, 0.5)'
						}
					}
				},
				{
					name: 'Moving Average',
					type: 'line',
					data: movingAvg,
					smooth: true,
					lineStyle: {
						color: '#ffa726',
						width: 2
					},
					itemStyle: {
						color: '#ffa726'
					},
					symbol: 'circle',
					symbolSize: 6
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
					height: '300px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--vscode-descriptionForeground)'
				}}
			>
				Loading velocity data...
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
					height: '300px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--vscode-descriptionForeground)'
				}}
			>
				No velocity data available
			</div>
		);
	}

	return (
		<div
			style={{
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				borderRadius: '12px',
				padding: '20px',
				marginBottom: '20px'
			}}
		>
			<div ref={chartRef} style={{ width: '100%', height: '300px' }} />
		</div>
	);
};

export default VelocityTrendChart;
