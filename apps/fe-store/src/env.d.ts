/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue3-apexcharts' {
  import type { DefineComponent } from 'vue'
  const VueApexCharts: DefineComponent<any, any, any>
  export default VueApexCharts
}
