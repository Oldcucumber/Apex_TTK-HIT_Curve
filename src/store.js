import { reactive, watch } from 'vue'

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}
const write = (key, val) => {
  try {
    localStorage.setItem(key, val)
  } catch {
    /* storage unavailable (private mode) */
  }
}

const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
const TABS = ['overview', 'explore', 'compare', 'hitrate']
const hashTab = () => {
  const t = location.hash.replace('#', '')
  return TABS.includes(t) ? t : 'overview'
}

const storedLang = read('apex-lang', '')
const browserLang = typeof navigator !== 'undefined' && !/^zh/i.test(navigator.language || 'zh') ? 'en' : 'zh'
const mobileQuery = typeof matchMedia === 'function' ? matchMedia('(max-width: 760px)') : null

export const store = reactive({
  // 'cn' is the value older versions stored
  lang: storedLang === 'cn' ? 'zh' : storedLang === 'en' || storedLang === 'zh' ? storedLang : browserLang,
  theme: read('apex-theme', prefersDark ? 'dark' : 'light'),
  armor: 'purple',
  tab: hashTab(),
  compare: [],
  selected: null,
  mobile: mobileQuery?.matches ?? false
})

mobileQuery?.addEventListener('change', e => { store.mobile = e.matches })

export const MAX_COMPARE = 4

export const toggleCompare = id => {
  const i = store.compare.indexOf(id)
  if (i >= 0) store.compare.splice(i, 1)
  else if (store.compare.length < MAX_COMPARE) store.compare.push(id)
}

const applyTheme = () => {
  document.documentElement.dataset.theme = store.theme
  document.documentElement.lang = store.lang === 'en' ? 'en' : 'zh-CN'
}

applyTheme()
watch(() => store.theme, () => { applyTheme(); write('apex-theme', store.theme) })
watch(() => store.lang, () => { applyTheme(); write('apex-lang', store.lang) })
watch(() => store.tab, tab => { if (location.hash !== `#${tab}`) location.hash = tab })
window.addEventListener('hashchange', () => { store.tab = hashTab() })
