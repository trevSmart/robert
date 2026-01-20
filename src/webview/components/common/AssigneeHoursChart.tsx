import type React from 'react';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { aggregateHoursByAssignee } from '../../utils/chartUtils';

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

	useEffect(() => {
		if (!chartRef.current) return;

		// Initialize chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}

		// Prepare data
		const data = aggregateHoursByAssignee(userStories);
		const totalHours = data.reduce((sum, item) => sum + item.value, 0);

		// Configure chart options
		const option: echarts.EChartsOption = {
			title: {
				text: `Hours by Assignee (${totalHours}h total)`,
				subtext: 'Horizontal Bar Chart',
				left: 'center',
				textStyle: {
					color: 'var(--vscode-foreground)',
					fontSize: 16,
					fontWeight: 600
				},
				subtextStyle: {
					color: 'var(--vscode-descriptionForeground)',
					fontSize: 12
				}
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				formatter: '{b}: {c}h',
				backgroundColor: 'var(--vscode-editor-background)',
				borderColor: 'var(--vscode-panel-border)',
				textStyle: {
					color: 'var(--vscode-foreground)'
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
					color: 'var(--vscode-foreground)'
				},
				axisLabel: {
					color: 'var(--vscode-foreground)',
					formatter: '{value}h'
				},
				axisLine: {
					lineStyle: {
						color: 'var(--vscode-panel-border)'
					}
				}
			},
			yAxis: {
				type: 'category',
				data: data.map(item => item.name),
				nameTextStyle: {
					color: 'var(--vscode-foreground)'
				},
				axisLabel: {
					color: 'var(--vscode-foreground)',
					interval: 0
				},
				axisLine: {
					lineStyle: {
						color: 'var(--vscode-panel-border)'
					}
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
						color: 'var(--vscode-foreground)',
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
				backgroundColor: '#282828',
				borderRadius: '6px'
			}}
		>
			<div ref={chartRef} style={{ width: '100%', height: '350px' }} />
		</div>
	);
};

export default AssigneeHoursChart;
