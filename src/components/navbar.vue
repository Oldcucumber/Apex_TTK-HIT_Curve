<template>
  <div>
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-items">
        <!-- 导航按钮 -->
        <button
          v-for="tab in tabs"
          :key="tab.name" @click="handleTabClick(tab)" :class="{ active: currentTab === tab.component }"
        >
          {{ lang.labels[tab.name] }}
        </button>
      </div>

      <!-- 语言选择下拉框 -->
      <select v-model="selectedLanguage" @change="changeLanguage" class="language-select">
        <option v-for="(item, name) in langList" :key="name" :value="name">{{ item.text }}</option>
      </select>
    </nav>

    <!-- 内容区域 -->
    <main class="content">
      <component :is="currentTab" :key="currentTab" ref="currentTabRef" :lang=lang />
    </main>
  </div>
</template>

<script>
import chart from './chart.vue'
import list from './list.vue'
import ttk_ttm from './ttk_ttm.vue'
import flex from './flex.vue'
import cn from '../data/cn.js'
import en from '../data/en.js'

export default {
  components: {
    chart,
    list,
    ttk_ttm,
    flex
  },
  data() {
    const langList = {
      "cn":{text:'中文',data:cn},
      "en":{text:'English',data:en}
    }
    const tabs = [
      { name: 'ttk_curve', component: 'chart' },
      { name: 'ttk_ttm', component: 'ttk_ttm' },
      { name: 'flex', component: 'flex' }, // 新增灵活性入口
      { name: 'self_test', component: 'list' },
      { name: 'ori_doc', url: 'https://docs.qq.com/sheet/DVHRMRG9Jdm5Udm10?tab=000001'}
    ]

    return {
      selectedLanguage: 'cn',
      langList,
      lang: cn,

      tabs,
      currentTab: 'chart',
      currentTabComponent: null
    }
  },
  methods:{
    handleTabClick(tab) {
      if (tab.url) {
        window.open(tab.url, '_blank');
      } else {
        this.currentTab = tab.component;
      }
      this.$nextTick(() => {
        this.currentTabComponent = this.$refs.currentTabRef
      })
    },
    changeLanguage() {
      this.lang = this.langList[this.selectedLanguage].data
      console.log('切换语言到:', this.selectedLanguage)
      this.$nextTick(() => {
        if (this.currentTabComponent && typeof this.currentTabComponent.changeLang === 'function') {
          this.currentTabComponent.changeLang()
        } else {
          console.warn('当前子组件不可用或方法不存在')
        }
      })
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.currentTabComponent = this.$refs.currentTabRef // 初始化 currentTabComponent
    })
  },
}
</script>

<style scoped>
.navbar {
  box-sizing: border-box;
  position: fixed;
  top: 0;
  width: 100%;
  height: 70px;
  background-color: #333;
  padding-left: 10px;
  padding-right: 10px;
  padding-top: 0;
  padding-bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
}

.nav-items {
  display: flex;
  gap: 1rem;
  height: 100%;
}

button {
  padding: 0.5rem 1rem;
  height: 100%;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #307B6E;
}

button.active {
  background-color: #50BBAA;
  font-weight: bold;
}

.language-select {
  padding: 0.5rem;
  background-color: #444;
  color: white;
  border: 1px solid #666;
  border-radius: 4px;
}

.content {
  margin-top: 70px;
  /* 留出导航栏空间 */
  padding: 0;
  height: calc(100vh - 70px);
  box-sizing: border-box;
  overflow: auto;
}
</style>