import { type FC, useEffect, useRef, useCallback, useMemo } from 'react';
import type * as echarts from 'echarts';
import { aggregateUserStoriesByAssignee, getMemberColor, isLightVscodeTheme } from '../../utils/chartUtils';
import { disposeChart, initChart, setChartOption } from '../../utils/echartsHelpers';
import { themeColors } from '../../utils/themeColors';
import { type UserStory } from '../../../types/rally';

interface AssigneeHoursChartProps {
	userStories: UserStory[];
}

const TOOLTIP_DELAY_MS = 320;
const TOOLTIP_TRANSITION_DURATION_S = 0.55;

const AssigneeHoursChart: FC<AssigneeHoursChartProps> = ({ userStories }) => {
	const chartRef = useRef<HTMLDivElement>(null);

	const getStoryColor = useCallback((storyId: string): string => {
		return getMemberColor(storyId);
	}, []);

	const barHeight = 20; // Height per bar in pixels
	const separatorHeight = 15; // Extra space for visual separator after Unassigned

	const assigneeData = useMemo(() => {
		const allAssigneeData = aggregateUserStoriesByAssignee(
			userStories.map(story => ({
				...story,
				assignee: story.assignee || 'Unassigned'
			})) as Array<UserStory & { assignee: string }>
		);

		const unassignedData = allAssigneeData.filter(item => item.name === 'Unassigned');
		const assignedData = allAssigneeData.filter(item => item.name !== 'Unassigned');
		const hasUnassigned = unassignedData.length > 0;

		return hasUnassigned
			? [...unassignedData, { name: '', userStories: [], totalHours: 0 }, ...assignedData]
			: assignedData;
	}, [userStories]);

	const hasUnassigned = assigneeData.some(item => item.name === 'Unassigned');
	const numBars = assigneeData.length;
	const chartHeight = Math.max(300, numBars * barHeight + (hasUnassigned ? separatorHeight : 0) + 70); // Min 300px, add 70px for title and margins

	useEffect(() => {
		if (!chartRef.current) return;

		const chart = initChart(chartRef.current);

		// Data is already ordered: Unassigned first (if exists), separator, then assigned sorted by hours
		// We don't re-sort here to preserve that ordering
		const totalHours = assigneeData.reduce((sum, assignee) => sum + assignee.totalHours, 0);

		const lightTheme = isLightVscodeTheme();

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

			const normalColor = getStoryColor(storyId);

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
				// Delay is handled manually so it can be cancelled when the pointer leaves.
				triggerOn: 'none',
				axisPointer: {
					type: 'shadow'
				},
				confine: true,
				showDelay: 0,
				hideDelay: 0,
				transitionDuration: TOOLTIP_TRANSITION_DURATION_S,
				displayTransition: true,
				enterable: false,
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
				extraCssText: 'pointer-events: none; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);'
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

		let pointerInside = false;
		let tooltipVisible = false;
		let showDelayTimer: ReturnType<typeof setTimeout> | null = null;
		let hideDelayTimer: ReturnType<typeof setTimeout> | null = null;
		let lastPointer = { x: 0, y: 0 };

		const cancelPendingShow = () => {
			if (showDelayTimer !== null) {
				clearTimeout(showDelayTimer);
				showDelayTimer = null;
			}
		};

		const cancelPendingHide = () => {
			if (hideDelayTimer !== null) {
				clearTimeout(hideDelayTimer);
				hideDelayTimer = null;
			}
		};

		const hideTooltipNow = () => {
			if (chart.isDisposed()) return;
			tooltipVisible = false;
			chart.dispatchAction({ type: 'updateAxisPointer', currTrigger: 'leave' });
			chart.dispatchAction({ type: 'hideTip' });
		};

		const scheduleTooltipHide = () => {
			cancelPendingHide();
			hideDelayTimer = setTimeout(() => {
				hideDelayTimer = null;
				if (pointerInside) return;
				hideTooltipNow();
			}, TOOLTIP_DELAY_MS);
		};

		const hideTooltip = (immediate = false) => {
			if (chart.isDisposed()) return;
			pointerInside = false;
			cancelPendingShow();
			if (immediate) {
				cancelPendingHide();
				hideTooltipNow();
				return;
			}
			scheduleTooltipHide();
		};

		const showTooltipAtPointer = () => {
			if (!pointerInside || chart.isDisposed()) return;
			chart.dispatchAction({
				type: 'updateAxisPointer',
				currTrigger: 'mousemove',
				x: lastPointer.x,
				y: lastPointer.y
			});
		};

		const scheduleTooltipShow = (x: number, y: number) => {
			lastPointer = { x, y };
			cancelPendingShow();
			cancelPendingHide();
			if (!pointerInside) return;

			const delay = tooltipVisible ? 0 : TOOLTIP_DELAY_MS;
			showDelayTimer = setTimeout(() => {
				showDelayTimer = null;
				showTooltipAtPointer();
			}, delay);
		};

		const handlePointerMove = (x: number, y: number) => {
			pointerInside = true;
			scheduleTooltipShow(x, y);
		};

		setChartOption(chart, option);

		const handleShowTip = () => {
			tooltipVisible = true;
		};
		const handleHideTip = () => {
			tooltipVisible = false;
		};
		const handleZrMouseMove = (event: { offsetX: number; offsetY: number }) => {
			handlePointerMove(event.offsetX, event.offsetY);
		};
		const handleMouseEnter = () => {
			pointerInside = true;
		};
		const handleMouseLeave = () => {
			hideTooltip();
		};
		const handleGlobalOut = () => {
			hideTooltip();
		};

		chart.on('showTip', handleShowTip);
		chart.on('hideTip', handleHideTip);

		// ECharts globalout can be unreliable inside scrollable webviews; use layered fallbacks.
		chart.on('globalout', handleGlobalOut);
		const zr = chart.getZr();
		zr.on('globalout', handleGlobalOut);
		zr.on('mousemove', handleZrMouseMove);

		const containerEl = chartRef.current;
		containerEl?.addEventListener('mouseenter', handleMouseEnter);
		containerEl?.addEventListener('mouseleave', handleMouseLeave);

		const handleScroll = () => hideTooltip(true);
		window.addEventListener('scroll', handleScroll, true);

		let mouseCheckRaf: number | null = null;
		const handleDocumentMouseMove = (event: MouseEvent) => {
			if (!containerEl) return;
			if (mouseCheckRaf !== null) return;
			mouseCheckRaf = requestAnimationFrame(() => {
				mouseCheckRaf = null;
				const rect = containerEl.getBoundingClientRect();
				const inside =
					event.clientX >= rect.left &&
					event.clientX <= rect.right &&
					event.clientY >= rect.top &&
					event.clientY <= rect.bottom;
				if (!inside) {
					hideTooltip();
				} else {
					pointerInside = true;
					const relativeX = event.clientX - rect.left;
					const relativeY = event.clientY - rect.top;
					scheduleTooltipShow(relativeX, relativeY);
				}
			});
		};
		document.addEventListener('mousemove', handleDocumentMouseMove);

		const handleResize = () => {
			hideTooltip(true);
			chart.resize();
		};
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('scroll', handleScroll, true);
			document.removeEventListener('mousemove', handleDocumentMouseMove);
			if (mouseCheckRaf !== null) {
				cancelAnimationFrame(mouseCheckRaf);
			}
			cancelPendingShow();
			cancelPendingHide();
			chart.off('showTip', handleShowTip);
			chart.off('hideTip', handleHideTip);
			chart.off('globalout', handleGlobalOut);
			zr.off('globalout', handleGlobalOut);
			zr.off('mousemove', handleZrMouseMove);
			containerEl?.removeEventListener('mouseenter', handleMouseEnter);
			containerEl?.removeEventListener('mouseleave', handleMouseLeave);
			disposeChart(chart);
		};
	}, [userStories, assigneeData, getStoryColor]);

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
