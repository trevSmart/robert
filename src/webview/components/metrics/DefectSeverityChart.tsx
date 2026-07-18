import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { disposeChart, initChart, setChartOption } from '../../utils/echartsHelpers';
import { isLightTheme } from '../../utils/themeColors';
import type { DefectsBySeverity } from '../../utils/metricsUtils';

interface DefectSeverityChartProps {
	data: DefectsBySeverity[];
	loading?: boolean;
}

const DefectSeverityChart: React.FC<DefectSeverityChartProps> = ({ data, loading = false }) => {
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<echarts.ECharts | null>(null);

	// Signatura estable del contingut: només canvia quan les dades canvien de veritat,
	// no quan arriba una nova referència d'array amb el mateix contingut. Evita repintar
	// (i re-animar) el gràfic quan iterations/defects es refresquen amb dades equivalents.
	const dataSignature = useMemo(() => data.map(d => `${d.sprint}|${d.severity}|${d.open}|${d.closed}`).join(';'), [data]);

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

		// Extreure sprints únics
		const sprints = [...new Set(data.map(d => d.sprint))];

		// Agrupar dades per severitat
		const severities = ['Unset', 'Cosmetic', 'Minor', 'Major', 'Critical'];
		const seriesData: Record<string, number[]> = {
			Critical: [],
			Major: [],
			Minor: [],
			Cosmetic: [],
			Unset: []
		};

		// Omplir dades per cada sprint
		sprints.forEach(sprint => {
			severities.forEach(severity => {
				const openCount = data.find(d => d.sprint === sprint && d.severity === severity)?.open || 0;
				const closedCount = data.find(d => d.sprint === sprint && d.severity === severity)?.closed || 0;
				const totalCount = openCount + closedCount;

				seriesData[`${severity}`].push(totalCount);
			});
		});

		// Colors per severitat (tons suaus, mantenint la jerarquia semàntica)
		const severityColors: Record<string, string> = {
			Critical: '#e07a7a',
			Major: '#e8b07a',
			Minor: '#e6d07a',
			Cosmetic: '#a99bd1',
			Unset: '#a8b4bd'
		};

		// Crear sèries
		const series: any[] = [];
		severities.forEach(severity => {
			series.push({
				name: `${severity}`,
				type: 'bar',
				stack: 'total',
				data: seriesData[`${severity}`],
				itemStyle: {
					color: severityColors[severity]
				},
				emphasis: {
					focus: 'series'
				}
			});
		});

		const option: echarts.EChartsOption = {
			title: {
				text: 'Defects trend',
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
				icon: 'circle',
				itemWidth: 10,
				itemHeight: 10,
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

		setChartOption(chart, option, { notMerge: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataSignature, loading]);

	// El contenidor del gràfic es manté SEMPRE muntat perquè la instància d'ECharts es crea
	// una sola vegada. Els estats de loading / sense dades es mostren com a overlay a sobre,
	// no com a JSX alternatiu (que desmuntaria el chart i en provocaria la re-creació + re-animació).
	const overlayMessage = loading ? 'Loading defects data...' : data.length === 0 ? 'No defects data available' : null;

	return (
		<div
			style={{
				position: 'relative',
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				borderRadius: '12px',
				padding: '20px'
			}}
		>
			<div ref={chartRef} style={{ width: '100%', height: '350px' }} />
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

export default DefectSeverityChart;
