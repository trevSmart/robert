import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { disposeChart, initChart, setChartOption } from '../../utils/echartsHelpers';
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

	// Signatura estable del contingut: només canvia quan les dades canvien de veritat,
	// no quan arriba una nova referència d'array amb el mateix contingut. Evita repintar
	// (i re-animar) el gràfic quan les mètriques es refresquen amb dades equivalents.
	const dataSignature = useMemo(() => {
		const stateSig = data.map(d => `${d.state}|${d.count}|${d.percentage}`).join(';');
		const blockedSig = blockedData.map(d => `${d.status}|${d.count}|${d.percentage}`).join(';');
		return `${sprintName}#${stateSig}#${blockedSig}`;
	}, [data, blockedData, sprintName]);

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
				top: 0,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc',
					fontSize: 14,
					fontWeight: '600'
				},
				subtextStyle: {
					color: lightTheme ? '#666' : '#999',
					fontSize: 11
				}
			},
			tooltip: {
				trigger: 'item',
				enterable: false,
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
				bottom: 10,
				type: 'scroll',
				icon: 'circle',
				itemWidth: 10,
				itemHeight: 10,
				textStyle: {
					color: lightTheme ? '#333' : '#ccc',
					fontSize: 11
				},
				// Treure el sufix "(X%)" només dels ítems de la llegenda (les etiquetes
				// del donut i el tooltip segueixen mostrant el percentatge).
				formatter: (name: string) => name.replace(/\s*\(\d+%\)\s*$/, ''),
				data: [...blockedChartData.map(d => d.name), ...chartData.map(d => d.name)]
			},
			series: [
				...(blockedData.length > 0
					? [
							{
								name: 'Blocked Status',
								type: 'pie',
								radius: ['20%', '25%'],
								avoidLabelOverlap: false,
								center: ['50%', '45%'],
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
					radius: ['25%', '38%'],
					avoidLabelOverlap: false,
					center: ['50%', '45%'],
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

		setChartOption(chart, option, { notMerge: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dataSignature, loading]);

	// El contenidor del gràfic es manté SEMPRE muntat perquè la instància d'ECharts es crea
	// una sola vegada. Els estats de loading / sense dades es mostren com a overlay a sobre,
	// no com a JSX alternatiu (que desmuntaria el chart i en provocaria la re-creació + re-animació).
	const overlayMessage = loading ? 'Loading state distribution...' : data.length === 0 ? 'No state data available' : null;

	return (
		<div
			style={{
				position: 'relative',
				backgroundColor: 'var(--vscode-editor-background)',
				border: '1px solid var(--vscode-panel-border)',
				borderRadius: '12px',
				padding: '12px'
			}}
		>
			{showSelector && (
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
			<div ref={chartRef} style={{ width: '100%', height: '280px' }} />
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

export default StateDistributionPie;
