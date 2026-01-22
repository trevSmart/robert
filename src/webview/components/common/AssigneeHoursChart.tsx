import { type FC, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { aggregateUserStoriesByAssignee } from '../../utils/chartUtils';
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

const AssigneeHoursChart: FC<AssigneeHoursChartProps> = ({ userStories }) => {
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<echarts.ECharts | null>(null);

	// Detect if theme is light or dark
	const isLightTheme = () => {
		const body = document.body;
		return body.classList.contains('vscode-light') || body.getAttribute('data-vscode-theme-kind') === 'light';
	};

	// Darken hex color by percentage
	const darkenColor = (hex: string, percent: number): string => {
		const num = parseInt(hex.slice(1), 16);
		const amt = Math.round(2.55 * percent);
		const R = Math.max(0, (num >> 16) - amt);
		const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
		const B = Math.max(0, (num & 0x0000ff) - amt);
		return `#${((0x1000000 + R * 0x10000 + G * 0x100 + B) | 0).toString(16).slice(1)}`;
	};

	// Get color palette with theme adjustments
	const getColorPalette = useCallback((): string[] => {
		const baseColors = ['#B5D6F0', '#C8E6C9', '#FFE9A3', '#FFCCCC', '#B3E5FC', '#FFD9B3', '#E1BEE7', '#F8BBD0', '#D1C4E9', '#F0F4C3', '#C8F7DC', '#A5D6A7', '#EF9A9A', '#FFCC80', '#CE93D8', '#90CAF9', '#80DEEA', '#FFAB91', '#F48FB1', '#FFF9C4', '#B39DDB', '#C5E1A5', '#FFCCBC', '#BCAAA4'];
		if (isLightTheme()) {
			return baseColors;
		}
		return baseColors.map(color => darkenColor(color, 30));
	}, []);

	const barHeight = 20; // Height per bar in pixels
	const assigneeData = aggregateUserStoriesByAssignee(userStories);
	const numBars = assigneeData.length;
	const chartHeight = Math.max(300, numBars * barHeight + 70); // Min 300px, add 70px for title and margins

	useEffect(() => {
		if (!chartRef.current) return;

		// Initialize chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}

		// Prepare data
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

		// Create a map of story ID to story details for easy lookup
		const storyDetailsMap = new Map<string, { formattedId: string; name: string }>();
		assigneeData.forEach(assignee => {
			assignee.userStories.forEach(story => {
				storyDetailsMap.set(story.id, { formattedId: story.formattedId, name: story.name });
			});
		});

		// Create series for each user story
		const series = Array.from(allUserStories).map(storyId => {
			const storyDetails = storyDetailsMap.get(storyId);
			const storyData = assigneeData.map(assignee => {
				const story = assignee.userStories.find(s => s.id === storyId);
				return story ? story.hours : 0;
			});

			// Format the series name as "code: title"
			const seriesName = storyDetails ? `${storyDetails.formattedId}: ${storyDetails.name}` : storyId;

			return {
				name: seriesName,
				type: 'bar' as const,
				stack: 'hours',
				data: storyData,
				itemStyle: {
					color:
						getColorPalette()[
							Math.abs(
								String(storyId)
									.split('')
									.reduce((a, b) => a + b.charCodeAt(0), 0)
							) % 24
						]
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
				position: ((
					point: [number, number],
					params: echarts.TooltipComponentFormatterCallbackParams,
					dom: HTMLElement,
					rect: unknown,
					size: { viewSize: [number, number]; contentSize: [number, number] }
				): [number, number] => {
					// Position tooltip to the right of the cursor, with some padding
					let x = point[0] + 10;
					let y = point[1] - size.contentSize[1] / 2;

					// Adjust if tooltip goes off the right edge
					if (x + size.contentSize[0] > size.viewSize[0]) {
						x = point[0] - size.contentSize[0] - 10;
					}

					// Adjust if tooltip goes off the bottom edge
					if (y + size.contentSize[1] > size.viewSize[1]) {
						y = size.viewSize[1] - size.contentSize[1] - 10;
					}

					// Adjust if tooltip goes off the top edge
					if (y < 0) {
						y = 10;
					}

					return [x, y];
				}) as echarts.TooltipComponentOption['position'],
				formatter: function (params: echarts.TooltipComponentFormatterCallbackParams) {
					if (!Array.isArray(params) || params.length === 0) {
						return '';
					}
					const assignee = params[0].name;
					let content = `<div style="font-size: 12px;"><strong style="font-size: 13px;">${assignee}</strong><br/><br/>`;
					let total = 0;

					params.forEach((param) => {
						const value = typeof param.value === 'number' ? param.value : Array.isArray(param.value) ? (typeof param.value[0] === 'number' ? param.value[0] : 0) : 0;
						if (value > 0) {
							content += `${param.seriesName}: <strong>${value}h</strong><br/>`;
							total += value;
						}
					});

					content += `<br/><strong>Total: ${total}h</strong></div>`;
					return content;
				},
				backgroundColor: themeColors.background,
				borderColor: themeColors.panelBorder,
				textStyle: {
					color: themeColors.foreground,
					fontSize: 12
				}
			},
			grid: {
				left: '3%',
				right: '4%',
				top: '8%',
				bottom: '3%',
				containLabel: true
			},
			xAxis: {
				type: 'value',
				name: '',
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
	}, [userStories, assigneeData, getColorPalette]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			chartInstanceRef.current?.dispose();
		};
	}, []);

	return (
		<div
			ref={chartRef}
			style={{
				margin: '20px 0',
				padding: '5px 10px 10px 10px',
				backgroundColor: themeColors.panelBackground,
				border: `1px solid ${themeColors.panelBorder}`,
				borderRadius: '6px',
				height: `${chartHeight}px`
			}}
		/>
	);
};

export default AssigneeHoursChart;
