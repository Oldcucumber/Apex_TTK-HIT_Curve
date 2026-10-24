import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import echarts from './echarts.js'
import { tokens } from './theme.js'
import { store } from '../store.js'
import { observeResize } from '../utils/index.js'

/**
 * Mounts an ECharts instance on `el`, keeps it sized to its container and
 * re-renders when the theme/language or any extra source changes.
 *
 * @param el      ref to the host element
 * @param build   (tokens) => option
 * @param sources extra reactive sources that should trigger a re-render
 * @param onSize  optional hook called (besides resize) when the host size changes
 */
export function useChart(el, build, sources = [], onSize) {
  const chart = shallowRef(null)
  let stop = () => {}

  const render = () => {
    if (!chart.value) return
    chart.value.setOption(build(tokens()), { notMerge: true })
  }

  onMounted(() => {
    chart.value = echarts.init(el.value)
    render()
    stop = observeResize(el.value, () => {
      chart.value?.resize()
      if (onSize) onSize()
    })
  })

  watch([() => store.theme, () => store.lang, ...sources], render)

  onBeforeUnmount(() => {
    stop()
    chart.value?.dispose()
    chart.value = null
  })

  return { chart, render }
}
