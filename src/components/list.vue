<script>
import * as echarts from 'echarts';
import names from '@/data/id_name.js';
import ttks from '@/data/id_stats.js';

export default {
  data() {
    const formData = Object.keys(names).reduce((acc, cur) => {
      acc[cur] = "";
      return acc;
    }, {});
    return {
      name: this.lang.names,
      formData,
      jsonText: "",
      chartInstance: null,
      ttk: ttks,
    };
  },
  computed: {
    isFormDataEmpty() {
      return Object.values(this.formData).every(value => value === "");
    },
    isTextEmpty() {
      return this.jsonText === "";
    }
  },
  mounted() {
    this.chartInstance = echarts.init(this.$refs.chartContainer2,"dark");

  },
  beforeUnmount() {
    // 组件卸载前销毁图表
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
  },
  props: { 
    lang:{type: Object, required: true}
  },
  methods: {
    // 复制到剪贴板
    copyToClipboard() {
      // 使用现代剪贴板API
      navigator.clipboard.writeText(this.jsonText)
        .then(() => {
          alert('数据已成功复制到剪贴板！');
        })
        .catch(err => {
          console.error('复制失败:', err);
          alert('复制失败，请检查控制台错误信息');
        });
    },

    // 解析并更新表单
    parseAndUpdate() {
      try {
        const parsedData = JSON.parse(this.jsonText);
        
        // 数据有效性验证
        if (typeof parsedData !== 'object' || parsedData === null) {
          throw new Error('无效的JSON对象格式');
        }

        // 只更新已存在的字段
        for (var key in parsedData) {
          if (this.formData.hasOwnProperty(key)) {
            console.log(`更新字段：${key}`);
            this.formData[key] = parsedData[key];
          }
        }
        
        alert('数据已成功更新到表单！');
      } catch (error) {
        alert(`解析失败：${error.message}`);
      }
    },
    findTTK(name,percentage){
      for (var i in this.ttk[name]){
        if (this.ttk[name][i][0] <= (percentage/100)){
          return this.ttk[name][i][1];
        }
      }
      return 0;
    },
    
    generate() {
      // 生成代码
      const notEmptyKeys = Object.keys(this.formData).filter(key => this.formData[key] !== '');
      const notEmptyJSON = {};
      var series = [];
      // 筛选出非空的formData（因为输入再删除后字典里面会有键但没有值）
      for (var key of notEmptyKeys) {
        notEmptyJSON[key] = this.formData[key];
        if (this.findTTK(key,this.formData[key]) != 0){ // 这一步顺带进行ttk查找和分类
          series.push({name:this.name[key],value:this.findTTK(key,this.formData[key]),category:1});
        }else{
          series.push({name:this.name[key],value:5,category:2});
        }
      }
      const jsonString = JSON.stringify(notEmptyJSON, null, 2);
      this.jsonText = jsonString;  // 更新文本域显示

      // 生成图表
      const processedData = [
            // 类别1数据（排序）
            ...series.filter(d => d.category === 1)
                    .sort((a, b) => a.value - b.value),
            // 类别2数据
            ...series.filter(d => d.category === 2)
        ].map(item => ({
            ...item,
            // 动态样式配置
            itemStyle: {
                color: item.category === 1 ? '#50BBAA' : '#ee6666'
            }
        }));

      const option = {
        grid: {
          top: '35px',
          right: '180px',
          bottom: '3%',
          left: '10px',
          containLabel: true
        },
        tooltip: { // 鼠标悬浮提示框
          trigger: 'item',
                formatter: params => {
                    return params.data.category === 1 
                        ? `${params.name}<br/>TTK：${params.value}s`
                        : '一梭子打不死';
                }
        },
        backgroundColor: '#212121',
        xAxis: {
          type: 'value',
          position: 'top',
        },
        yAxis: {
          type: 'category',
          data: processedData.map(d => d.name),
          inverse: true,
          axisLabel: {
            show: true,
            inside: true,
            margin: 300, // 标签与轴线之间的距离，用了非常抽象的方法把标签移到右侧
          },
          axisLine: {
            show: true
          },
          axisTick: {
            show: true
          },
        },
        series: [{
          type: 'bar',
          label: {
            show: true,
            position: 'right',
            formatter: ({ data }) => data.category === 1 ? data.value : ''
          },
          data: processedData
        }]
      }
      this.chartInstance.clear();
      this.chartInstance.resize({
        width: 480,
        height: 100 + series.length * 50,
      });
      
      this.chartInstance.setOption(option,true);

      window.addEventListener('resize', ()=>{
        if (this.chartInstance) this.chartInstance.resize();
      });
    },
    changeLang() {
      this.name = this.lang.names;
      this.generate();
    }
  }
};
</script>
<template>
<!-- 修改两列显示 -->
  <div style="display: flex; flex-direction: row;">
    <div class="form-container">  <!-- 新增包裹容器 -->
      <div v-for="(itemName, id) in name" :key="id" class="form-item">
        <label class="form-label" style="color: #fff;">{{ itemName }}:</label>
        <div style="position: relative; display: inline-block;">
          <input 
            type="text" 
            v-model="formData[id]"
            style="padding-right: 25px; width: 50px;"
          >
          <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #999;">%</span>
        </div>
      </div>
    </div>

    <div class="button-group" style="margin-top: 20px;">
      <button @click="generate" :disabled="isFormDataEmpty" :class="{ 'disabled-button': isFormDataEmpty }" style="height: 100px; width: 100px; font-size: 20px;">{{ lang.labels["generate"] }}<br>→</button>
    </div>

    <div class="json-section">
      <div style="width: 100%; height: 600px; overflow-y: auto;">
        <div id="container" ref="chartContainer2" style="height: 400px; width: 480px;"></div>
      </div>
      <textarea
        v-model="jsonText" 
        :placeholder= "this.lang.labels['paste_here']"
        class="json-textarea"
      ></textarea>
      <div class="button-group">
        <button @click="copyToClipboard" :disabled="isTextEmpty" :class="{ 'disabled-button': isTextEmpty }">{{ lang.labels["copy"] }}</button>
        <button @click="parseAndUpdate" :disabled="isTextEmpty" :class="{ 'disabled-button': isTextEmpty }">{{ lang.labels["parse_json"] }}</button>
      </div>
    </div>
    
  </div>
</template>
<style>
/* 新增表单容器样式 */
.form-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 10px;
}

.form-item {
  margin: 5px;
}

.form-label {
  display: inline-block;
  width: 250px;
  text-align: right;
  margin: 5px;
}

input {
  padding: 5px;
  border: 1px solid #ddd;
}

.json-section {
  margin: 20px 0;
}

.json-textarea {
  width: 100%;
  height: 150px;
  padding: 10px;
  border: 1px solid #ffffff7b;
  font-family: monospace;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.button-group button {
  margin-right: 10px;
  padding: 8px 15px;
  background: #50BBAA;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.button-group button:hover {
  background: #307B6E;
}

.disabled-button {
  background-color: #cccccc !important;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>