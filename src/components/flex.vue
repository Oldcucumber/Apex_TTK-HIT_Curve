<script>
import * as echarts from 'echarts';
import { markRaw } from 'vue';
import weapon_stats from '@/data/flex.js';

const DEFAULT_OPTIONS = {
    backgroundColor: '#212121',
    grid: {
        top: '40px',
        right: '40px',
        bottom: '90px',
        left: '100px',
        containLabel: false
    },
    tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(33, 33, 33, 0.9)',
        borderColor: '#50BBAA',
        borderWidth: 1,
        textStyle: { color: '#fff' },
        formatter: (params) => {
            if (!params || !params.length) return '';
            const item = params[0];
            const { name, value, seriesName } = item;
            return `<div style='font-weight:bold;'>${seriesName} - ${name}</div>
                <div style='padding-left:18px;'>数值: <span style='font-weight:bold;'>${value}</span></div>`;
        }
    },
    legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 20,
        top: 60,
        bottom: 60,
        textStyle: {
            fontSize: 14,
            color: '#fff'
        },
    },
    xAxis: {
        type: 'category',
        name: '武器',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { fontSize: 16, color: '#ccc' },
        axisLabel: { color: '#ccc', rotate: 30 },
        splitLine: { lineStyle: { color: '#444' } },
    },
    yAxis: {
        type: 'value',
        name: '数值',
        nameLocation: 'middle',
        nameGap: 55,
        nameTextStyle: { fontSize: 16, color: '#ccc' },
        axisLabel: { color: '#ccc' },
        splitLine: { lineStyle: { color: '#444' } },
    },
    dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 10, height: 25 },
    ],
};

export default {
    data() {
        return {
            chartInstance: null,
            stats: weapon_stats,
            categories: [],
            filter: {},
            ALL: true,
            activeKey: '空仓换弹时间', // 当前选中的数据项
            chartDirection: 'horizontal', // horizontal:天梯模式（横向柱状图，y轴为武器），vertical:纵向柱状图
        };
    },
    mounted() {
    this.chartDirection = 'horizontal'; // 强制天梯模式
        this.initCategoriesAndFilter();
        this.initChart();
    this.updateChartSeries([]); // 初始渲染横向柱状图
        window.addEventListener('resize', this.resizeChart);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.resizeChart);
        if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null;
        }
    },
    methods: {
        initChart() {
            const chartDom = this.$refs.chartContainer;
            this.chartInstance = markRaw(echarts.init(chartDom, 'dark'));
            this.updateChartSeries([]);
        },
        formatChartData(selectedCategories = []) {
            const categoriesToProcess = selectedCategories.length > 0 ? selectedCategories : this.categories;
            let weapons = [];
            for (const category of categoriesToProcess) {
                if (this.stats[category]) {
                    for (const weapon in this.stats[category]) {
                        const statObj = this.stats[category][weapon];
                        let data = { weapon };
                        // 兼容举镜移速为对象的情况
                        let aim = statObj["移速"] && statObj["移速"]["举镜移速"];
                        if (typeof aim === 'object') {
                            aim = aim["开镜"] ?? Object.values(aim)[0];
                        }
                        data["切枪"] = statObj["战术"] ? statObj["战术"]["切枪"] ?? null : null;
                        data["空仓换弹时间"] = statObj["战术"] ? statObj["战术"]["空仓换弹时间"] ?? statObj["战术"]["战术弹换时间"] ?? null : null;
                        data["腰射移速"] = statObj["移速"] ? statObj["移速"]["腰射移速"] ?? null : null;
                        data["举镜移速"] = aim ?? null;
                        weapons.push(data);
                    }
                }
            }
            // 排序
            let sortKey = this.activeKey;
            if (sortKey === '举镜移速' || sortKey === '腰射移速') {
                weapons = weapons.sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
            } else {
                weapons = weapons.sort((a, b) => (a[sortKey] ?? 999) - (b[sortKey] ?? 999));
            }
            // 格式化数值为2位小数，null显示为'-'
            function fmt(val) {
                if (val === null || val === undefined || isNaN(val)) return '-';
                if (typeof val === 'string') return val;
                return Math.round(val * 100) / 100;
            }
            const xLabels = weapons.map(w => w.weapon);
            let colorMap = {
                '切枪': '#E57373',
                '空仓换弹时间': '#FF8A65',
                '腰射移速': '#42A5F5',
                '举镜移速': '#80CBC4'
            };
            let series = [
                {
                    name: sortKey,
                    type: 'bar',
                    data: weapons.map(w => fmt(w[sortKey])),
                    itemStyle: { color: colorMap[sortKey] },
                    emphasis: {
                        focus: 'series',
                        label: {
                            show: true,
                            position: 'top',
                            color: '#fff',
                            fontSize: 14,
                            formatter: fmt
                        }
                    }
                }
            ];
            return { series, xLabels };
        },
        initCategoriesAndFilter() {
            this.categories = Object.keys(this.stats);
            this.categories.forEach(cat => {
                this.filter[cat] = false;
            });
        },
        changeFilter(category) {
            this.filter[category] = !this.filter[category];
            this.handleFilter();
        },
        handleAll() {
            this.ALL = true;
            this.categories.forEach(cat => {
                this.filter[cat] = false;
            });
            this.updateChartSeries([]);
        },
        handleFilter() {
            const selectedCategories = this.categories.filter(cat => this.filter[cat]);
            if (selectedCategories.length === 0) {
                this.handleAll();
                return;
            }
            this.ALL = false;
            this.updateChartSeries(selectedCategories);
        },
        updateChartSeries(selectedCategories) {
            const { series, xLabels } = this.formatChartData(selectedCategories);
            // 计算y轴最大值，留出空间，避免无效max导致999999...分割线
            let max = 0;
            let valid = false;
            series.forEach(s => {
                const arr = s.data.filter(v => typeof v === 'number' && isFinite(v));
                if (arr.length) {
                    const m = Math.max(...arr);
                    if (m > max) max = m;
                    valid = true;
                }
            });
            const yAxisOpt = valid && max > 0 ? { ...DEFAULT_OPTIONS.yAxis, max: max * 1.15 } : { ...DEFAULT_OPTIONS.yAxis };
            // 图表方向
            let option = {
                ...DEFAULT_OPTIONS,
                series,
                tooltip: {
                    ...DEFAULT_OPTIONS.tooltip,
                    trigger: 'axis',
                    formatter: (params) => {
                        if (!params || !params.length) return '';
                        const idx = params[0].dataIndex;
                        let html = `<div style='font-weight:bold;'>${params[0].name}</div>`;
                        html += `<div style='padding-left:18px;'>${this.activeKey}: <span style='font-weight:bold;'>${series[0].data[idx] ?? '-'}</span></div>`;
                        return html;
                    }
                }
            };
            if (this.chartDirection === 'vertical') {
                option.xAxis = { ...DEFAULT_OPTIONS.xAxis, data: xLabels };
                option.yAxis = yAxisOpt;
            } else {
                // 横向柱状图
                option.xAxis = { ...DEFAULT_OPTIONS.xAxis, type: 'value', name: this.activeKey, nameLocation: 'middle', nameGap: 35, nameTextStyle: { fontSize: 16, color: '#ccc' }, axisLabel: { color: '#ccc' }, splitLine: { lineStyle: { color: '#444' } } };
                option.yAxis = { ...DEFAULT_OPTIONS.yAxis, type: 'category', data: xLabels };
            }
            this.chartInstance.setOption(option, { replaceMerge: ['series', 'xAxis', 'yAxis', 'tooltip'] });
        },
        resizeChart() {
            if (this.chartInstance) {
                this.chartInstance.resize();
            }
        },
        switchKey(key) {
            this.activeKey = key;
            this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]));
        },
        switchDirection() {
            this.chartDirection = this.chartDirection === 'vertical' ? 'horizontal' : 'vertical';
            this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]));
        }
    }
};
</script>

<template>
    <div class="main-container">
        <div class="switch-container">
            <div class="key-group">
                <button v-for="key in ['切枪','空仓换弹时间','腰射移速','举镜移速']" :key="key" class="switch-btn" :class="{ active: activeKey === key }" @click="switchKey(key)">{{ key }}</button>
            </div>
            <button class="direction-btn" @click="switchDirection">
                {{ chartDirection === 'horizontal' ? '天梯模式' : '柱状图模式' }}
            </button>
        </div>
        <div ref="chartContainer" class="chart-container"></div>
        <div class="controls-container">
            <div v-for="category in categories" :key="category" class="checkbox">
                <button class="checkbtn" :class="{ active: filter[category] }" @click="changeFilter(category)">
                    <span class="label">{{ category }}</span>
                </button>
            </div>
            <div class="checkbox">
                <button class="checkbtn" :class="{ active: ALL }" @click="handleAll">
                    <span class="label">ALL</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.main-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #212121;
    position: relative;
}
/* 右上角切换区 */
/* 右上角切换区，避免遮挡，采用顶部margin布局 */
/* 右上角切换区，按钮默认60%透明，悬浮或激活时恢复不透明 */
.switch-container {
    position: absolute;
    top: 20px;
    right: 40px;
    z-index: 20;
}
.key-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}
.switch-btn, .direction-btn {
    opacity: 0.5;
    transition: opacity 0.2s, color 0.2s, outline-width 0.2s, background-color 0.2s;
}
.switch-btn {
    min-width: 80px;
    height: 36px;
    background: #212121;
    outline: 0 solid #307B6E;
    border-radius: 12px;
    box-shadow: 0 0 0 1px #50BBAA;
    border-width: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #ffffff7b;
}
.switch-btn.active,
.switch-btn:hover {
    opacity: 1;
    outline-width: 4px;
    outline-color: #50BBAA;
    color: #fff;
    background: #307B6E;
}
.direction-btn {
    min-width: 120px;
    height: 32px;
    background: #212121;
    outline: 0 solid #50BBAA;
    border-radius: 10px;
    box-shadow: 0 0 0 1px #50BBAA;
    border-width: 0;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #50BBAA;
    margin-top: 2px;
}
.direction-btn:hover,
.direction-btn:focus {
    opacity: 1;
    outline-width: 3px;
    background: #307B6E;
    color: #fff;
}
.chart-container {
    width: 100%;
    flex-grow: 1;
    min-height: 0;
}
.controls-container {
    flex-shrink: 0;
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
    padding: 0 20px;
    background-color: #212121;
    overflow-x: auto;
    box-sizing: border-box;
}
.checkbox {
    display: flex;
    align-items: center;
    padding: 15px 5px;
    font-family: Arial, sans-serif;
}
.checkbtn {
    width: 140px;
    height: 90px;
    background: #212121;
    outline: 0 solid #307B6E;
    border-radius: 15px;
    box-shadow: 0 0 0 1px #50BBAA;
    transition: outline-width 0.2s, background-color 0.2s;
    border-width: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}
.label {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff7b;
    transition: color 0.2s;
}
.checkbtn:hover {
    outline-width: 5px;
}
.checkbtn.active {
    outline-width: 5px;
    outline-color: #50BBAA;
}
.checkbtn.active .label {
    color: #ffffff;
}
</style>
