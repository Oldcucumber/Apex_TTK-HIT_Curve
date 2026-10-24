<script setup>
import { ref } from 'vue'
import { meta } from '../data/weapons.js'
import { t } from '../i18n/index.js'

const people = ['Oldcucumber', 'Rebel-Gloria', 'StarVerseZ', 'passby6someone']

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

const log = ref(logs[Math.floor(Math.random() * logs.length)])
const next = () => { log.value = logs[Math.floor(Math.random() * logs.length)] }
const updated = meta.updated.replaceAll('-', '/')
</script>

<template>
  <footer class="footer">
    <span>{{ t('footer.updated') }} <b>{{ updated }}</b> · {{ meta.season }}</span>
    <a href="https://github.com/Oldcucumber/Apex_TTK-HIT_Curve" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    <span class="people" tabindex="0">
      {{ t('footer.contributors') }}
      <ul class="card">
        <li v-for="p in people" :key="p">
          <a :href="`https://github.com/${p}`" target="_blank" rel="noopener noreferrer">{{ p }}</a>
        </li>
      </ul>
    </span>
    <button class="log" :title="t('footer.log')" @click="next">{{ log }}</button>
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2025116017号-1</a>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 28px;
  padding: 0 24px 4px;
  color: var(--text-3);
  font-size: 11.5px;
  white-space: nowrap;
}

.footer b {
  color: var(--text-2);
  font-weight: 600;
}

.footer a:hover {
  color: var(--text);
}

.people {
  position: relative;
  cursor: default;
}

.people ul {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 30;
  display: none;
  margin: 0;
  padding: 8px 12px;
  list-style: none;
  line-height: 1.9;
}

.people:hover ul,
.people:focus ul,
.people:focus-within ul {
  display: block;
}

.log {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-3);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  text-align: left;
  text-overflow: ellipsis;
  opacity: 0.7;
}

.log:hover {
  opacity: 1;
}

@media (max-width: 900px) {
  .footer {
    flex-wrap: wrap;
    gap: 4px 14px;
    padding: 6px 12px 10px;
    white-space: normal;
  }

  .log {
    flex-basis: 100%;
    order: 9;
    white-space: normal;
  }

  .people {
    display: none;
  }
}
</style>
