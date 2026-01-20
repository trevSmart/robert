import type React from 'react';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { aggregateHoursByAssignee } from '../../utils/chartUtils';
import { themeColors } from '../../utils/themeColors';

interface UserStory {
	assignee: string;
	taskEstimateTotal: number;
}

interface AssigneeHoursChartProps {
	userStories: UserStory[];
}

const AssigneeHoursChart: React.FC<AssigneeHoursChartProps> = ({ userStories }) => {
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<echarts.ECharts | null>(null);

	// Detect if theme is light or dark
	const isLightTheme = () => {
		const body = document.body;
		return body.classList.contains('vscode-light') || body.getAttribute('data-vscode-theme-kind') === 'light';
	};

	useEffect(() => {
		if (!chartRef.current) return;

		// Initialize chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}

		// Prepare data
		const data = aggregateHoursByAssignee(userStories);
		const totalHours = data.reduce((sum, item) => sum + item.value, 0);
		const lightTheme = isLightTheme();

		// Configure chart options
		const option: echarts.EChartsOption = {
			title: {
				text: `Hours by Assignee (${totalHours}h total)`,
				subtext: 'Horizontal Bar Chart',
				left: 'center',
				textStyle: {
					color: themeColors.foreground,
					fontSize: 16,
					fontWeight: 600
				},
				subtextStyle: {
					color: themeColors.descriptionForeground,
					fontSize: 12
				}
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				formatter: '{b}: {c}h',
				backgroundColor: themeColors.background,
				borderColor: themeColors.panelBorder,
				textStyle: {
					color: themeColors.foreground
				}
			},
			grid: {
				left: '3%',
				right: '4%',
				bottom: '3%',
				containLabel: true
			},
			xAxis: {
				type: 'value',
				name: 'Hours (h)',
				nameTextStyle: {
					color: themeColors.foreground
				},
				axisLabel: {
					color: themeColors.foreground,
					formatter: '{value}h'
				},
				axisLine: {
					lineStyle: {
						color: themeColors.panelBorder
					}
				},
				splitLine: {
					lineStyle: {
						color: lightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'
					}
				}
			},
			yAxis: {
				type: 'category',
				data: data.map(item => item.name),
				nameTextStyle: {
					color: themeColors.foreground
				},
				axisLabel: {
					color: lightTheme ? '#333333' : themeColors.foreground,
					interval: 0
				},
				axisLine: {
					lineStyle: {
						color: themeColors.panelBorder
					}
				},
				splitLine: {
					show: false
				}
			},
			series: [
				{
					name: 'Hours',
					type: 'bar',
					data: data.map((item, index) => ({
						value: item.value,
						itemStyle: {
							color: ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#F5DEB3', '#DDA0DD', '#98FB98'][index % 12],
							borderRadius: [0, 4, 4, 0]
						}
					})),
					emphasis: {
						itemStyle: {
							shadowBlur: 10,
							shadowOffsetX: 0,
							shadowColor: 'rgba(0, 0, 0, 0.5)'
						}
					},
					label: {
						show: true,
						position: 'right',
						color: themeColors.foreground,
						fontSize: 12,
						fontWeight: 500,
						formatter: '{c}h'
					}
				}
			]
		};

		chartInstanceRef.current.setOption(option);

		// Handle resize
		const handleResize = () => {
			chartInstanceRef.current?.resize();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, [userStories]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			chartInstanceRef.current?.dispose();
		};
	}, []);

	return (
		<div
			style={{
				margin: '20px 0',
				padding: '5px 10px 10px 10px',
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px'
			}}
		>
			<div ref={chartRef} style={{ width: '100%', height: '350px' }} />
		</div>
	);
};

export default AssigneeHoursChart;
