<template>
  <div>
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-items">
        <!-- 导航按钮 -->
        <button
          v-for="tab in tabs"
          :key="tab.component"
          @click="currentTab = tab.component"
          :class="{ active: currentTab === tab.component }"
        >
          {{ tab.name }}
        </button>
      </div>
      
      <!-- 语言选择下拉框 -->
      <select v-model="selectedLanguage" @change="changeLanguage" class="language-select">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </nav>

    <!-- 内容区域 -->
    <main class="content">
      <component :is="currentTab" />
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import chart from '@/components/chart.vue'
import list from '@/components/list.vue'

export default {
  components: {
    chart,
    list,
  },
  setup() {
    const currentTab = ref('chart')
    const selectedLanguage = ref('zh')
    const tabs = [
      { name: 'TTK-命中率表', component: 'chart' },
      { name: '命中率自测', component: 'list' },
    ]

    const changeLanguage = () => {
      // 这里可以添加实际的语言切换逻辑
      console.log('切换语言到:', selectedLanguage.value)
    }

    return {
      currentTab,
      selectedLanguage,
      tabs,
      changeLanguage
    }
  }
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
  max-width: 100vw;
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
  margin-top: 70px; /* 留出导航栏空间 */
  padding: 0.5rem;
  height: calc(100vh - 70px);
  box-sizing: border-box;
  overflow: auto;
}
</style>