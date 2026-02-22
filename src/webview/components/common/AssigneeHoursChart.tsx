import { type FC, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { aggregateUserStoriesByAssignee } from '../../utils/chartUtils';
import { themeColors } from '../../utils/themeColors';
import { type UserStory } from '../../../types/rally';

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
	const separatorHeight = 15; // Extra space for visual separator after Unassigned

	// Include all stories (with and without assignees)
	const allAssigneeData = aggregateUserStoriesByAssignee(
		userStories.map(story => ({
			...story,
			assignee: story.assignee || 'Unassigned'
		})) as Array<UserStory & { assignee: string }>
	);

	// Separate Unassigned from the rest and reorder: Unassigned first, then others sorted by hours
	const unassignedData = allAssigneeData.filter(item => item.name === 'Unassigned');
	const assignedData = allAssigneeData.filter(item => item.name !== 'Unassigned');
	const hasUnassigned = unassignedData.length > 0;

	// Combine: Unassigned first (if exists), then separator placeholder, then assigned
	const assigneeData = hasUnassigned
		? [...unassignedData, { name: '', userStories: [], totalHours: 0 }, ...assignedData] // Empty item as separator
		: assignedData;

	const numBars = assigneeData.length;
	const chartHeight = Math.max(300, numBars * barHeight + (hasUnassigned ? separatorHeight : 0) + 70); // Min 300px, add 70px for title and margins

	useEffect(() => {
		if (!chartRef.current) return;

		// Initialize chart
		if (!chartInstanceRef.current) {
			chartInstanceRef.current = echarts.init(chartRef.current);
		}

		// Data is already ordered: Unassigned first (if exists), separator, then assigned sorted by hours
		// We don't re-sort here to preserve that ordering
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

		// Track colors per story for tooltip reuse
		const storyColorMap = new Map<string, string>();

		// Create series for each user story
		const series = Array.from(allUserStories).map(storyId => {
			const storyDetails = storyDetailsMap.get(storyId);

			// One color per story from the full palette so each segment is distinct (including in Unassigned bar)
			const normalColor =
				getColorPalette()[
					Math.abs(
						String(storyId)
							.split('')
							.reduce((a, b) => a + b.charCodeAt(0), 0)
					) % 24
				];

			storyColorMap.set(storyId, normalColor);

			// Create data points: same color for this story in every bar (assigned and Unassigned)
			const storyData = assigneeData.map(assignee => {
				const story = assignee.userStories.find(s => s.id === storyId);
				const hours = story ? story.hours : 0;

				return {
					value: hours,
					itemStyle: {
						color: normalColor
					}
				};
			});

			// Format the series name as "code: title"
			const seriesName = storyDetails ? `${storyDetails.formattedId}: ${storyDetails.name}` : storyId;

			return {
				name: seriesName,
				type: 'bar' as const,
				stack: 'hours',
				data: storyData,
				emphasis: {
					itemStyle: {
						shadowBlur: 10,
						shadowOffsetX: 0,
						shadowColor: 'rgba(0, 0, 0, 0.5)'
					}
				}
			};
		});

		// Build assignee -> stories map for tooltip content
		const assigneeStoriesMap = new Map(
			assigneeData.map(assignee => [
				assignee.name,
				assignee.userStories.map(story => ({
					id: story.id,
					formattedId: story.formattedId,
					name: story.name,
					hours: story.hours,
					color: storyColorMap.get(story.id) ?? '#999999'
				}))
			])
		);

		// Configure chart options
		const option: echarts.EChartsOption = {
			backgroundColor: 'transparent',
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
				showDelay: 200,
				position: ((point: [number, number], params: echarts.TooltipComponentFormatterCallbackParams, dom: HTMLElement, rect: unknown, size: { viewSize: [number, number]; contentSize: [number, number] }): [number, number] => {
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
					const assigneeName = Array.isArray(params) ? params[0]?.name : params.name;
					if (!assigneeName) {
						return '';
					}

					const stories = assigneeStoriesMap.get(assigneeName) ?? [];
					if (stories.length === 0) {
						return `<div style="font-size: 11.5px;"><strong style="font-size: 12.5px;">${assigneeName}</strong><br/><br/>No user stories assigned.</div>`;
					}

					let total = 0;
					const storyRows = stories
						.map(story => {
							total += story.hours;
							return `<div style="display: flex; align-items: baseline; gap: 6px;">
								<span style="width: 10px; height: 10px; background-color: ${story.color}; border-radius: 2px; display: inline-block; flex-shrink: 0; margin-top: 2px;"></span>
								<span style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${story.formattedId}: ${story.name}</span>
								<span style="white-space: nowrap;">: <strong>${story.hours}h</strong></span>
							</div>`;
						})
						.join('');

					return `<div style="font-size: 11.5px;"><strong style="font-size: 12.5px;">${assigneeName}</strong><br/><br/>${storyRows}<br/><strong>Total: ${total}h</strong></div>`;
				},
				backgroundColor: `color-mix(in srgb, ${themeColors.background} 85%, transparent)`,
				borderColor: themeColors.panelBorder,
				textStyle: {
					color: themeColors.foreground,
					fontSize: 11.5
				},
				extraCssText: 'backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);'
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
					color: '#999999',
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
				inverse: true, // Display from top to bottom (highest bars at top)
				nameTextStyle: {
					color: themeColors.foreground
				},
				axisLabel: {
					interval: 0,
					color: (value: string | number) => (value === 'Unassigned' ? (lightTheme ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.5)') : '#999999')
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

		chartInstanceRef.current?.setOption(option);

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
				padding: '0 10px',
				height: `${chartHeight}px`
			}}
		/>
	);
};

export default AssigneeHoursChart;
