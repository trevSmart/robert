import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { themeColors, isLightTheme } from '../../utils/themeColors';
import type { Holiday, DayEvent } from '../../../types/utils';
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
}

const Calendar: React.FC<CalendarProps> = ({ currentDate = new Date(), iterations = [], userStories = [], onMonthChange, debugMode = false, currentUser, holidays = [], onIterationClick }) => {
	const today = new Date();
	const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

	const [hoveredDay, setHoveredDay] = useState<DayInfo | null>(null);
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
		const min = 3; // px
		const max = 9; // px
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
	const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
	const [messages, setMessages] = useState<string[]>([]);

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
		let daysUntilSprintEnd = null;
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
			daysUntilSprintEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
			daysUntilSprintEnd && daysUntilSprintEnd > 0 ? (daysUntilSprintEnd === 1 ? `You've got 1 day left before sprint cutoff! 🏁` : `Sprint cutoff in ${daysUntilSprintEnd} days. Keep pushing! 🚀`) : `Stay focused on your current sprint objectives! 💪`,

			// 2) Hours summary (use totalHours computed from user stories)
			totalHours > 0 ? `${totalHours}h total this month. ${hoursCompletionPercentage}% done! ${remainingHours}h left. 💪` : `No work scheduled this month. That's rare! 🤔`,

			// 3) Holidays summary
			holidaysThisMonth > 0 ? (holidaysThisMonth === 1 ? `Fun fact: There's 1 holiday this month. Plan accordingly! 🎉` : `Heads up: ${holidaysThisMonth} holidays this month. Time management is key! 🎉`) : `No holidays scheduled this month—time to ship! 🎯`,

			// 4) Progress / short-timers: prefer sprint-based remaining days; otherwise month-based message without implying sprint
			blockedUS > 0
				? `${blockedUS} blocked ${blockedUS === 1 ? 'story' : 'stories'} this month. Time to unblock! 🚨`
				: completedUS > 0
					? `You've completed ${completedUS} ${completedUS === 1 ? 'story' : 'stories'}! ${pendingUS} more to go. 🎯`
					: daysUntilSprintEnd && daysUntilSprintEnd > 0 && daysUntilSprintEnd <= 7
						? daysUntilSprintEnd === 1
							? `Only 1 day left in the sprint. Final push! ⏰`
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

		setMessages(generatedMessages);

		// Set up interval to rotate messages every 20 seconds with a quick fade
		let changeTimeout: ReturnType<typeof setTimeout> | null = null;
		const interval = setInterval(() => {
			if (messageAnimatingRef.current) return; // avoid overlapping anims
			messageAnimatingRef.current = true;
			// fade out
			setMessageVisible(false);
			// after fade-out, advance the message and fade in
			changeTimeout = setTimeout(() => {
				setCurrentMessageIndex(prev => (prev + 1) % generatedMessages.length);
				setMessageVisible(true);
				// clear animating flag after fade-in completes
				setTimeout(() => {
					messageAnimatingRef.current = false;
				}, 260);
			}, 240);
		}, 20000);

		return () => {
			clearInterval(interval);
			if (changeTimeout) clearTimeout(changeTimeout);
		};
	}, [currentDate, iterations, userStories, holidays, todayStart.getTime()]);

	// Visibility state for fade animation
	const [messageVisible, setMessageVisible] = useState(true);
	const messageAnimatingRef = useRef(false);

	// Helper to extract iteration id from a user story (robust to shapes)
	const getIterationId = (us: any) => {
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

	// Rotate message on user click (with fade)
	const rotateMessage = () => {
		if (messageAnimatingRef.current || messages.length === 0) return;
		messageAnimatingRef.current = true;
		setMessageVisible(false);
		setTimeout(() => {
			setCurrentMessageIndex(prev => (prev + 1) % messages.length);
			setMessageVisible(true);
			setTimeout(() => {
				messageAnimatingRef.current = false;
			}, 260);
		}, 240);
	};

	const isNarrowViewport = windowWidth < 465;

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
			content = '1 day left';
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

	// Iteration colors - cycle through these colors in order
	// Darker colors for light theme, brighter for dark theme
	// Excluded turquoise/green colors to avoid confusion with holiday events (#4cafa0)
	const lightTheme = isLightTheme();
	const iterationColors = lightTheme
		? ['#d9a500', '#8b5fbf', '#6a8c3a', '#b868c9', '#c77830', '#1e7fa8', '#d97a3f', '#2d7a7f', '#c9354b', '#8a684e', '#a35a8f', '#d97f3f']
		: ['#ffb627', '#d4a5ff', '#f6cf71', '#dcb0f2', '#f4a261', '#4ecdc4', '#ff6b6b', '#6ec9d9', '#f89c75', '#a8dadc', '#f9b384', '#e0d1f7'];

	// Helper function to check if iteration overlaps with current month
	const doesIterationOverlapMonth = (iteration: Iteration) => {
		const startDate = iteration.startDate ? new Date(iteration.startDate) : null;
		const endDate = iteration.endDate ? new Date(iteration.endDate) : null;

		if (!startDate || !endDate) return false;

		// Check if iteration overlaps with current month
		const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

		// Reset time for date comparison
		startDate.setHours(0, 0, 0, 0);
		endDate.setHours(23, 59, 59, 999);
		monthStart.setHours(0, 0, 0, 0);
		monthEnd.setHours(23, 59, 59, 999);

		// Check for overlap: iteration starts before month ends AND iteration ends after month starts
		return startDate <= monthEnd && endDate >= monthStart;
	};

	// Filter iterations that overlap with current month
	const currentMonthIterations = iterations.filter(doesIterationOverlapMonth);

	// Assign colors deterministically across all iterations for cross-month consistency
	const orderedAllIterations = [...iterations].sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		if (aStart !== bStart) return aStart - bStart;
		// When start dates are equal, use objectId for deterministic ordering (no alphabetical fallback)
		return a.objectId.localeCompare(b.objectId);
	});

	const iterationColorMap = new Map<string, string>();
	orderedAllIterations.forEach((iteration, index) => {
		iterationColorMap.set(iteration.objectId, iterationColors[index % iterationColors.length]);
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

		return events;
	};

	// Generate calendar days
	const calendarDays = [];
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

		calendarDays.push({
			day: dayCounter,
			date: currentDayDate,
			isCurrentMonth,
			isToday,
			iterations: activeIterations,
			events: getEventsForDay(currentDayDate)
		});

		dayCounter++;
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

	// Icon components
	const PreviousMonthIcon = () => (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '20px', height: '20px', pointerEvents: 'none' }} aria-hidden={true} focusable="false">
			<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
		</svg>
	);

	const NextMonthIcon = () => (
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '20px', height: '20px', pointerEvents: 'none' }} aria-hidden={true} focusable="false">
			<path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
		</svg>
	);

	return (
		<div
			ref={containerRef}
			style={{
				padding: '16px 0',
				// backgroundColor: themeColors.background,
				minHeight: '500px',
				transition: 'all 100ms ease'
			}}
		>
			{/* Welcome message */}
			{currentUser && (
				<div
					ref={welcomeRef}
					style={{
						textAlign: 'center',
						marginBottom: '16px',
						padding: '12px',
						backgroundColor: themeColors.panelBackground,
						borderRadius: '8px',
						border: `1px solid ${themeColors.panelBorder}`,
						maxWidth: '700px',
						margin: '0 auto 23px auto'
					}}
				>
					<div style={{ fontSize: '14px', color: themeColors.descriptionForeground }}>
						Welcome, <span style={{ fontWeight: 'bold', color: 'var(--vscode-foreground)' }}>{getUserFirstName(currentUser)}</span>!
					</div>
					<div
						onClick={rotateMessage}
						style={{
							fontSize: '12px',
							color: themeColors.descriptionForeground,
							marginTop: '4px',
							opacity: messageVisible ? 1 : 0,
							transition: 'opacity 240ms ease',
							cursor: 'pointer'
						}}
					>
						{messages[currentMessageIndex] || 'Get ready for an amazing sprint!'}
					</div>
				</div>
			)}

			<div
				ref={navRef}
				style={{
					marginBottom: '14px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				}}
			>
				<button
					onClick={goToPreviousMonth}
					style={{
						padding: '8px 12px',
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
						fontSize: '17.4px',
						fontWeight: '300',
						minWidth: '14	0px',
						textAlign: 'center'
					}}
				>
					{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
				</h2>

				<button
					onClick={goToNextMonth}
					style={{
						padding: '8px 12px',
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
					margin: '0 auto',
					padding: '0 14px'
				}}
			>
				{/* Day headers */}
				{dayNames.map(day => (
					<div
						key={day}
						style={{
							padding: '12px 8px',
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
								backgroundColor: dayInfo.isToday
									? 'rgba(33, 150, 243, 0.3)'
									: !dayInfo.isCurrentMonth
										? lightTheme
											? 'rgba(230, 230, 230, 0.18)'
											: 'rgba(0, 0, 0, 0.18)'
										: isWeekend && dayInfo.isCurrentMonth
											? lightTheme
												? 'rgba(200, 200, 200, 0.12)'
												: 'rgba(0, 0, 0, 0.18)'
											: lightTheme
												? 'rgba(250, 250, 250, 0.6)'
												: 'transparent',
								color: dayInfo.isToday ? themeColors.listActiveSelectionForeground : dayInfo.isCurrentMonth ? themeColors.foreground : themeColors.descriptionForeground,
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
								overflow: 'hidden',
								gridColumn: gridColumn
							}}
							onMouseEnter={e => {
								setHoveredDay(dayInfo);
								setMousePosition({ x: e.clientX, y: e.clientY });
								if (!dayInfo.isToday) {
									e.currentTarget.style.backgroundColor = lightTheme ? 'rgba(255, 255, 255, 0.25)' : themeColors.listHoverBackground;
								}
							}}
							onMouseMove={e => {
								setMousePosition({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={e => {
								setHoveredDay(null);
								if (!dayInfo.isToday) {
									const dayOfWeek = index % 7;
									const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
									e.currentTarget.style.backgroundColor = !dayInfo.isCurrentMonth
										? lightTheme
											? 'rgba(230, 230, 230, 0.08)'
											: 'rgba(0, 0, 0, 0.18)'
										: isWeekend && dayInfo.isCurrentMonth
											? lightTheme
												? 'rgba(200, 200, 200, 0.12)'
												: 'rgba(0, 0, 0, 0.18)'
											: lightTheme
												? 'rgba(250, 250, 250, 0.6)'
												: 'transparent';
								}
							}}
						>
							<span
								style={{
									fontSize: getDayNumberFontSize(calendarGridWidth) + 'px',
									fontWeight: '200',
									marginBottom: '4px',
									opacity: dayInfo.isCurrentMonth ? 1 : 0.4,
									color: dayInfo.isCurrentMonth ? (dayInfo.isToday ? themeColors.listActiveSelectionForeground : themeColors.foreground) : themeColors.descriptionForeground
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
										return (
											<div
												key={idx}
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
													wordBreak: 'break-word'
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
							{/* Show iteration indicator lines */}
							{dayInfo.iterations.length > 0 && (
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
									{/* Show up to 2 iteration lines with assigned colors */}
									{dayInfo.iterations.slice(0, 2).map(iteration => {
										const iterationStartDate = iteration.startDate ? new Date(iteration.startDate) : null;
										const iterationEndDate = iteration.endDate ? new Date(iteration.endDate) : null;

										if (iterationStartDate) iterationStartDate.setHours(0, 0, 0, 0);
										if (iterationEndDate) iterationEndDate.setHours(0, 0, 0, 0);

										const dayDate = new Date(dayInfo.date.getFullYear(), dayInfo.date.getMonth(), dayInfo.date.getDate());
										dayDate.setHours(0, 0, 0, 0);

										const isFirstDay = iterationStartDate && dayDate.getTime() === iterationStartDate.getTime();
										const isLastDay = iterationEndDate && dayDate.getTime() === iterationEndDate.getTime();

										return (
											<div
												key={iteration.objectId}
												style={{
													height: getSprintBarHeight(calendarGridWidth) + 'px',
													backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
													filter: lightTheme ? 'saturate(68%) brightness(170%) contrast(85%)' : 'saturate(58%) brightness(70%) contrast(85%)',
													opacity: 1,
													transition: 'opacity 0.2s ease',
													borderTopLeftRadius: isFirstDay ? '4px' : '0',
													borderBottomLeftRadius: isFirstDay ? '4px' : '0',
													borderTopRightRadius: isLastDay ? '4px' : '0',
													borderBottomRightRadius: isLastDay ? '4px' : '0',
													marginLeft: isFirstDay ? '1px' : '0',
													marginRight: isLastDay ? '2px' : '0'
												}}
											/>
										);
									})}
								</div>
							)}
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
											width: '20px',
											height: '5px',
											backgroundColor: iterationColorMap.get(iteration.objectId) || 'var(--vscode-progressBar-background)',
											opacity: 0.9,
											flexShrink: 0
										}}
									></div>
									<span
										style={{
											textAlign: 'right',
											cursor: onIterationClick ? 'pointer' : 'default',
											color: onIterationClick ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-foreground)',
											textDecoration: 'none',
											fontSize: '12px',
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis'
										}}
										onClick={() => onIterationClick?.(iteration)}
										title={onIterationClick ? `Click to view user stories for ${iteration.name}` : undefined}
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
									title="Iteration progress"
								>
									{(() => {
										const baseColor = iterationColorMap.get(iteration.objectId) || '#2196f3';
										const endColor = addRedToColor(baseColor, 120);
										return (
											<div
												style={{
													width: `${getIterationProgress(iteration)}%`,
													height: '100%',
													backgroundImage: `linear-gradient(90deg, ${baseColor}, ${endColor})`,
													borderRadius: '999px'
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
			{hoveredDay &&
				(() => {
					const tooltip = getDayTooltip(hoveredDay);
					return (
						<div
							style={{
								position: 'fixed',
								left: mousePosition.x + 10,
								top: mousePosition.y - 30,
								backgroundColor: 'var(--vscode-quickInput-background)',
								color: 'var(--vscode-quickInput-foreground)',
								border: '1px solid var(--vscode-panel-border)',
								borderRadius: '4px',
								padding: '6px 10px',
								fontSize: '12px',
								pointerEvents: 'none',
								zIndex: 1000,
								boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
								maxWidth: '200px',
								wordWrap: 'break-word'
							}}
						>
							<div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '13px' }}>{tooltip.title}</div>
							<div style={{ fontSize: '11px', color: themeColors.descriptionForeground }}>{tooltip.content}</div>
						</div>
					);
				})()}
		</div>
	);
};

export default Calendar;
