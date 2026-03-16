interface ImportMeta {
  readonly server: boolean
  readonly client: boolean
}

declare module '#components' {
  import type { Component } from 'vue'
  export const NuxtLink: Component
}
