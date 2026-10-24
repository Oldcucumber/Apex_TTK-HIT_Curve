<script setup>
import { onMounted, ref } from 'vue'

defineProps({
  isEnglish: { type: Boolean, default: false }
})

const contributors = ['Oldcucumber', 'Rebel-Gloria', 'StarVerseZ', 'passby6someone']

const logs = [
  'Exception in tread "main"  java.lang.NullPointerException',
  'RuntimeError: CUDA error: out of memory',
  "ModuleNotFoundError: No module named 'torch'",
  'Segmentation fault (core dumped)',
  '少女折寿中......',
  '喔唷，崩溃啦',
  '你的设备遇到问题，需要重启。我们只收集某些错误信息，然后为你重新启动',
  'Your device ran into a problem and needs to restart. Stop code: 0xc000007b',
  "The program can't start because VCRUNTIME140.dll is missing from your computer.",
  'Bind for 0.0.0.0:8080 failed: port is already allocated',
  'Permission denied (publickey)',
  'Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)',
  '500 Internal Server Error',
  "Error: Cannot find module 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js'",
  'Connection to localhost:5432 refused. Is the server running on that host and accepting TCP/IP connections?'
]

const log = ref(logs[0])
const pickLog = () => {
  log.value = logs[Math.floor(Math.random() * logs.length)]
}

onMounted(pickLog)
</script>

<template>
  <footer class="statusbar">
    <a
      class="item"
      href="https://github.com/Oldcucumber/Apex_TTK-HIT_Curve"
      target="_blank"
      rel="noopener noreferrer"
    >
      GitHub ↗
    </a>

    <div class="item people" tabindex="0">
      {{ isEnglish ? 'Contributors' : '贡献者' }}
      <ul class="people-pop panel">
        <li v-for="name in contributors" :key="name">
          <a :href="`https://github.com/${name}`" target="_blank" rel="noopener noreferrer">{{ name }}</a>
        </li>
      </ul>
    </div>

    <span class="item">{{ isEnglish ? 'Data updated' : '数据更新' }} <strong>2026/4/30</strong></span>

    <button class="lcd" :title="isEnglish ? 'Click for another log' : '点击换一条'" @click="pickLog">
      <i></i><span>{{ log }}</span>
    </button>

    <a
      class="item icp"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >
      鄂ICP备2025116017号-1
    </a>
  </footer>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
  height: 30px;
  padding: 0 6px;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.item {
  position: relative;
  flex-shrink: 0;
  color: var(--text-muted);
  white-space: nowrap;
}

.item strong {
  color: var(--text-soft);
  font-weight: 600;
}

a.item:hover {
  color: var(--accent);
  text-decoration: none;
}

.people {
  cursor: default;
  outline-offset: 4px;
}

.people-pop {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 20;
  display: none;
  margin: 0;
  padding: 10px 14px;
  list-style: none;
  border-radius: var(--r-md);
  line-height: 1.9;
}

.people:hover .people-pop,
.people:focus .people-pop,
.people:focus-within .people-pop {
  display: block;
}

.lcd {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  min-width: 0;
  height: 22px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: var(--well);
  box-shadow: var(--inset-sm);
  color: var(--text-muted);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 0.72rem;
  text-align: left;
  cursor: pointer;
}

.lcd i {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal);
  box-shadow: 0 0 5px var(--teal);
}

.lcd span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .people {
    display: none;
  }
}

@media (max-width: 760px) {
  .statusbar {
    flex-wrap: wrap;
    gap: 6px 14px;
    height: auto;
    padding: 4px 0 8px;
  }

  .lcd {
    order: 9;
    flex-basis: 100%;
  }
}
</style>
