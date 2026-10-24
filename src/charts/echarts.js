// Tree-shaken ECharts build: only the chart types and components this app uses.
import * as echarts from 'echarts/core'
import { BarChart, LineChart, ScatterChart, RadarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, RadarComponent, MarkLineComponent, MarkAreaComponent } from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart, LineChart, ScatterChart, RadarChart,
  GridComponent, TooltipComponent, DataZoomComponent, RadarComponent, MarkLineComponent, MarkAreaComponent,
  LabelLayout, CanvasRenderer
])

export default echarts
