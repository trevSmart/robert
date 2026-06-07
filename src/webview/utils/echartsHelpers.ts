import * as echarts from 'echarts';
import type { EChartsOption, SetOptionOpts } from 'echarts';

export function initChart(container: HTMLElement): echarts.ECharts {
	const existing = echarts.getInstanceByDom(container);
	if (existing) {
		disposeChart(existing);
	}
	return echarts.init(container);
}

export function disposeChart(chart: echarts.ECharts | null | undefined): void {
	if (!chart || chart.isDisposed()) {
		return;
	}

	try {
		chart.dispatchAction({ type: 'hideTip' });
	} catch {
		// Chart may already be mid-disposal.
	}

	chart.dispose();
}

export function setChartOption(chart: echarts.ECharts, option: EChartsOption, opts?: SetOptionOpts): void {
	if (chart.isDisposed()) {
		return;
	}

	try {
		chart.dispatchAction({ type: 'hideTip' });
	} catch {
		// Tooltip may not be initialized yet.
	}

	chart.setOption(option, opts);
}
