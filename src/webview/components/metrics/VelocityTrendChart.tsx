import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { disposeChart, initChart, setChartOption } from '../../utils/echartsHelpers';
import { isLightTheme } from '../../utils/themeColors';
import type { VelocityData } from '../../utils/metricsUtils';

interface VelocityTrendChartProps {
	data: VelocityData[];
	loading?: boolean;
}

const VelocityTrendChart: React.FC<VelocityTrendChartProps> = ({ data, loading = false }) => {
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<echarts.ECharts | null>(null);

	// Signatura estable del contingut: només canvia quan les dades canvien de veritat,
	// no quan arriba una nova referència d'array amb el mateix contingut. Evita repintar
	// (i re-animar) el gràfic quan les mètriques es refresquen amb dades equivalents.
	const dataSignature = useMemo(() => data.map(d => `${d.sprintName}|${d.points}`).join(';'), [data]);

	// Crear la instància del gràfic una sola vegada (al muntar) i destruir-la al desmuntar.
	// Així les actualitzacions posteriors fan una transició suau en lloc de re-animar de zero.
	useEffect(() => {
		if (!chartRef.current) return;
		const chart = initChart(chartRef.current);
		chartInstanceRef.current = chart;

		const handleResize = () => chart.resize();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			disposeChart(chart);
			chartInstanceRef.current = null;
		};
	}, []);

	useEffect(() => {
		const chart = chartInstanceRef.current;
		if (!chart || loading || data.length === 0) return;

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
				subtext: 'Last 12 Sprints',
				left: 'center',
				textStyle: {
					color: lightTheme ? '#333' : '#ccc',
					fontSize: 16,
					fontWeight: '500'
				},
				subtextStyle: {
					color: lightTheme ? '#666' : '#999',
					fontSize: 12
				}
			},
			tooltip: {
				trigger: 'axis',
				enterable: false,
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
						result += `${param.marker} ${param.seriesName}: ${param.value} h<br/>`;
					});
					return result;
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
				name: 'Hours',
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
					name: 'Hours',
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

		setChartOption(chart, option, { notMerge: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataSignature, loading]);

	// El contenidor del gràfic es manté SEMPRE muntat perquè la instància d'ECharts es crea
	// una sola vegada. Els estats de loading / sense dades es mostren com a overlay a sobre,
	// no com a JSX alternatiu (que desmuntaria el chart i en provocaria la re-creació + re-animació).
	const overlayMessage = loading ? 'Loading velocity data...' : data.length === 0 ? 'No velocity data available' : null;

	return (
		<div
			style={{
				position: 'relative',
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				borderRadius: '12px',
				padding: '20px',
				marginBottom: '20px'
			}}
		>
			<div ref={chartRef} style={{ width: '100%', height: '300px' }} />
			{overlayMessage && (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						backgroundColor: 'var(--vscode-editor-background)',
						borderRadius: '12px',
						color: 'var(--vscode-descriptionForeground)'
					}}
				>
					{overlayMessage}
				</div>
			)}
		</div>
	);
};

export default VelocityTrendChart;
