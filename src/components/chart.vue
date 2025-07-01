<script>
import * as echarts from 'echarts';
import ttks from '@/data/id_stats.js';
import names from '@/data/id_name.js';
import { markRaw } from 'vue';
import classes from '@/data/Class.js';
import { chartDataFormatter } from '@/utils';

// 数据处理相关常量
const DATA_CONSTANTS = {
  // Y轴数据有效范围 (TTK时间范围)
  Y_AXIS_MIN: 0,
  Y_AXIS_MAX: 10,
  
  // X轴数据范围 (命中率百分比范围)
  X_AXIS_MIN: 0,
  X_AXIS_MAX: 100,
  
  // 轴范围计算时的边距设置
  Y_AXIS_PADDING_PERCENT: 0.1,    // Y轴10%边距
  Y_AXIS_PADDING_FALLBACK: 0.5,   // Y轴数据范围为0时的固定边距
  X_AXIS_PADDING_PERCENT: 0.05,   // X轴5%边距  
  X_AXIS_PADDING_FALLBACK: 5,     // X轴数据范围为0时的固定边距
};

const DEFAULT_OPTIONS = {
  grid: {
    top: '35px',
    right: '280px',
    bottom: '40px',
    left: '20px',
    containLabel: true
  },
  backgroundColor: '#212121',
  tooltip: {
    trigger: 'axis', // 改为axis模式，鼠标移动到坐标轴上时显示
    axisPointer: {
      type: 'cross', // 显示十字准线
      lineStyle: {
        color: '#50BBAA',
        width: 1,
        type: 'dashed'
      },
      crossStyle: {
        color: '#50BBAA'
      }
    },
    backgroundColor: 'rgba(33, 33, 33, 0.9)',
    borderColor: '#50BBAA',
    borderWidth: 1,
    textStyle: {
      color: '#fff'
    },
    formatter: function (){}, // 插入方法移至updateAxisRange中,以便更新标签文本
    enterable: true, // 允许鼠标进入tooltip区域
    triggerOn: 'mousemove', // 鼠标移动时触发
    alwaysShowContent: false
  },
  legend: {
    type: 'scroll',
    orient: 'vertical',
    right: 10,
    top: 30,
    bottom: 20,
    textStyle: {
      fontSize: 14,
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: {
      formatter: '{value} %',
      align: 'center',
      fontSize: 14,
    },
    min: 0,
    max: 100,
    interval: 10
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value) => `${value.toFixed(2)} s`,
      align: 'right',
      fontSize: 14,
    },
    min: 0,
    max: 10,
    maxInterval: 1,
    minInterval: 0.3,
    splitNumber: 10
  },
  series: [], // 不设置初始值，以便初始化时读取language
  dataZoom: [
    {
      type: 'inside',
      yAxisIndex: [0],
      start: 0,
      end: 100,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      filterMode: 'none' // 不删除范围外的点，以免折线断开，下同
    },
    {
      type: 'slider', // 滑动条型数据区域缩放
      xAxisIndex: [0],
      show: true,    // 是否显示滑动条，默认 true
      start: 0,     // 根据数据范围调整起始值（约37%）
      end: 100,      // 结束值保持100%
      height: 30,    // 滑动条的高度
      bottom: 10,      // 滑动条的位置
      filterMode: 'none'
    }
  ]
};

export default {
  data() {
    return {
      chartInstance: null, // 存储图表实例
      ttk: chartDataFormatter(ttks, this.lang.names),
      name: names,
      classes: classes,
      filter: {},
      ALL: true,
      allCheckboxHeight: 0,
      transformType: 'none', // 数据变换类型
      transformParams: {}, // 变换参数
    };
  },
  props: { 
    lang:{type: Object, required: true}
  },
  async mounted() {
    this.allCheckboxHeight = this.$refs.all_checkbox.offsetHeight;
    await this.$nextTick();
    this.initChart();
    this.initFilter();
  },
  beforeUnmount() {
    // 组件卸载前销毁图表
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  },
  methods: {
    // 动态更新轴范围 - 接受option参数并返回修改后的option
    updateAxisRange(inputOption = null, skipDataZoomCalculation = false) {
      // 如果没有传入option，从图表实例获取当前option
      const option = inputOption || (this.chartInstance ? this.chartInstance.getOption() : null);

      if (!option) return inputOption;

      const series = (!option.series || option.series.length === 0) ? this.ttk : option.series;

      option.tooltip.formatter = (params)=> {
        if (!params || params.length === 0) return '';
        
        // 获取X轴值（命中率）
        const hitRate = params[0].value[0];
        let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px;">${this.lang.labels['hit_rate']}: ${hitRate.toFixed(1)}%</div>`;
        
        // 按TTK值排序，显示最优性能的武器
        const sortedParams = params
          .filter(param => param.value && param.value[1] !== null)
          .sort((a, b) => a.value[1] - b.value[1]);
        
        sortedParams.forEach((param, index) => {
          const ttk = param.value[1];
          const weaponName = param.seriesName;
          const color = param.color;
          
          tooltipContent += `
            <div style="display: flex; align-items: center; margin: 4px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></span>
              <span style="flex: 1;">${weaponName}</span>
              <span style="font-weight: bold; color: ${index === 0 ? '#50BBAA' : '#fff'};">${ttk.toFixed(3)}s</span>
            </div>
          `;
        });
        
        return tooltipContent;
      }

      // 收集所有系列的X值以计算实际数据范围
      let allXValues = [];
      let allYValues = [];

      series.forEach(seriesItem => {
        if (!seriesItem || !seriesItem.data || seriesItem.data.length === 0) return;

        seriesItem.data.forEach(point => {
          if (point && point.length >= 2) {
            const xValue = point[0];
            const yValue = point[1];

            if (xValue !== null && xValue !== undefined &&
              yValue !== null && yValue !== undefined &&
              yValue >= DATA_CONSTANTS.Y_AXIS_MIN && yValue <= DATA_CONSTANTS.Y_AXIS_MAX) {
              allXValues.push(xValue);
              allYValues.push(yValue);
            }
          }
        });
      });

      // 创建新的option对象
      let newOption = { ...option,series: series };

            // 根据数据范围设置X轴dataZoom的起始值（仅在非dataZoom事件触发时）
      if (!skipDataZoomCalculation && allXValues.length > 0) {
        const minX = Math.min(...allXValues);
        const maxX = Math.max(...allXValues);
        
        // 添加一些边距，避免数据点贴边
        const xRange = maxX - minX;
        const xPadding = xRange > 0 ? xRange * DATA_CONSTANTS.X_AXIS_PADDING_PERCENT : DATA_CONSTANTS.X_AXIS_PADDING_FALLBACK;
        
        const adjustedMinX = Math.max(DATA_CONSTANTS.X_AXIS_MIN, minX - xPadding);
        const adjustedMaxX = Math.min(DATA_CONSTANTS.X_AXIS_MAX, maxX + xPadding);
        
        // 计算dataZoom的起始和结束百分比
        const startPercent = (adjustedMinX / DATA_CONSTANTS.X_AXIS_MAX) * 100;
        const endPercent = (adjustedMaxX / DATA_CONSTANTS.X_AXIS_MAX) * 100;
        
        console.log('X轴数据范围:', { 
          originalMin: minX, 
          originalMax: maxX,
          adjustedMin: adjustedMinX,
          adjustedMax: adjustedMaxX,
          startPercent,
          endPercent 
        });
        
        // 使用辅助函数更新dataZoom配置
        newOption = this.updateDataZoom(newOption, startPercent, endPercent);
      }

      // 获取当前有效的X轴显示范围（用于Y轴计算）
      let xMin = DATA_CONSTANTS.X_AXIS_MIN, xMax = DATA_CONSTANTS.X_AXIS_MAX;
      if (newOption.dataZoom && newOption.dataZoom.length > 0) {
        // 找到第一个X轴相关的dataZoom
        const xDataZoom = newOption.dataZoom.find(dz =>
          dz.xAxisIndex && Array.isArray(dz.xAxisIndex) && dz.xAxisIndex.length > 0
        );
        if (xDataZoom) {
          const xStartPercent = xDataZoom.start || 0;
          const xEndPercent = xDataZoom.end || 100;

          xMin = (xStartPercent / 100) * DATA_CONSTANTS.X_AXIS_MAX;
          xMax = (xEndPercent / 100) * DATA_CONSTANTS.X_AXIS_MAX;
        }
      }

      // 收集在当前X轴范围内的Y值用于Y轴范围计算
      let visibleYValues = [];

      series.forEach(seriesItem => {
        if (!seriesItem || !seriesItem.data || seriesItem.data.length === 0) return;

        seriesItem.data.forEach(point => {
          if (point && point.length >= 2) {
            const xValue = point[0];
            const yValue = point[1];

                      if (xValue >= xMin && xValue <= xMax &&
            yValue !== null && yValue !== undefined &&
            yValue >= DATA_CONSTANTS.Y_AXIS_MIN && yValue <= DATA_CONSTANTS.Y_AXIS_MAX) {
              visibleYValues.push(yValue);
            }
          }
        });
      });

      console.log('可见Y值数量:', visibleYValues.length);

      // 如果找到了有效的Y值数据，计算Y轴范围
      if (visibleYValues.length > 0) {
        const minY = Math.min(...visibleYValues);
        const maxY = Math.max(...visibleYValues);

        const range = maxY - minY;
        const padding = range > 0 ? range * DATA_CONSTANTS.Y_AXIS_PADDING_PERCENT : DATA_CONSTANTS.Y_AXIS_PADDING_FALLBACK;

        const yMin = Math.max(DATA_CONSTANTS.Y_AXIS_MIN, minY - padding);
        const yMax = Math.min(DATA_CONSTANTS.Y_AXIS_MAX, maxY + padding);

        console.log('设置Y轴范围:', {
          yMin, yMax,
          originalMin: minY,
          originalMax: maxY,
          visibleDataCount: visibleYValues.length
        });

        newOption.yAxis = {
          ...newOption.yAxis,
          min: yMin,
          max: yMax
        };
      } else {
        console.log('在当前X轴范围内未找到有效的Y值数据');

        // 如果没有找到数据，回到默认范围
        newOption.yAxis = {
          ...newOption.yAxis,
          min: DATA_CONSTANTS.Y_AXIS_MIN,
          max: DATA_CONSTANTS.Y_AXIS_MAX
        };
      }

      // 如果没有传入option参数（即直接调用模式），则直接更新图表
      if (!inputOption && this.chartInstance) {
        const updateConfig = { yAxis: newOption.yAxis };
        // 只有在非skipDataZoomCalculation时才更新dataZoom
        if (!skipDataZoomCalculation) {
          updateConfig.dataZoom = newOption.dataZoom;
        }
        this.chartInstance.setOption(updateConfig);
      }

      return newOption;
    },
    initFilter() {
      for (let i in this.classes) {
        this.filter[i] = false
      }
    },
    handleAll() {
      if (this.ALL != true) {
        this.initFilter()
        this.handleFilter()
      }
      this.ALL = true
    },
    changeFilter(key) {
      if (this.filter.hasOwnProperty(key)) {
        this.filter[key] = !this.filter[key];
        this.handleFilter();
      }
    },
    handleFilter() {
      const selectedKeys = Object.entries(this.filter)
        .filter(([_, value]) => value)
        .map(([key]) => key);

      if (selectedKeys.length === 0) {
        this.ALL = true;
        // 使用全部数据，直接让updateAxisRange处理
        const updatedOption = this.updateAxisRange(DEFAULT_OPTIONS);
        updatedOption.series = this.ttk;
        this.chartInstance.setOption(updatedOption, true);
      } else {
        this.ALL = false;
        const newSeries = [];
        for (var i in selectedKeys) {
          newSeries.push.apply(newSeries, this.ttk.filter(item => this.classes[selectedKeys[i]].includes(item["id"])));
        }

        // 构建基础配置，让updateAxisRange自动处理dataZoom和Y轴范围
        const baseOption = {
          ...DEFAULT_OPTIONS,
          series: newSeries,
        };
        const updatedOption = this.updateAxisRange(baseOption);

        this.chartInstance.setOption(updatedOption, { replaceMerge: ['series'] });
      }
    },
        // 辅助函数：更新X轴dataZoom配置
    updateDataZoom(option, startPercent, endPercent) {
      if (!option.dataZoom) return option;
      
      return {
        ...option,
        dataZoom: option.dataZoom.map(dz => {
          // 只处理X轴相关的dataZoom
          if (dz.xAxisIndex && Array.isArray(dz.xAxisIndex) && dz.xAxisIndex.length > 0) {
            return { ...dz, start: startPercent, end: endPercent };
          }
          return dz;
        })
      };
    },

    initChart() {
      // 初始化图表
      this.chartInstance = markRaw(echarts.init(this.$refs.chartContainer, "dark"));
      
      // 直接使用updateAxisRange来处理初始配置
      const initialOptions = this.updateAxisRange(DEFAULT_OPTIONS);
      this.chartInstance.setOption(initialOptions);

      // 添加dataZoom事件监听
      this.chartInstance.on('dataZoom', (params) => {
        console.log('dataZoom event:', params);
        // dataZoom变化时，只重新计算Y轴范围，不重新计算dataZoom
        this.updateAxisRange(null, true);
      });

      window.addEventListener('resize', () => {
        if (this.chartInstance) this.chartInstance.resize();
      });
    },
    changeLang(){
      this.ttk = chartDataFormatter(ttks, this.lang.names)
      this.handleFilter() // 借用filter重载图表,顺便还能保留筛选
    }
  }
};
</script>
<template>
  <div ref="main_container" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
    <div ref="chartContainer" class="chartContainer" style="height: 100%;width: 100%;"></div>

  <div class="checkbox_container">
    <div v-for="(name, index) in lang.classes" :key="index" class="checkbox">
      <button class="checkbtn" :class="{ active: this.filter[index] }" @click="changeFilter(index)">
        <span class="label">{{ name }}</span>
      </button>
    </div>
    <div ref="all_checkbox" class="checkbox">
      <button class="checkbtn" :class="{ active: this.ALL }" @click="handleAll(ALL)">
        <span class="label">ALL</span>
      </button>
    </div>
  </div>
  </div>
</template>
<style scoped>
.checkbox_container { 
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 0 20px;
  overflow-x: auto;
  overflow-y: hidden;
}

.checkbox {
  display: flex;
  align-items: center;
  padding: 15px 5px;
  font-family: Arial, sans-serif;
  color: black;
}

.checkbtn {
  width: 140px;
  height: 90px;
  background: #212121;
  outline: 0 solid #307B6E;
  border-radius: 15px;
  color: #000;
  box-shadow: 0 0 0 1px #50BBAA;
  transition: outline-width 0.2s;
  border-width: 0px;
  box-sizing: border-box;
}

.label {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff7b;
}

.checkbtn:hover {
  outline-width: 5px;
}

.checkbtn.active {
  outline-width: 5px;
  outline-color: #50BBAA;
}
</style>