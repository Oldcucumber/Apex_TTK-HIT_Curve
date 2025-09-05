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
            type: '战术', // "战术" 或 "移速"
        };
    },
    mounted() {
        this.initCategoriesAndFilter();
        this.initChart();
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
            // 收集所有武器及其数据
            for (const category of categoriesToProcess) {
                if (this.stats[category]) {
                    for (const weapon in this.stats[category]) {
                        const statObj = this.stats[category][weapon][this.type];
                        let data = {};
                        if (this.type === '战术') {
                            data = {
                                weapon,
                                切枪: statObj["切枪"] ?? null,
                                空仓换弹时间: statObj["空仓换弹时间"] ?? statObj["战术弹换时间"] ?? null
                            };
                        } else {
                            // 兼容举镜移速为对象的情况
                            let aim = statObj["举镜移速"];
                            if (typeof aim === 'object') {
                                aim = aim["开镜"] ?? Object.values(aim)[0];
                            }
                            data = {
                                weapon,
                                腰射移速: statObj["腰射移速"] ?? null,
                                举镜移速: aim ?? null
                            };
                        }
                        weapons.push(data);
                    }
                }
            }
            // 排序
            if (this.type === '战术') {
                weapons = weapons.sort((a, b) => (a.空仓换弹时间 ?? 999) - (b.空仓换弹时间 ?? 999));
            } else {
                weapons = weapons.sort((a, b) => (b.举镜移速 ?? 0) - (a.举镜移速 ?? 0));
            }
            // 生成xLabels和series
            const xLabels = weapons.map(w => w.weapon);
            let series = [];
            if (this.type === '战术') {
                series = [
                    {
                        name: '切枪',
                        type: 'bar',
                        data: weapons.map(w => w.切枪),
                        itemStyle: { color: '#E57373' },
                        emphasis: {
                            focus: 'series',
                            label: { show: true, position: 'top', color: '#fff', fontSize: 14 }
                        }
                    },
                    {
                        name: '空仓换弹时间',
                        type: 'bar',
                        data: weapons.map(w => w.空仓换弹时间),
                        itemStyle: { color: '#FF8A65' },
                        emphasis: {
                            focus: 'series',
                            label: { show: true, position: 'top', color: '#fff', fontSize: 14 }
                        }
                    }
                ];
            } else {
                series = [
                    {
                        name: '腰射移速',
                        type: 'bar',
                        data: weapons.map(w => w.腰射移速),
                        itemStyle: { color: '#42A5F5' },
                        emphasis: {
                            focus: 'series',
                            label: { show: true, position: 'top', color: '#fff', fontSize: 14 }
                        }
                    },
                    {
                        name: '举镜移速',
                        type: 'bar',
                        data: weapons.map(w => w.举镜移速),
                        itemStyle: { color: '#80CBC4' },
                        emphasis: {
                            focus: 'series',
                            label: { show: true, position: 'top', color: '#fff', fontSize: 14 }
                        }
                    }
                ];
            }
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
            // 计算y轴最大值，留出空间
            let max = 0;
            series.forEach(s => {
                const arr = s.data.filter(v => typeof v === 'number');
                if (arr.length) {
                    const m = Math.max(...arr);
                    if (m > max) max = m;
                }
            });
            const option = {
                ...DEFAULT_OPTIONS,
                series,
                xAxis: { ...DEFAULT_OPTIONS.xAxis, data: xLabels },
                yAxis: { ...DEFAULT_OPTIONS.yAxis, max: max ? max * 1.15 : undefined },
                tooltip: {
                    ...DEFAULT_OPTIONS.tooltip,
                    trigger: 'axis',
                    formatter: (params) => {
                        if (!params || !params.length) return '';
                        const idx = params[0].dataIndex;
                        let html = `<div style='font-weight:bold;'>${params[0].name}</div>`;
                        if (this.type === '战术') {
                            html += `<div style='padding-left:18px;'>切枪: <span style='font-weight:bold;'>${series[0].data[idx] ?? '-'}</span>s</div>`;
                            html += `<div style='padding-left:18px;'>空仓换弹时间: <span style='font-weight:bold;'>${series[1].data[idx] ?? '-'}</span>s</div>`;
                        } else {
                            html += `<div style='padding-left:18px;'>腰射移速: <span style='font-weight:bold;'>${series[0].data[idx] ?? '-'}</span></div>`;
                            html += `<div style='padding-left:18px;'>举镜移速: <span style='font-weight:bold;'>${series[1].data[idx] ?? '-'}</span></div>`;
                        }
                        return html;
                    }
                }
            };
            this.chartInstance.setOption(option, { replaceMerge: ['series', 'xAxis', 'yAxis', 'tooltip'] });
        },
        resizeChart() {
            if (this.chartInstance) {
                this.chartInstance.resize();
            }
        },
        switchType(type) {
            this.type = type;
            this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]));
        }
    }
};
</script>

<template>
    <div class="main-container">
        <div class="switch-container">
            <button class="switch-btn" :class="{ active: type === '战术' }" @click="switchType('战术')">战术</button>
            <button class="switch-btn" :class="{ active: type === '移速' }" @click="switchType('移速')">移速</button>
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
.switch-container {
    position: absolute;
    top: 20px;
    right: 40px;
    z-index: 20;
    display: flex;
    gap: 10px;
}
.switch-btn {
    width: 90px;
    height: 40px;
    background: #212121;
    outline: 0 solid #307B6E;
    border-radius: 15px;
    box-shadow: 0 0 0 1px #50BBAA;
    border-width: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff7b;
    transition: color 0.2s, outline-width 0.2s, background-color 0.2s;
}
.switch-btn.active {
    outline-width: 4px;
    outline-color: #50BBAA;
    color: #fff;
    background: #307B6E;
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
