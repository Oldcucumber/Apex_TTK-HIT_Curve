// Tree-shaken ECharts build: only the chart types and components this app uses.
import * as echarts from 'echarts/core'
import { BarChart, LineChart, ScatterChart, RadarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, RadarComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart, LineChart, ScatterChart, RadarChart,
  GridComponent, TooltipComponent, DataZoomComponent, RadarComponent, MarkLineComponent,
  CanvasRenderer
])

export default echarts
