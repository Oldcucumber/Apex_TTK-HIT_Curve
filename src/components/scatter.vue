<script>
import * as echarts from 'echarts';
import names from '@/data/id_name.js';
import ttks from '@/data/id_stats.js';
import { markRaw } from 'vue';

export default {
    data() {
        return {
            chartInstance: null, // 存储图表实例
            xAxisMax: this.calMaxX(this.removeBocek(ttks)),
            chartData: this.processData(this.removeBocek(ttks)),
        };
    },
    props: {
        lang: { type: Object, required: true }
    },
    mounted() {
        this.initChart();
    },
    beforeUnmount() {
        // 组件卸载前销毁图表
        if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null;
        }
    },
    methods: {
        removeBocek(data) {
            const output = data;
            delete output["Bocek"]
            return output;
        },
        calMaxX(data) {
            return Math.max(...Object.values(data).map(item => item[0][1])) + 0.1
        },
        processData(data) {
            const output = [];
            for (var i in data) {
                const item = {
                    name: this.lang.names[i],
                    type: 'scatter',
                    symbolSize: 10,
                    data: [[data[i][0][1], data[i].at(-1)[1]]],
                    itemStyle: {

                        borderColor: 'rgba(255, 255, 255, 0.8)',
                        borderWidth: 1,
                        shadowBlur: 8,
                        shadowColor: 'rgba(0, 0, 0, 0.3)'
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(255, 255, 255, 0.8)',
                            borderWidth: 2
                        }
                    }
                }
                output.push(item);
            }
            console.log(output);
            return output;
        },
        initChart() {
            // 创建图表实例
            this.chartInstance = markRaw(echarts.init(this.$refs.chartContainer3, "dark"));

            // 配置图表选项
            const option = {
                backgroundColor: '#212121',
                tooltip: {
                    trigger: 'item',
                    formatter: function (params) {
                        return ` ${params.seriesName}<br/>
                                TTK: ${params.data[0]}<br/>
                                TTM: ${params.data[1]}`;
                    },
                    backgroundColor: 'rgba(30, 30, 48, 0.9)',
                    borderColor: '#4dabf7',
                    textStyle: {
                        color: '#fff'
                    },
                    axisPointer: {
                        type: 'cross',
                        label: {
                            backgroundColor: '#6a7985'
                        },
                        snap: true // 自动吸附到最近的数据点
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '12%',
                    top: '18%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    min: 0,
                    max: this.xAxisMax,
                    axisLine: {
                        lineStyle: {
                            color: '#9e9e9e'
                        }
                    },
                    axisLabel: {
                        color: '#eee'
                    },
                    name: 'TTK',
                    nameLocation: 'end',
                    nameTextStyle: {
                        color: '#aaa',
                        padding: [5, 0, 0, 0]
                    }
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 9, // Y轴固定上限为9
                    axisLine: {
                        lineStyle: {
                            color: '#9e9e9e'
                        }
                    },
                    axisLabel: {
                        color: '#eee'
                    },
                    name: 'TTM',
                    nameLocation: 'end',
                    nameTextStyle: {
                        color: '#aaa',
                        padding: [0, 0, 5, 0]
                    }
                },
                dataZoom: [
                    {
                        type: 'inside',
                        xAxisIndex: 0,
                        filterMode: 'empty',
                        zoomLock: false
                    },
                    {
                        type: 'inside',
                        yAxisIndex: 0,
                        filterMode: 'empty',
                        zoomLock: false
                    }
                ],
                series: this.chartData,
                animation: true,
                animationDuration: 1000,
                animationEasing: 'cubicOut'
            };
            this.chartInstance.setOption(option);
        }
    }
}



</script>
<template>
    <div class="chart3" style="display: flex;flex-direction: row;justify-content: flex-start;">
        <div ref="chartContainer3" class="chartContainer3" style="height: 800px; width: 800px;"></div>
        <div class="icon-container">
            <!-- 使用SVG绘制所有箭头 -->
            <svg width="300" height="300" viewBox="0 0 300 300">
                <!-- 十字箭头 -->
                <line class="cross-arrow" x1="100" y1="150" x2="200" y2="150" />
                <line class="cross-arrow" x1="150" y1="100" x2="150" y2="200" />
                <!-- 上箭头 -->
                <polygon class="arrow-head" points="140,105 150,95 160,105" />
                <!-- 下箭头 -->
                <polygon class="arrow-head" points="140,195 150,205 160,195" />
                <!-- 左箭头 -->
                <polygon class="arrow-head" points="105,140 95,150 105,160" />
                <!-- 右箭头 -->
                <polygon class="arrow-head" points="195,140 205,150 195,160" />
                <!-- 中心点 -->
                <circle cx="150" cy="150" r="5" fill="#50BBAA" />
                <!-- 斜双向箭头 -->
                <line class="diagonal-arrow" x1="100" y1="100" x2="200" y2="200" />
                <polygon class="arrow-head1" points="110,95 95,95 95,110" />
                <polygon class="arrow-head1" points="190,205 205,205 205,190" />
            </svg>

            <!-- 文字标签 -->
            <div class="arrow-label" style="top: 70px; left: 120px;">容错高</div>
            <div class="arrow-label" style="top: 204px; left: 120px;">容错低</div>
            <div class="arrow-label" style="top: 137px; left: 40px;">伤害高</div>
            <div class="arrow-label" style="top: 137px; left: 202px;">伤害低</div>
            <div class="arrow-label" style="top: 74px; left: 58px;">超模</div>
            <div class="arrow-label" style="top: 200px; left: 198px;">废物</div>
        </div>
    </div>
</template>
<style>
.icon-container {
    width: 300px;
    height: 300px;
    margin: 100px 0;
    position: relative;
    border-radius: 10px;
    overflow: hidden;
}


/* 十字箭头样式 */
.cross-arrow {
    stroke: #fff;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
}

/* 斜双向箭头样式 */
.diagonal-arrow {
    stroke: #50BBAA;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
}

/* 箭头头部样式 */
.arrow-head {
    fill: #fff;
}
.arrow-head1 {
    fill: #50BBAA;
}

/* 标签样式 */
.arrow-label {
    position: absolute;
    font-size: 14px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.8);
    padding: 3px 8px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    z-index: 10;
}
</style>