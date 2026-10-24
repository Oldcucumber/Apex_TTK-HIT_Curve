import { onActivated, onBeforeUnmount, onDeactivated, onMounted, shallowRef, watch } from 'vue'
import echarts from './echarts.js'
import { tokens } from './theme.js'
import { store } from '../store.js'
import { observeResize } from '../utils/index.js'

/**
 * Mounts an ECharts instance on `el`, keeps it sized to its container and
 * re-renders when the theme/language or any extra source changes.
 * While the owning view is cached by <KeepAlive> and hidden, changes are only
 * marked dirty and rendered once the view is shown again.
 *
 * @param el      ref to the host element
 * @param build   (tokens) => option
 * @param sources extra reactive sources that should trigger a re-render
 * @param onSize  optional hook called (besides resize) when the host size changes
 */
export function useChart(el, build, sources = [], onSize) {
  const chart = shallowRef(null)
  let stop = () => {}
  let active = true
  let dirty = false

  const render = () => {
    if (!chart.value) return
    if (!active) {
      dirty = true
      return
    }
    dirty = false
    chart.value.setOption(build(tokens()), { notMerge: true, lazyUpdate: true })
  }

  onMounted(() => {
    chart.value = echarts.init(el.value, null, { renderer: 'svg' })
    render()
    stop = observeResize(el.value, () => {
      if (!active || !el.value?.clientWidth) return
      chart.value?.resize()
      if (onSize) onSize()
    })
  })

  onActivated(() => {
    active = true
    chart.value?.resize()
    if (dirty) render()
  })
  onDeactivated(() => { active = false })

  watch([() => store.theme, () => store.lang, ...sources], render)

  onBeforeUnmount(() => {
    stop()
    chart.value?.dispose()
    chart.value = null
  })

  return { chart, render }
}
