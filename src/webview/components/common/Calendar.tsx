import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { themeColors, isLightTheme } from '../../utils/themeColors';
import type { Holiday, DayEvent, CustomCalendarEvent } from '../../../types/utils';
import type { UserStory } from '../../../types/rally';

interface Iteration {
	objectId: string;
	name: string;
	startDate: string;
	endDate: string;
	state: string;
	project: string | null;
	_ref: string;
}

interface DayInfo {
	date: Date;
	day: number;
	isCurrentMonth: boolean;
	isToday: boolean;
	iterations: Iteration[];
	events: DayEvent[];
}

interface CalendarProps {
	currentDate?: Date;
	iterations?: Iteration[];
	userStories?: UserStory[];
	onMonthChange?: (date: Date) => void;
	debugMode?: boolean;
	currentUser?: unknown;
	holidays?: Holiday[];
	onIterationClick?: (iteration: Iteration) => void;
	customEvents?: CustomCalendarEvent[];
	onSaveCustomEvent?: (event: CustomCalendarEvent) => void;
	onDeleteCustomEvent?: (eventId: string) => void;
}

const PRESET_COLORS = ['#e05252', '#e07c52', '#e0c452', '#7bc67b', '#52a0e0', '#8a52e0', '#e052b8', '#808080'];

const Calendar: React.FC<CalendarProps> = ({ currentDate = new Date(), iterations = [], userStories = [], onMonthChange, debugMode = false, currentUser, holidays = [], onIterationClick, customEvents = [], onSaveCustomEvent, onDeleteCustomEvent }) => {
	const today = new Date();
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

	const [hoveredDay, setHoveredDay] = useState<DayInfo | null>(null);
	const [isHeaderHovered, setIsHeaderHovered] = useState(false);

	// Custom event modal state
	const [modalOpen, setModalOpen] = useState(false);
	const [modalClosing, setModalClosing] = useState(false);
	const [modalEntered, setModalEntered] = useState(false);
	const [editingEvent, setEditingEvent] = useState<CustomCalendarEvent | null>(null);
	const [modalForm, setModalForm] = useState({ date: '', time: '', title: '', description: '', color: '#52a0e0' });
	const modalTransitionMs = 220;
	const [hoveredIteration, setHoveredIteration] = useState<Iteration | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
	const [calendarGridWidth, setCalendarGridWidth] = useState(800);
	const calendarGridRef = useRef<HTMLDivElement>(null);

	// Refs for measuring available vertical space
	const containerRef = useRef<HTMLDivElement>(null);
	const welcomeRef = useRef<HTMLDivElement>(null);
	const navRef = useRef<HTMLDivElement>(null);
	const legendRef = useRef<HTMLDivElement>(null);
	const [cellHeight, setCellHeight] = useState(80);

	// Custom column widths: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
	// Weekdays: 1.3fr, Weekends: 0.7fr
	const calendarColumnFrs = [1.3, 1.3, 1.3, 1.3, 1.3, 0.7, 0.7];
	const totalFr = calendarColumnFrs.reduce((a, b) => a + b, 0);

	// Calcula fontSize suau per números de dia
	function getDayNumberFontSize(cellWidth: number) {
		const min = 10; // px
		const max = 14; // px
		const minWidth = 50; // Cell width at which font is at min size
		const maxWidth = 150; // Cell width at which font is at max size

		// Mapeja el cellWidth al rang [min, max] amb una corba suau d'arrel quadrada
		const normalized = Math.max(0, Math.min(1, (Math.sqrt(cellWidth) - Math.sqrt(minWidth)) / (Math.sqrt(maxWidth) - Math.sqrt(minWidth))));
		const size = min + normalized * (max - min);

		return size;
	}

	function getSprintBarHeight(cellWidth: number) {
		const min = 4; // px
		const max = 10; // px
		const minWidth = 50; // Cell width at which bar is at min size
		const maxWidth = 150; // Cell width at which bar is at max size

		// Mapeja el cellWidth al rang [min, max] amb una corba suau d'arrel quadrada
		const normalized = Math.max(0, Math.min(1, (Math.sqrt(cellWidth) - Math.sqrt(minWidth)) / (Math.sqrt(maxWidth) - Math.sqrt(minWidth))));
		const size = min + normalized * (max - min);

		return size;
	}

	function getEventTopMargin(cellWidth: number) {
		const min = 23; // px
		const max = 32; // px
		const minWidth = 50; // Cell width at which margin is at min size
		const maxWidth = 150; // Cell width at which margin is at max size

		// Mapeja el cellWidth al rang [min, max] amb una corba suau d'arrel quadrada
		const normalized = Math.max(0, Math.min(1, (Math.sqrt(cellWidth) - Math.sqrt(minWidth)) / (Math.sqrt(maxWidth) - Math.sqrt(minWidth))));
		const size = min + normalized * (max - min);

		return size;
	}
	// Animation state: sprint bars grow from left to right on mount
	const [sprintBarsAnimated, setSprintBarsAnimated] = useState(false);
	const [sprintBarsTransition, setSprintBarsTransition] = useState(true);

	const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
	const [messages, setMessages] = useState<string[]>([]);

	// Marquee refs and state
	const marqueeContainerRef = useRef<HTMLDivElement>(null);
	const marqueeTextRef = useRef<HTMLSpanElement>(null);
	const [marqueeOverflow, setMarqueeOverflow] = useState(0);
	const [marqueeKey, setMarqueeKey] = useState(0); // bump to reset animation position

	// Track page visibility to pause animations when hidden
	const [pageVisible, setPageVisible] = useState(() => (typeof document !== 'undefined' ? document.visibilityState === 'visible' : true));

	// Trigger modal enter animation after mount
	useEffect(() => {
		if (!modalOpen || modalEntered) return;
		const id = requestAnimationFrame(() => {
			requestAnimationFrame(() => setModalEntered(true));
		});
		return () => cancelAnimationFrame(id);
	}, [modalOpen, modalEntered]);

	// Trigger sprint bar grow animation shortly after mount
	useEffect(() => {
		const timer = setTimeout(() => setSprintBarsAnimated(true), 80);
		return () => clearTimeout(timer);
	}, []);

	// Reset animation when month changes: snap bars to hidden (no transition),
	// then re-enable transitions and animate in after paint.
	useEffect(() => {
		setSprintBarsTransition(false);
		setSprintBarsAnimated(false);
		// Double rAF ensures the browser paints the hidden state before re-animating
		const raf = requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setSprintBarsTransition(true);
				setSprintBarsAnimated(true);
			});
		});
		return () => cancelAnimationFrame(raf);
	}, [currentDate.getMonth(), currentDate.getFullYear()]);

	// Listen to page visibility changes
	useEffect(() => {
		const handler = () => setPageVisible(document.visibilityState === 'visible');
		document.addEventListener('visibilitychange', handler);
		return () => document.removeEventListener('visibilitychange', handler);
	}, []);

	// Monitor window width to hide events on narrow viewports
	useEffect(() => {
		const handleResize = () => {
			setWindowWidth(window.innerWidth);
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Monitor calendar grid width changes
	useEffect(() => {
		if (!calendarGridRef.current) return;

		const resizeObserver = new ResizeObserver(() => {
			if (calendarGridRef.current) {
				const gridWidth = calendarGridRef.current.offsetWidth;
				// Use average weekday cell width for font sizing
				const weekdayFr = 1.3;
				const cellWidth = gridWidth * (weekdayFr / totalFr);
				setCalendarGridWidth(cellWidth);
			}
		});

		resizeObserver.observe(calendarGridRef.current);
		return () => resizeObserver.disconnect();
	}, [totalFr]);

	// Generate insight messages once and set up rotation timer
	useEffect(() => {
		const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

		// Count holidays this month
		const holidaysThisMonth = holidays.filter(h => {
			const hDate = new Date(h.date);
			return hDate >= monthStart && hDate <= monthEnd;
		}).length;

		// Get active iterations this month
		const activeIterations = iterations.filter(iter => {
			const startDate = iter.startDate ? new Date(iter.startDate) : null;
			const endDate = iter.endDate ? new Date(iter.endDate) : null;
			if (!startDate || !endDate) return false;
			return startDate <= monthEnd && endDate >= monthStart;
		});

		// Calculate days until next sprint end
		let daysUntilSprintEnd: number | null = null;
		const upcomingSprints = activeIterations.filter(s => {
			const endDate = s.endDate ? new Date(s.endDate) : null;
			if (!endDate) return false;
			endDate.setHours(23, 59, 59, 999);
			return endDate >= todayStart;
		});
		if (upcomingSprints.length > 0) {
			const nextSprint = upcomingSprints.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];
			const endDate = new Date(nextSprint.endDate);
			endDate.setHours(0, 0, 0, 0);
			const diffTime = endDate.getTime() - todayStart.getTime();
			daysUntilSprintEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) as number;
		}

		// Calculate average sprint duration
		const sprintDurations = activeIterations
			.map(s => {
				const start = new Date(s.startDate).getTime();
				const end = new Date(s.endDate).getTime();
				return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
			})
			.filter(d => d > 0);
		const avgSprintDuration = sprintDurations.length > 0 ? Math.round(sprintDurations.reduce((a, b) => a + b, 0) / sprintDurations.length) : 0;

		// Get active iteration IDs for this month
		const activeIterationIds = new Set(activeIterations.map(iter => iter.objectId));

		// Robust helper to extract iteration id from user story (handles string or object shapes)
		const extractIterationId = (us: any) => {
			if (!us || !us.iteration) return null;
			const it = us.iteration;
			if (typeof it === 'string') return it;
			if (typeof it === 'object') {
				if (it.objectId) return it.objectId;
				if (it._ref) {
					const m = (it._ref as string).match(/([^/]+)(?:\?.*)?$/);
					if (m) return m[1];
				}
				if (it._refObjectName) return it._refObjectName;
			}
			return null;
		};

		// Get user stories for active sprints (robust id matching)
		const usForActiveSprints = userStories.filter(us => {
			const id = extractIterationId(us as any);
			return id && activeIterationIds.has(id);
		});

		// Calculate total hours and counts
		const totalHours = usForActiveSprints.reduce((sum, us) => sum + (us.taskEstimateTotal || 0), 0);
		const remainingHours = usForActiveSprints.reduce((sum, us) => sum + (us.toDo || 0), 0);
		const completedHours = totalHours - remainingHours;
		const completedUS = usForActiveSprints.filter(us => us.scheduleState === 'Completed').length;
		const pendingUS = usForActiveSprints.length - completedUS;
		const blockedUS = usForActiveSprints.filter(us => us.blocked).length;

		// Calculate completion percentage
		const hoursCompletionPercentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

		const daysRemainingInMonth = Math.ceil((monthEnd.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

		// Create 4 different insight-based messages
		const generatedMessages = [
			// 1) Sprint cutoff message (if applicable)
			daysUntilSprintEnd !== null && daysUntilSprintEnd >= 0 ? (daysUntilSprintEnd === 1 ? `Sprint cutoff Tomorrow! 🏁` : daysUntilSprintEnd === 0 ? `Sprint cutoff Today! 🏁` : `Sprint cutoff in ${daysUntilSprintEnd} days. Keep pushing! 🚀`) : `Stay focused on your current sprint objectives! 💪`,

			// 2) Hours summary (use totalHours computed from user stories)
			totalHours > 0 ? `${totalHours}h total this month. ${hoursCompletionPercentage}% done! ${remainingHours}h left. 💪` : `No work scheduled this month. That's rare! 🤔`,

			// 3) Holidays summary
			holidaysThisMonth > 0 ? (holidaysThisMonth === 1 ? `Fun fact: There's 1 holiday this month. Plan accordingly! 🎉` : `Heads up: ${holidaysThisMonth} holidays this month. Time management is key! 🎉`) : `No holidays scheduled this month—time to ship! 🎯`,

			// 4) Progress / short-timers: prefer sprint-based remaining days; otherwise month-based message without implying sprint
			blockedUS > 0
				? `${blockedUS} blocked ${blockedUS === 1 ? 'story' : 'stories'} this month. Time to unblock! 🚨`
				: completedUS > 0
					? `You've completed ${completedUS} ${completedUS === 1 ? 'story' : 'stories'}! ${pendingUS} more to go. 🎯`
					: daysUntilSprintEnd !== null && daysUntilSprintEnd >= 0 && daysUntilSprintEnd <= 7
						? daysUntilSprintEnd === 1
							? `Only Tomorrow left in the sprint. Final push! ⏰`
							: daysUntilSprintEnd === 0
								? `Only Today left in the sprint. Final push! ⏰`
								: `Only ${daysUntilSprintEnd} days left in the sprint. Final push! ⏰`
						: daysRemainingInMonth > 0 && daysRemainingInMonth <= 7
							? daysRemainingInMonth === 1
								? `Only 1 day left in the month.`
								: `Only ${daysRemainingInMonth} days left in the month.`
							: avgSprintDuration > 0
								? `Your average sprint duration is ${avgSprintDuration} days. Pace yourself! ⏱️`
								: `Ready to break records this month? Let's go! 🏆`
		];

		setMessages(generatedMessages);
	}, [currentDate, iterations, userStories, holidays, todayStart.getTime()]);

	// Set up interval to rotate messages every 20 seconds (paused when page is hidden)
	useEffect(() => {
		if (!pageVisible || messages.length === 0) return;

		let changeTimeout: ReturnType<typeof setTimeout> | null = null;
		const interval = setInterval(() => {
			if (messageAnimatingRef.current) return; // avoid overlapping anims
			messageAnimatingRef.current = true;
			// fade out
			setMessageVisible(false);
			// after fade-out, advance the message and fade in
			changeTimeout = setTimeout(() => {
				setMarqueeKey(k => k + 1); // reset marquee position before showing new message
				setCurrentMessageIndex(prev => (prev + 1) % messages.length);
				setMessageVisible(true);
				// clear animating flag after fade-in completes
				setTimeout(() => {
					messageAnimatingRef.current = false;
				}, 260);
			}, 240);
		}, 60000);

		return () => {
			clearInterval(interval);
			if (changeTimeout) clearTimeout(changeTimeout);
		};
	}, [pageVisible, messages]);

	// Visibility state for fade animation
	const [messageVisible, setMessageVisible] = useState(true);
	const messageAnimatingRef = useRef(false);

	// Measure marquee overflow when message changes
	useEffect(() => {
		// Small delay to let the DOM update after message change
		const timer = setTimeout(() => {
			if (marqueeContainerRef.current && marqueeTextRef.current) {
				const containerWidth = marqueeContainerRef.current.offsetWidth;
				const textWidth = marqueeTextRef.current.scrollWidth;
				const overflow = textWidth - containerWidth;
				setMarqueeOverflow(overflow > 0 ? overflow + 16 : 0); // +16px padding
			}
		}, 300); // wait for fade-in to complete
		return () => clearTimeout(timer);
	}, [currentMessageIndex, messages]);

	// Also measure on window resize to catch container width changes
	useEffect(() => {
		const handleResize = () => {
			if (marqueeContainerRef.current && marqueeTextRef.current) {
				const containerWidth = marqueeContainerRef.current.offsetWidth;
				const textWidth = marqueeTextRef.current.scrollWidth;
				const overflow = textWidth - containerWidth;
				setMarqueeOverflow(overflow > 0 ? overflow + 16 : 0); // +16px padding
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// Rotate message on user click (with fade)
	const rotateMessage = () => {
		if (messageAnimatingRef.current || messages.length === 0) return;
		messageAnimatingRef.current = true;
		setMessageVisible(false);
		setTimeout(() => {
			setMarqueeKey(k => k + 1); // reset marquee position before showing new message
			setCurrentMessageIndex(prev => (prev + 1) % messages.length);
			setMessageVisible(true);
			setTimeout(() => {
				messageAnimatingRef.current = false;
			}, 260);
		}, 240);
	};

	const isNarrowViewport = windowWidth < 400;

	// Extract first name from user, removing "Dr Lusuarri"
	const getUserFirstName = (user: unknown) => {
		if (!user) return 'User';
		const userObj = user as any;
		let displayName = userObj.displayName || userObj.userName || 'User';
		// Remove title/surname if present
		displayName = displayName.replace(/\s*(Dr\s+)?Lusuarri\s*/gi, '').trim();
		const firstName = displayName.split(' ')[0];
		return firstName || 'User';
	};

	// Function to get day name
	const getDayName = (date: Date) => {
		const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		return dayNames[date.getDay()];
	};

	// Function to calculate days difference and create tooltip
	const getDayTooltip = (dayInfo: DayInfo) => {
		const targetDate = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), dayInfo.date.getDate());
		const diffTime = targetDate.getTime() - todayStart.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		let content = '';
		if (diffDays === 0) {
			content = 'Today';
		} else if (diffDays === 1) {
			content = 'Tomorrow';
		} else if (diffDays === -1) {
			content = '1 day ago';
		} else if (diffDays > 0) {
			content = `${diffDays} days left`;
		} else {
			content = `${Math.abs(diffDays)} days ago`;
		}

		// Add holiday info to tooltip
		let title = `${dayInfo.day} ${getDayName(targetDate)}`;
		if (dayInfo.events.length > 0) {
			const holidayEvents = dayInfo.events.filter(e => e.type === 'holiday');
			if (holidayEvents.length > 0) {
				title += ` - 🎉 ${holidayEvents.map(e => e.tooltip).join(', ')}`;
			}
		}

		return {
			title: title,
			content: content
		};
	};

	// Get first day of the month
	const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
	// Get last day of the month
	const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

	// Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
	let startDay = firstDay.getDay();
	// Convert to Monday = 0, Sunday = 6
	startDay = startDay === 0 ? 6 : startDay - 1;

	// Get the day of the week for the last day
	let endDay = lastDay.getDay();
	endDay = endDay === 0 ? 6 : endDay - 1;

	// Calculate total days needed (including previous/next month days)
	const totalDays = lastDay.getDate() + startDay + (6 - endDay);

	// Compute cellHeight so calendar fills available vertical space in the view
	// Use window.innerHeight (viewport) instead of container height to avoid
	// a feedback loop where increasing cellHeight increases container height.
	useEffect(() => {
		const computeHeights = () => {
			const viewportH = window.innerHeight || document.documentElement.clientHeight;
			const gridTop = calendarGridRef.current ? calendarGridRef.current.getBoundingClientRect().top : 0;
			const legendH = legendRef.current ? legendRef.current.offsetHeight : 0;
			const paddingAndMargins = 40; // account for extra gaps and paddings

			// Measure header (day names) height inside the grid so we don't allocate it to rows
			let headerH = 0;
			if (calendarGridRef.current) {
				const firstChild = calendarGridRef.current.firstElementChild as HTMLElement | null;
				if (firstChild) headerH = Math.ceil(firstChild.getBoundingClientRect().height);
			}

			// Available space below the calendar grid's top minus header and legend
			const available = Math.max(0, viewportH - gridTop - headerH - legendH - paddingAndMargins);
			const weeks = Math.ceil(totalDays / 7);
			// Limit max height per cell to avoid runaway values
			const maxCell = Math.max(48, Math.floor(viewportH * 0.6));
			const h = weeks > 0 ? Math.floor(available / weeks) : 80;
			setCellHeight(Math.max(40, Math.min(h, maxCell)));
		};

		computeHeights();

		// Run a delayed recompute to catch elements that render shortly after mount
		const delayed = setTimeout(() => computeHeights(), 120);

		// Observe welcome/nav/legend (elements that can change layout above/below grid)
		const ro = new ResizeObserver(() => computeHeights());
		if (welcomeRef.current) ro.observe(welcomeRef.current);
		if (navRef.current) ro.observe(navRef.current);
		if (legendRef.current) ro.observe(legendRef.current);

		window.addEventListener('resize', computeHeights);

		return () => {
			clearTimeout(delayed);
			ro.disconnect();
			window.removeEventListener('resize', computeHeights);
		};
	}, [totalDays]);

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	// ============================================================================
	// SPRINT COLOR ASSIGNMENT SYSTEM
	// ============================================================================
	// This system ensures that overlapping sprints (e.g., a long "Backlog Deuda
	// Tecnica" sprint spanning 4-5 months alongside a 1-month current sprint)
	// never receive visually similar colors.
	//
	// Strategy:
	// 1. Palette Reordering: Colors arranged for maximum perceptual separation
	//    between consecutive indices (warm/cool alternation, light/dark variation)
	//
	// 2. Overlap Detection: When assigning colors, check which sprints overlap
	//    temporally and avoid reusing their color indices
	//
	// 3. Adaptive Stride: If a color index conflicts with an overlapping sprint,
	//    skip ahead by stride of 4 to find a maximally different color
	//
	// This guarantees zero probability of similar colors for overlapping sprints
	// while maintaining deterministic assignment (same sprint = same color always)
	// ============================================================================

	// Iteration colors - reordered for maximum perceptual separation
	// Excluded turquoise/green colors to avoid confusion with holiday events (#4cafa0)
	const lightTheme = isLightTheme();
	const iterationColors = lightTheme
		? ['#1e7fa8', '#c9354b', '#6a8c3a', '#b868c9', '#d9a500', '#2d7a7f', '#c77830', '#a35a8f', '#d97a3f', '#8b5fbf', '#8a684e', '#d97f3f']
		: ['#ffb627', '#4ecdc4', '#ff6b6b', '#d4a5ff', '#f4a261', '#6ec9d9', '#f6cf71', '#e0d1f7', '#f89c75', '#a8dadc', '#dcb0f2', '#f9b384'];

	// Helper function to check if iteration overlaps with current month
	const doesIterationOverlapMonth = (iteration: Iteration) => {
		const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
		const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

		if (!startDate || !endDate) return false;

		// Check if iteration overlaps with current month
		const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

		// Reset time for date comparison - need to do this before assignment
		const iterStartDate = new Date(startDate);
		const iterEndDate = new Date(endDate);
		iterStartDate.setHours(0, 0, 0, 0);
		iterEndDate.setHours(23, 59, 59, 999);
		monthStart.setHours(0, 0, 0, 0);
		monthEnd.setHours(23, 59, 59, 999);

		// Check for overlap: iteration starts before month ends AND iteration ends after month starts
		return iterStartDate <= monthEnd && iterEndDate >= monthStart;
	};

	// Helper function to check if two iterations overlap temporally
	const doIterationsOverlap = (iter1: Iteration, iter2: Iteration): boolean => {
		const start1 = iter1.startDate ? new Date(iter1.startDate) : null;
		const end1 = iter1.endDate ? new Date(iter1.endDate) : null;
		const start2 = iter2.startDate ? new Date(iter2.startDate) : null;
		const end2 = iter2.endDate ? new Date(iter2.endDate) : null;

		if (!start1 || !end1 || !start2 || !end2) return false;

		// Reset time components for accurate date comparison
		start1.setHours(0, 0, 0, 0);
		end1.setHours(23, 59, 59, 999);
		start2.setHours(0, 0, 0, 0);
		end2.setHours(23, 59, 59, 999);

		// Two iterations overlap if one starts before the other ends
		return start1 <= end2 && start2 <= end1;
	};

	// Filter iterations that overlap with current month
	const currentMonthIterations = iterations.filter(doesIterationOverlapMonth);

	// Debug: log all iterations to help diagnose missing sprints
	if (debugMode) {
		console.log(
			'All iterations:',
			iterations.map(i => ({ name: i.name, start: i.startDate, end: i.endDate }))
		);
		console.log(
			'Current month iterations:',
			currentMonthIterations.map(i => ({ name: i.name, start: i.startDate, end: i.endDate }))
		);
	}

	// Assign colors deterministically across all iterations for cross-month consistency
	const orderedAllIterations = [...iterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		// When start dates are equal, use objectId for deterministic ordering (no alphabetical fallback)
		return a.objectId.localeCompare(b.objectId);
	});

	// Assign colors with overlap detection to prevent similar colors for overlapping sprints
	const iterationColorMap = new Map<string, string>();
	const assignedIndices = new Map<string, number>();

	orderedAllIterations.forEach((iteration, sortedIndex) => {
		// Find all previous iterations that overlap with current one
		const overlappingIterations = orderedAllIterations.slice(0, sortedIndex).filter(other => doIterationsOverlap(iteration, other));

		// Get indices already used by overlapping iterations
		const usedIndices = new Set(overlappingIterations.map(other => assignedIndices.get(other.objectId)).filter((idx): idx is number => idx !== undefined));

		// Start with natural index, but use adaptive stride if conflicts exist
		let colorIndex = sortedIndex % iterationColors.length;
		let attempts = 0;
		const maxAttempts = iterationColors.length;

		// If this index is used by an overlapping sprint, skip ahead with stride
		while (attempts < maxAttempts && usedIndices.has(colorIndex)) {
			// Stride of 4 ensures we skip to maximally different colors
			// (12 colors / 4 = 3 distinct groups)
			colorIndex = (colorIndex + 4) % iterationColors.length;
			attempts++;
		}

		// Fallback: if all stride attempts conflict, use linear search
		if (usedIndices.has(colorIndex)) {
			colorIndex = 0;
			while (colorIndex < iterationColors.length && usedIndices.has(colorIndex)) {
				colorIndex++;
			}
			// If still no free color, fall back to natural index (rare edge case with many overlaps)
			if (colorIndex >= iterationColors.length) {
				colorIndex = sortedIndex % iterationColors.length;
			}
		}

		iterationColorMap.set(iteration.objectId, iterationColors[colorIndex]);
		assignedIndices.set(iteration.objectId, colorIndex);
	});

	// Function to add red component to a hex color
	const addRedToColor = (hexColor: string, redAmount: number = 120): string => {
		// Remove # if present
		const hex = hexColor.replace('#', '');

		// Parse RGB values
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		// Add red component (clamp to 0-255)
		const newR = Math.min(255, r + redAmount);

		// Convert back to hex
		const newHex = `#${newR.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

		return newHex;
	};

	// Function to convert hex color to rgba with transparency
	const hexToRgba = (hexColor: string, opacity: number = 1): string => {
		// Remove # if present
		const hex = hexColor.replace('#', '');

		// Parse RGB values
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	};

	const getIterationProgress = (iteration: Iteration) => {
		const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
		const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

		if (!startDate || !endDate) return 0;

		const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
		const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

		if (end <= start) return 0;

		const total = end - start;
		const elapsed = todayStart.getTime() - start;
		const rawProgress = (elapsed / total) * 100;

		return Math.max(0, Math.min(100, rawProgress));
	};

	const getIterationHours = (iteration: Iteration): number => {
		const extractId = (us: any) => {
			if (!us || !us.iteration) return null;
			const it = us.iteration;
			if (typeof it === 'string') return it;
			if (typeof it === 'object') {
				if (it.objectId) return it.objectId;
				if (it._ref) {
					const m = (it._ref as string).match(/([^/]+)(?:\?.*)?$/);
					if (m) return m[1];
				}
				if (it._refObjectName) return it._refObjectName;
			}
			return null;
		};
		return userStories.filter(us => extractId(us as any) === iteration.objectId).reduce((sum, us) => sum + (us.taskEstimateTotal || 0), 0);
	};

	// Order current-month iterations for legend display
	const orderedIterations = [...currentMonthIterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		// When start dates are equal, use objectId for deterministic ordering (no alphabetical fallback)
		return a.objectId.localeCompare(b.objectId);
	});

	// Helper function to check if a day is an end date for any iteration in the month
	const isSprintEndDay = (dayDate: Date) => {
		return currentMonthIterations.some(iteration => {
			const endDate = iteration.endDate ? new Date(iteration.endDate) : null;
			if (!endDate) return false;
			// Compare dates without time
			return dayDate.getFullYear() === endDate.getFullYear() && dayDate.getMonth() === endDate.getMonth() && dayDate.getDate() === endDate.getDate();
		});
	};

	// Helper function to get the sprint that ends on a specific day
	const getSprintEndingOnDay = (dayDate: Date) => {
		return currentMonthIterations.find(iteration => {
			const endDate = iteration.endDate ? new Date(iteration.endDate) : null;
			if (!endDate) return false;
			// Compare dates without time
			return dayDate.getFullYear() === endDate.getFullYear() && dayDate.getMonth() === endDate.getMonth() && dayDate.getDate() === endDate.getDate();
		});
	};

	// Custom event modal helpers
	const openModal = (event: CustomCalendarEvent | null, prefillDate?: string) => {
		if (event) {
			setEditingEvent(event);
			setModalForm({ date: event.date, time: event.time || '', title: event.title, description: event.description || '', color: event.color });
		} else {
			setEditingEvent(null);
			const defaultDate = prefillDate || `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
			setModalForm({ date: defaultDate, time: '', title: '', description: '', color: '#52a0e0' });
		}
		setModalClosing(false);
		setModalEntered(false);
		setModalOpen(true);
	};

	const closeModal = () => {
		setModalClosing(true);
	};

	const handleModalTransitionEnd = (e: React.TransitionEvent) => {
		if (e.target !== e.currentTarget) return;
		if (modalClosing) {
			setModalOpen(false);
			setModalClosing(false);
			setModalEntered(false);
			setEditingEvent(null);
		}
	};

	const saveModal = () => {
		if (!modalForm.title.trim() || !modalForm.date) return;
		const event: CustomCalendarEvent = {
			id: editingEvent?.id || crypto.randomUUID(),
			date: modalForm.date,
			time: modalForm.time || undefined,
			title: modalForm.title.trim(),
			description: modalForm.description.trim() || undefined,
			color: modalForm.color
		};
		onSaveCustomEvent?.(event);
		closeModal();
	};

	const deleteModal = () => {
		if (!editingEvent) return;
		onDeleteCustomEvent?.(editingEvent.id);
		closeModal();
	};

	// Helper function to get all events for a specific day
	const getEventsForDay = (dayDate: Date): DayEvent[] => {
		const events: DayEvent[] = [];

		// Build YYYY-MM-DD string without timezone conversion
		const year = dayDate.getFullYear();
		const month = (dayDate.getMonth() + 1).toString().padStart(2, '0');
		const day = dayDate.getDate().toString().padStart(2, '0');
		const dateStr = `${year}-${month}-${day}`;

		// Add holiday events
		const dayHolidays = holidays.filter(h => h.date === dateStr);
		for (const holiday of dayHolidays) {
			const isRegional = !holiday.global;
			const regionCode = isRegional && holiday.counties && holiday.counties.length > 0 ? holiday.counties[0] : null;
			const regionName = regionCode ? regionCode.split('-')[1] : null;
			const displayText = isRegional && regionName ? `${holiday.localName || holiday.name} (${regionName})` : holiday.localName || holiday.name;

			// Make national holidays slightly more opaque (+4 percentage points)
			const nationalBaseOpacity = 0.53;
			const nationalOpacity = Math.min(1, nationalBaseOpacity + 0.04); // 0.57

			events.push({
				type: 'holiday',
				displayText,
				tooltip: `${holiday.localName || holiday.name}${isRegional ? ' (Regional)' : ' (National)'}`,
				color: '#4cafa0', // Turquoise
				opacity: isRegional ? 0.36 : nationalOpacity,
				data: holiday
			});
		}

		// Add sprint cutoff events (only in debug mode)
		if (debugMode && isSprintEndDay(dayDate)) {
			const endingSprint = getSprintEndingOnDay(dayDate);
			if (endingSprint) {
				const sprintColor = iterationColorMap.get(endingSprint.objectId) || '#8e44ad';
				events.push({
					type: 'sprintCutoff',
					displayText: `${endingSprint.name} cutoff`,
					tooltip: 'Sprint cutoff',
					color: sprintColor,
					opacity: 0.75,
					data: endingSprint
				});
			}
		}

		// Add custom user events
		const dayCustomEvents = customEvents.filter(e => e != null && e.date === dateStr);
		for (const ce of dayCustomEvents) {
			events.push({
				type: 'customEvent',
				displayText: ce.time ? `${ce.time} ${ce.title}` : ce.title,
				tooltip: ce.description || ce.title,
				color: ce.color,
				opacity: 0.85,
				data: ce
			});
		}

		return events;
	};

	// Generate calendar days
	const calendarDays: DayInfo[] = [];
	let dayCounter = 1 - startDay; // Start from previous month

	for (let i = 0; i < totalDays; i++) {
		const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayCounter);
		const isCurrentMonth = dayCounter >= 1 && dayCounter <= lastDay.getDate();
		const isToday = isCurrentMonth && dayCounter === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

		// Check which iterations are active on this day (only from current month iterations)
		const activeIterations = currentMonthIterations.filter(iteration => {
			const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
			const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

			if (!startDate || !endDate) return false;

			// Reset time for date comparison
			startDate.setHours(0, 0, 0, 0);
			endDate.setHours(23, 59, 59, 999);

			return currentDayDate >= startDate && currentDayDate <= endDate;
		});

		// For display, show the actual day number (positive for previous month days)
		let displayDay = dayCounter;
		if (dayCounter < 1) {
			// Previous month: calculate the actual day number
			const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
			displayDay = prevMonthDate.getDate() + dayCounter;
		} else if (dayCounter > lastDay.getDate()) {
			// Next month: calculate the actual day number
			displayDay = dayCounter - lastDay.getDate();
		}

		calendarDays.push({
			day: displayDay,
			date: currentDayDate,
			isCurrentMonth,
			isToday,
			iterations: activeIterations,
			events: getEventsForDay(currentDayDate)
		});

		dayCounter++;
	}

	// Pre-compute consistent iteration slot assignment per week row so that
	// sprint bars stay at the same vertical position across the whole week.
	// Non-overlapping iterations share the same slot (interval scheduling).
	const weekIterationsOrder: { iteration: Iteration; slotIndex: number }[][] = [];
	const numWeeks = Math.ceil(calendarDays.length / 7);
	for (let w = 0; w < numWeeks; w++) {
		const weekDays = calendarDays.slice(w * 7, (w + 1) * 7);
		const iterationSet = new Map<string, Iteration>();
		for (const day of weekDays) {
			for (const iter of day.iterations) {
				if (!iterationSet.has(iter.objectId)) {
					iterationSet.set(iter.objectId, iter);
				}
			}
		}
		// Sort consistently: by start date, then objectId
		const sorted = [...iterationSet.values()].sort((a, b) => {
			const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
			const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
			if (aStart !== bStart) return aStart - bStart;
			return a.objectId.localeCompare(b.objectId);
		});

		// Assign slots using interval scheduling: non-overlapping iterations share a slot
		const slotAssignments: { iteration: Iteration; slotIndex: number }[] = [];
		const slots: Iteration[] = []; // last iteration assigned to each slot
		for (const iter of sorted) {
			// Find the first slot where this iteration does not overlap with the last assigned iteration
			let assignedSlot = -1;
			for (let s = 0; s < slots.length; s++) {
				if (!doIterationsOverlap(slots[s], iter)) {
					assignedSlot = s;
					break;
				}
			}
			if (assignedSlot === -1) {
				assignedSlot = slots.length;
				slots.push(iter);
			} else {
				slots[assignedSlot] = iter;
			}
			slotAssignments.push({ iteration: iter, slotIndex: assignedSlot });
		}
		weekIterationsOrder.push(slotAssignments);
	}

	const goToPreviousMonth = () => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() - 1);
		onMonthChange?.(newDate);
	};

	const goToNextMonth = () => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() + 1);
		onMonthChange?.(newDate);
	};

	const goToCurrentMonth = () => {
		onMonthChange?.(new Date(today.getFullYear(), today.getMonth(), 1));
	};

	// Icon components
	const PreviousMonthIcon = () => (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px', pointerEvents: 'none' }} aria-hidden={true} focusable="false">
			<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
		</svg>
	);

	const NextMonthIcon = () => (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px', pointerEvents: 'none' }} aria-hidden={true} focusable="false">
			<path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
		</svg>
	);

	return (
		<div
			ref={containerRef}
			style={{
				padding: '16px 20px',
				minHeight: '500px',
				transition: 'all 100ms ease'
			}}
		>
			{/* Marquee keyframes — pause 30% at each end, scroll 20% each direction */}
			{marqueeOverflow > 0 && (
				<style>{`
					@keyframes marquee-scroll {
						0%, 30% { transform: translateX(0); }
						50%, 80% { transform: translateX(-${marqueeOverflow}px); }
						100% { transform: translateX(0); }
					}
				`}</style>
			)}

			{/* Welcome message */}
			{!!currentUser && (
				<div
					ref={welcomeRef}
					style={{
						textAlign: 'center',
						padding: '12px 16px',
						backgroundColor: lightTheme ? 'rgba(91, 155, 213, 0.04)' : 'rgba(107, 163, 232, 0.05)',
						borderRadius: '8px',
						border: `1px solid ${lightTheme ? 'rgba(91, 155, 213, 0.12)' : 'rgba(107, 163, 232, 0.14)'}`,
						maxWidth: '700px',
						margin: '0 auto 32px auto'
					}}
				>
					<div style={{ fontSize: '14px', color: themeColors.descriptionForeground, textAlign: 'center' }}>
						Welcome, <span style={{ fontWeight: 'bold', color: 'var(--vscode-foreground)' }}>{getUserFirstName(currentUser)}</span>!
					</div>
					<div
						ref={marqueeContainerRef}
						onClick={rotateMessage}
						style={{
							overflow: 'hidden',
							marginTop: '4px',
							cursor: 'pointer',
							maskImage: marqueeOverflow > 0 ? 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)' : 'none',
							WebkitMaskImage: marqueeOverflow > 0 ? 'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)' : 'none',
							opacity: messageVisible ? 1 : 0,
							transition: 'opacity 240ms ease'
						}}
					>
						<span
							key={marqueeKey}
							ref={marqueeTextRef}
							style={{
								display: 'inline-block',
								fontSize: '12px',
								color: themeColors.descriptionForeground,
								whiteSpace: 'nowrap',
								animation: marqueeOverflow > 0 && pageVisible ? `marquee-scroll ${Math.max(16, marqueeOverflow / 9)}s linear infinite` : 'none',
								transformOrigin: 'left'
							}}
						>
							{messages[currentMessageIndex] || 'Get ready for an amazing sprint!'}
						</span>
					</div>
				</div>
			)}

			<div
				ref={navRef}
				style={{
					marginBottom: '14px',
					display: 'flex',
					alignItems: 'center',
					width: '100%',
					maxWidth: '980px',
					margin: '0 auto 14px auto'
				}}
				onMouseEnter={() => setIsHeaderHovered(true)}
				onMouseLeave={() => setIsHeaderHovered(false)}
			>
				<div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', minWidth: 0 }}>
					<button
						onClick={goToCurrentMonth}
						style={{
							padding: '4px 10px',
							border: 'none',
							outline: 'none',
							backgroundColor: 'transparent',
							color: themeColors.descriptionForeground,
							borderRadius: '4px',
							cursor: 'pointer',
							fontSize: '12px',
							opacity: isHeaderHovered ? 1 : 0,
							pointerEvents: isHeaderHovered ? 'auto' : 'none',
							transition: 'opacity 0.2s ease, background-color 0.2s ease'
						}}
						onMouseEnter={e => {
							e.currentTarget.style.backgroundColor = themeColors.buttonSecondaryBackground;
						}}
						onMouseLeave={e => {
							e.currentTarget.style.backgroundColor = 'transparent';
						}}
						disabled={!onMonthChange}
						title="Go to current month"
					>
						Today
					</button>
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '4px',
						flexShrink: 0
					}}
				>
					<button
						onClick={goToPreviousMonth}
						style={{
							padding: '2px 8px',
							border: 'none',
							outline: 'none',
							backgroundColor: 'transparent',
							color: themeColors.foreground,
							borderRadius: '4px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							transition: 'background-color 0.2s ease'
						}}
						onMouseEnter={e => {
							e.currentTarget.style.backgroundColor = themeColors.buttonSecondaryBackground;
						}}
						onMouseLeave={e => {
							e.currentTarget.style.backgroundColor = 'transparent';
						}}
						disabled={!onMonthChange}
						title="Previous Month"
					>
						<PreviousMonthIcon />
					</button>

					<h2
						style={{
							margin: '0',
							color: themeColors.foreground,
							fontSize: '16.4px',
							fontWeight: '300',
							minWidth: '140px',
							textAlign: 'center'
						}}
					>
						{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
					</h2>

					<button
						onClick={goToNextMonth}
						style={{
							padding: '2px 8px',
							border: 'none',
							outline: 'none',
							backgroundColor: 'transparent',
							color: themeColors.foreground,
							borderRadius: '4px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							transition: 'background-color 0.2s ease'
						}}
						onMouseEnter={e => {
							e.currentTarget.style.backgroundColor = themeColors.buttonSecondaryBackground;
						}}
						onMouseLeave={e => {
							e.currentTarget.style.backgroundColor = 'transparent';
						}}
						disabled={!onMonthChange}
						title="Next Month"
					>
						<NextMonthIcon />
					</button>
				</div>
				<div
					style={{
						flex: 1,
						display: 'flex',
						justifyContent: 'flex-end',
						alignItems: 'center',
						minWidth: 0
					}}
				>
					<button
						onClick={() => openModal(null)}
						style={{
							padding: '4px 10px',
							border: 'none',
							outline: 'none',
							backgroundColor: 'transparent',
							color: themeColors.descriptionForeground,
							borderRadius: '4px',
							cursor: 'pointer',
							fontSize: '12px',
							opacity: isHeaderHovered ? 1 : 0,
							pointerEvents: isHeaderHovered ? 'auto' : 'none',
							transition: 'opacity 0.2s ease, background-color 0.2s ease'
						}}
						onMouseEnter={e => {
							e.currentTarget.style.backgroundColor = themeColors.buttonSecondaryBackground;
						}}
						onMouseLeave={e => {
							e.currentTarget.style.backgroundColor = 'transparent';
						}}
						title="Create new event"
					>
						+ New Event
					</button>
				</div>
			</div>

			{/* Calendar Grid */}
			<div
				ref={calendarGridRef}
				style={{
					display: 'grid',
					gridTemplateColumns: calendarColumnFrs.map(fr => `${fr}fr`).join(' '),
					gap: '1px',
					backgroundColor: themeColors.panelBorder,
					border: `1px solid ${themeColors.panelBorder}`,
					borderRadius: '12px',
					overflow: 'hidden',
					maxWidth: '980px',
					margin: '0 auto'
				}}
			>
				{/* Day headers */}
				{dayNames.map(day => (
					<div
						key={day}
						style={{
							padding: '11px 8px',
							backgroundColor: themeColors.titleBarActiveBackground,
							color: themeColors.titleBarActiveForeground,
							textAlign: 'center',
							fontSize: getDayNumberFontSize(calendarGridWidth) + 'px',
							fontWeight: '600',
							borderBottom: `1px solid ${themeColors.panelBorder}`
						}}
					>
						{day}
					</div>
				))}

				{/* Calendar days */}
				{calendarDays.map((dayInfo, index) => {
					// Determine if this is Saturday (index % 7 === 5) or Sunday (index % 7 === 6)
					const dayOfWeek = index % 7;
					const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
					const isHoveredDay = hoveredDay?.date && hoveredDay.date.getTime() === dayInfo.date.getTime();

					// Set gridColumn for narrower weekends
					const gridColumn = `${dayOfWeek + 1}`;

					return (
						<div
							key={index}
							style={{
								// Use explicit height so all cells keep same vertical size
								height: cellHeight + 'px',
								minHeight: '46px',
								maxHeight: '90px',
								padding: '8px',
								backgroundColor: !dayInfo.isCurrentMonth ? (lightTheme ? 'rgba(230, 230, 230, 0.18)' : 'rgba(0, 0, 0, 0.18)') : isWeekend && dayInfo.isCurrentMonth ? (lightTheme ? 'rgba(200, 200, 200, 0.12)' : 'rgba(0, 0, 0, 0.18)') : lightTheme ? 'rgba(250, 250, 250, 0.6)' : 'transparent',
								color: dayInfo.isCurrentMonth ? themeColors.foreground : themeColors.descriptionForeground,
								borderBottom: index < calendarDays.length - 7 ? '1px solid var(--vscode-panel-border)' : 'none',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								justifyContent: 'flex-start',
								fontSize: '14px',
								fontWeight: '400',
								cursor: 'pointer',
								transition: 'background-color 0.2s ease',
								position: 'relative',
								overflow: 'visible',
								gridColumn: gridColumn
							}}
							onMouseEnter={e => {
								setHoveredDay(dayInfo);
								setMousePosition({ x: e.clientX, y: e.clientY });
								e.currentTarget.style.backgroundColor = lightTheme ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)';
							}}
							onMouseMove={e => {
								setMousePosition({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={e => {
								// Only clear hoveredDay if we're not over a sprint bar (check if hoveredIteration is set)
								if (!hoveredIteration) {
									setHoveredDay(null);
								}
								const dayOfWeek = index % 7;
								const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
								e.currentTarget.style.backgroundColor = !dayInfo.isCurrentMonth
									? lightTheme
										? 'rgba(230, 230, 230, 0.18)'
										: 'rgba(0, 0, 0, 0.18)'
									: isWeekend && dayInfo.isCurrentMonth
										? lightTheme
											? 'rgba(200, 200, 200, 0.12)'
											: 'rgba(0, 0, 0, 0.18)'
										: lightTheme
											? 'rgba(250, 250, 250, 0.6)'
											: 'transparent';
							}}
						>
							<span
								style={{
									fontSize: getDayNumberFontSize(calendarGridWidth) + 'px',
									fontWeight: '200',
									marginBottom: '4px',
									opacity: dayInfo.isCurrentMonth ? 1 : 0.4,
									color: dayInfo.isCurrentMonth ? themeColors.foreground : themeColors.descriptionForeground,
									...(dayInfo.isToday
										? {
												backgroundColor: 'rgba(33, 150, 243, 0.85)',
												color: '#ffffff',
												borderRadius: '50%',
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												minWidth: getDayNumberFontSize(calendarGridWidth) * 1.8 + 'px',
												height: getDayNumberFontSize(calendarGridWidth) * 1.8 + 'px',
												fontWeight: '500'
											}
										: {})
								}}
							>
								{dayInfo.day}
							</span>
							{/* Show stacked day events (holidays, sprint cutoffs, etc) at top of cell */}
							{!isNarrowViewport && dayInfo.isCurrentMonth && dayInfo.events.length > 0 && (
								<div
									style={{
										position: 'absolute',
										top: getEventTopMargin(calendarGridWidth) + 'px',
										left: '0',
										right: '0',
										display: 'flex',
										flexDirection: 'column',
										gap: '1px',
										pointerEvents: 'none',
										zIndex: 2,
										paddingBottom: '10px' // Leave space for sprint color bars
									}}
								>
									{dayInfo.events.slice(0, 3).map((event, idx) => {
										// Convert color to RGBA
										const colorRgb = event.color.startsWith('#')
											? event.color
													.match(/[A-Za-z0-9]{2}/g)
													?.map(x => parseInt(x, 16))
													.join(',') || '76,175,160'
											: event.color;
										const isCustomEvent = event.type === 'customEvent';
										return (
											<div
												key={idx}
												onClick={
													isCustomEvent
														? e => {
																e.stopPropagation();
																openModal(event.data as CustomCalendarEvent);
															}
														: undefined
												}
												style={{
													backgroundColor: `rgba(${colorRgb}, ${event.opacity})`,
													color: 'white',
													fontSize: '10px',
													fontWeight: 'normal',
													padding: '3px 4px',
													marginLeft: '2px',
													marginRight: '2px',
													overflow: 'hidden',
													lineHeight: '1.2',
													borderRadius: '3px',
													maxHeight: '2.4em', // allow up to 2 lines
													display: '-webkit-box',
													WebkitBoxOrient: 'vertical',
													WebkitLineClamp: 2,
													whiteSpace: 'normal',
													wordBreak: 'break-word',
													pointerEvents: isCustomEvent ? 'auto' : 'none',
													cursor: isCustomEvent ? 'pointer' : 'default'
												}}
												title={event.tooltip}
											>
												{event.displayText}
											</div>
										);
									})}
									{dayInfo.events.length > 3 && (
										<div
											style={{
												fontSize: '9px',
												color: 'rgba(100, 100, 100, 0.8)',
												padding: '1px 4px',
												marginLeft: '2px',
												marginRight: '2px'
											}}
										>
											+{dayInfo.events.length - 3} más
										</div>
									)}
								</div>
							)}
							{/* Show iteration indicator lines with consistent vertical order per week */}
							{(() => {
								const weekIndex = Math.floor(index / 7);
								const weekIters = weekIterationsOrder[weekIndex] || [];
								if (weekIters.length === 0) return null;
								const activeIds = new Set(dayInfo.iterations.map(i => i.objectId));
								return (
									<div
										style={{
											position: 'absolute',
											bottom: '0',
											left: '-1px',
											right: '-1px',
											display: 'flex',
											flexDirection: 'column',
											gap: '1px',
											zIndex: 1
										}}
										title={dayInfo.iterations.map(iter => `${iter.name} (${iter.state})`).join(', ')}
									>
										{(() => {
											// Build a map from slotIndex -> assignment for active iterations in this day
											const slotMap = new Map<number, (typeof weekIters)[0]>();
											for (const assignment of weekIters) {
												if (activeIds.has(assignment.iteration.objectId)) {
													slotMap.set(assignment.slotIndex, assignment);
												}
											}
											const numSlots = weekIters.length > 0 ? Math.max(...weekIters.map(a => a.slotIndex)) + 1 : 0;
											const stagger = 14;
											const cellDuration = 28;
											const animDelay = index * stagger;
											const dayDate = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), dayInfo.date.getDate());
											dayDate.setHours(0, 0, 0, 0);

											return Array.from({ length: numSlots }, (_, slotIdx) => {
												const assignment = slotMap.get(slotIdx);
												if (!assignment) {
													return (
														<div
															key={`slot-${slotIdx}`}
															style={{
																height: getSprintBarHeight(calendarGridWidth) + 'px',
																backgroundColor: 'transparent'
															}}
														/>
													);
												}
												const { iteration } = assignment;
												const iterationStartDate = iteration.startDate ? new Date(iteration.startDate) : null;
												const iterationEndDate = iteration.endDate ? new Date(iteration.endDate) : null;
												if (iterationStartDate) iterationStartDate.setHours(0, 0, 0, 0);
												if (iterationEndDate) iterationEndDate.setHours(0, 0, 0, 0);
												const isFirstDay = iterationStartDate && dayDate.getTime() === iterationStartDate.getTime();
												const isLastDay = iterationEndDate && dayDate.getTime() === iterationEndDate.getTime();
												return (
													<div
														key={iteration.objectId}
														style={{
															height: getSprintBarHeight(calendarGridWidth) + 'px',
															backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
															filter: lightTheme ? 'saturate(77%) brightness(162%) contrast(87%)' : 'saturate(72%) brightness(79%) contrast(90%)',
															opacity: sprintBarsAnimated ? 1 : 0,
															transform: sprintBarsAnimated ? 'scaleX(1)' : 'scaleX(0)',
															transformOrigin: 'left center',
															transition: sprintBarsTransition ? `transform ${cellDuration}ms linear ${animDelay}ms, opacity ${cellDuration}ms linear ${animDelay}ms` : 'none',
															borderTopLeftRadius: isFirstDay ? '4px' : '0',
															borderBottomLeftRadius: isFirstDay ? '4px' : '0',
															borderTopRightRadius: isLastDay ? '4px' : '0',
															borderBottomRightRadius: isLastDay ? '4px' : '0',
															marginLeft: isFirstDay ? '1px' : '-0.5px',
															marginRight: isLastDay ? '1px' : '-0.5px',
															cursor: 'pointer'
														}}
														onMouseEnter={e => {
															setHoveredIteration(iteration);
															setMousePosition({ x: e.clientX, y: e.clientY });
															setHoveredDay(null);
														}}
														onMouseMove={e => {
															setMousePosition({ x: e.clientX, y: e.clientY });
														}}
														onMouseLeave={e => {
															setHoveredIteration(null);
															setHoveredDay(dayInfo);
															setMousePosition({ x: e.clientX, y: e.clientY });
														}}
													/>
												);
											});
										})()}
									</div>
								);
							})()}
						</div>
					);
				})}
			</div>

			{/* Legend - show all iteration legends for any month */}
			{orderedIterations.length > 0 && (
				<div
					ref={legendRef}
					style={{
						maxWidth: '800px',
						margin: '24px auto 0 auto',
						display: 'flex',
						justifyContent: 'flex-end'
					}}
				>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'minmax(0, 1fr) 140px',
							columnGap: '10px',
							rowGap: '9px', // increased spacing between legend rows by 1px
							alignItems: 'center',
							width: '100%',
							fontSize: '12px',
							color: themeColors.descriptionForeground
						}}
					>
						{/* Show iteration legends dynamically for any month */}
						{orderedIterations.map(iteration => (
							<div key={iteration.objectId} style={{ display: 'contents' }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', minWidth: 0 }}>
									<div
										style={{
											width: '7px',
											height: '7px',
											borderRadius: '50%',
											backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
											opacity: 0.9,
											flexShrink: 0
										}}
									></div>
									<span
										style={{
											textAlign: 'right',
											cursor: onIterationClick ? 'pointer' : 'default',
											color: themeColors.foreground,
											textDecoration: 'none',
											fontSize: '12px',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis'
										}}
										onClick={() => onIterationClick?.(iteration)}
									>
										{iteration.name}
									</span>
								</div>
								<div
									style={{
										position: 'relative',
										width: '140px',
										height: '6px',
										borderRadius: '999px',
										backgroundColor: lightTheme ? '#e0e0e0' : '#404040',
										overflow: 'hidden',
										flexShrink: 0
									}}
								>
									{(() => {
										const baseColor = iterationColorMap.get(iteration.objectId) || '#2196f3';
										const endColor = addRedToColor(baseColor, 120);
										return (
											<div
												style={{
													width: sprintBarsAnimated ? `${getIterationProgress(iteration)}%` : '0%',
													height: '100%',
													backgroundImage: `linear-gradient(90deg, ${baseColor}, ${endColor})`,
													borderRadius: '999px',
													filter: lightTheme ? 'saturate(77%) brightness(162%) contrast(87%)' : 'saturate(72%) brightness(79%) contrast(90%)',
													transition: sprintBarsTransition ? 'width 800ms cubic-bezier(0.22, 0.61, 0.36, 1) 200ms' : 'none'
												}}
											/>
										);
									})()}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
			{(hoveredDay || hoveredIteration) &&
				(() => {
					const tooltipOffset = 10;
					const wouldClip = mousePosition.x + tooltipOffset + 200 > window.innerWidth;
					const tooltipPos = wouldClip ? { right: window.innerWidth - mousePosition.x + tooltipOffset, left: undefined } : { left: mousePosition.x + tooltipOffset, right: undefined };
					const tooltipStyle = {
						position: 'fixed' as const,
						...tooltipPos,
						top: mousePosition.y - 30,
						backgroundColor: 'var(--vscode-quickInput-background)',
						color: 'var(--vscode-quickInput-foreground)',
						border: '1px solid var(--vscode-panel-border)',
						borderRadius: '4px',
						padding: '6px 10px',
						fontSize: '12px',
						pointerEvents: 'none' as const,
						zIndex: 1000,
						boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
						maxWidth: '200px',
						wordWrap: 'break-word' as const
					};

					if (hoveredIteration) {
						const iterStart = hoveredIteration.startDate ? new Date(hoveredIteration.startDate) : null;
						const iterEnd = hoveredIteration.endDate ? new Date(hoveredIteration.endDate) : null;
						const iterDays = iterStart && iterEnd ? Math.round((iterEnd.getTime() - iterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1 : null;
						const iterHours = getIterationHours(hoveredIteration);
						const monthNames3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
						const fmtDate = (d: Date) => `${d.getDate()} ${monthNames3[d.getMonth()]}`;
						const iterDetail = iterStart && iterEnd && iterDays !== null ? `${fmtDate(iterStart)} to ${fmtDate(iterEnd)}${iterHours > 0 ? `: ${iterHours}h` : ''}` : null;
						return (
							<div style={tooltipStyle}>
								<div style={{ fontWeight: '600', marginBottom: iterDetail ? '4px' : '0', fontSize: '13px' }}>{hoveredIteration.name}</div>
								{iterDetail && <div style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>{iterDetail}</div>}
							</div>
						);
					}

					const tooltip = getDayTooltip(hoveredDay!);
					return (
						<div style={tooltipStyle}>
							<div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>{tooltip.title}</div>
							<div style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>{tooltip.content}</div>
						</div>
					);
				})()}
			{/* Custom Event Modal */}
			{modalOpen && (
				<div
					onClick={closeModal}
					onTransitionEnd={handleModalTransitionEnd}
					style={{
						position: 'fixed',
						inset: 0,
						backgroundColor: 'rgba(0,0,0,0.45)',
						backdropFilter: 'blur(1.4px)',
						WebkitBackdropFilter: 'blur(1.4px)',
						zIndex: 9999,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						opacity: modalClosing ? 0 : modalEntered ? 1 : 0,
						transition: `opacity ${modalTransitionMs}ms ease`
					}}
				>
					<div
						onClick={e => e.stopPropagation()}
						style={{
							backgroundColor: 'var(--vscode-editor-background)',
							border: '1px solid var(--vscode-panel-border)',
							borderRadius: '8px',
							padding: '24px',
							width: '360px',
							maxWidth: '90vw',
							display: 'flex',
							flexDirection: 'column',
							gap: '14px',
							boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
							opacity: modalClosing ? 0 : modalEntered ? 1 : 0,
							transform: modalClosing ? 'translateY(-12px) scale(0.96)' : modalEntered ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.96)',
							transition: `opacity ${modalTransitionMs}ms ease, transform ${modalTransitionMs}ms ease`
						}}
					>
						<h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: themeColors.foreground }}>{editingEvent ? 'Edit Event' : 'New Event'}</h3>

						{/* Date + Time row */}
						<div style={{ display: 'flex', gap: '10px' }}>
							<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
								<label style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>Date *</label>
								<input
									type="date"
									value={modalForm.date}
									onChange={e => setModalForm(f => ({ ...f, date: e.target.value }))}
									style={{
										background: 'var(--vscode-input-background)',
										color: 'var(--vscode-input-foreground)',
										border: '1px solid var(--vscode-input-border, var(--vscode-panel-border))',
										borderRadius: '4px',
										padding: '5px 8px',
										fontSize: '12px',
										width: '100%',
										boxSizing: 'border-box',
										colorScheme: 'dark'
									}}
								/>
							</div>
							<div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
								<label style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>Time (optional)</label>
								<input
									type="time"
									value={modalForm.time}
									onChange={e => setModalForm(f => ({ ...f, time: e.target.value }))}
									style={{
										background: 'var(--vscode-input-background)',
										color: 'var(--vscode-input-foreground)',
										border: '1px solid var(--vscode-input-border, var(--vscode-panel-border))',
										borderRadius: '4px',
										padding: '5px 8px',
										fontSize: '12px',
										width: '100%',
										boxSizing: 'border-box',
										colorScheme: 'dark'
									}}
								/>
							</div>
						</div>

						{/* Title */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
							<label style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>Title *</label>
							<input
								type="text"
								value={modalForm.title}
								onChange={e => setModalForm(f => ({ ...f, title: e.target.value }))}
								placeholder="Event title"
								style={{
									background: 'var(--vscode-input-background)',
									color: 'var(--vscode-input-foreground)',
									border: '1px solid var(--vscode-input-border, var(--vscode-panel-border))',
									borderRadius: '4px',
									padding: '5px 8px',
									fontSize: '12px',
									width: '100%',
									boxSizing: 'border-box'
								}}
							/>
						</div>

						{/* Description */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
							<label style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>Description (shown on hover)</label>
							<textarea
								value={modalForm.description}
								onChange={e => setModalForm(f => ({ ...f, description: e.target.value }))}
								placeholder="Optional description..."
								rows={3}
								style={{
									background: 'var(--vscode-input-background)',
									color: 'var(--vscode-input-foreground)',
									border: '1px solid var(--vscode-input-border, var(--vscode-panel-border))',
									borderRadius: '4px',
									padding: '5px 8px',
									fontSize: '12px',
									width: '100%',
									boxSizing: 'border-box',
									resize: 'vertical',
									fontFamily: 'inherit'
								}}
							/>
						</div>

						{/* Color */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>Color</label>
							<div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
								{PRESET_COLORS.map(c => (
									<button
										key={c}
										onClick={() => setModalForm(f => ({ ...f, color: c }))}
										style={{
											width: '22px',
											height: '22px',
											borderRadius: '50%',
											backgroundColor: c,
											border: modalForm.color === c ? '2px solid var(--vscode-focusBorder)' : '2px solid transparent',
											cursor: 'pointer',
											outline: 'none',
											padding: 0,
											flexShrink: 0
										}}
										title={c}
									/>
								))}
								<input type="color" value={modalForm.color} onChange={e => setModalForm(f => ({ ...f, color: e.target.value }))} style={{ width: '22px', height: '22px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }} title="Custom color" />
							</div>
						</div>

						{/* Action buttons */}
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
							<div>
								{editingEvent && (
									<button
										onClick={deleteModal}
										style={{
											padding: '6px 14px',
											borderRadius: '4px',
											border: 'none',
											cursor: 'pointer',
											backgroundColor: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)',
											color: 'var(--vscode-errorForeground, #f48771)',
											fontSize: '12px'
										}}
									>
										Delete
									</button>
								)}
							</div>
							<div style={{ display: 'flex', gap: '8px' }}>
								<button
									onClick={closeModal}
									style={{
										padding: '6px 14px',
										borderRadius: '4px',
										border: '1px solid var(--vscode-panel-border)',
										cursor: 'pointer',
										backgroundColor: 'transparent',
										color: themeColors.foreground,
										fontSize: '12px'
									}}
								>
									Cancel
								</button>
								<button
									onClick={saveModal}
									disabled={!modalForm.title.trim() || !modalForm.date}
									style={{
										padding: '6px 14px',
										borderRadius: '4px',
										border: 'none',
										cursor: !modalForm.title.trim() || !modalForm.date ? 'not-allowed' : 'pointer',
										backgroundColor: 'var(--vscode-button-background)',
										color: 'var(--vscode-button-foreground)',
										fontSize: '12px',
										opacity: !modalForm.title.trim() || !modalForm.date ? 0.5 : 1
									}}
								>
									Save
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Calendar;
