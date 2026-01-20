import type React from 'react';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { aggregateUserStoriesByAssignee, AssigneeUserStories } from '../../utils/chartUtils';
import { themeColors } from '../../utils/themeColors';

interface UserStory {
	objectId: string;
	formattedId: string;
	name: string;
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
		const assigneeData = aggregateUserStoriesByAssignee(userStories);
		const totalHours = assigneeData.reduce((sum, assignee) => sum + assignee.totalHours, 0);
		const lightTheme = isLightTheme();

		// Create series data for stacked bars
		// First, collect all unique user stories across assignees
		const allUserStories = new Set<string>();
		assigneeData.forEach(assignee => {
			assignee.userStories.forEach(story => {
				allUserStories.add(story.id);
			});
		});

		// Create series for each user story
		const series = Array.from(allUserStories).map(storyId => {
			const storyData = assigneeData.map(assignee => {
				const story = assignee.userStories.find(s => s.id === storyId);
				return story ? story.hours : 0;
			});

			// Find the story name for the first occurrence
			const storyName = assigneeData.flatMap(a => a.userStories).find(s => s.id === storyId)?.name || storyId;

			return {
				name: storyName,
				type: 'bar' as const,
				stack: 'hours',
				data: storyData,
				itemStyle: {
					color: ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#F5DEB3', '#DDA0DD', '#98FB98'][Math.abs(storyId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 12]
				},
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.5)'
					}
				}
			};
		});

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
				formatter: function (params: any) {
					const assignee = params[0].name;
					let content = `<strong>${assignee}</strong><br/>`;
					let total = 0;

					params.forEach((param: any) => {
						if (param.value > 0) {
							content += `${param.seriesName}: ${param.value}h<br/>`;
							total += param.value;
						}
					});

					content += `<strong>Total: ${total}h</strong>`;
					return content;
				},
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
				data: assigneeData.map(item => item.name),
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
			series: series
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

	const barHeight = 40; // Height per bar in pixels
	const numBars = assigneeData.length;
	const chartHeight = Math.max(300, numBars * barHeight + 100); // Min 300px, add 100px for title and margins

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
			<div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }} />
		</div>
	);
};

export default AssigneeHoursChart;
