/**
 * Type shims for Nuxt virtual modules.
 * These modules are resolved at runtime by Nuxt, not during library build.
 */
declare module '#imports' {
  export function useRuntimeConfig(): {
    public: Record<string, unknown>
    [key: string]: unknown
  }
  export function useRoute(): {
    path: string
    params: Record<string, string | string[]>
    query: Record<string, string | string[] | undefined>
    name: string | symbol | null | undefined
    fullPath: string
    hash: string
    matched: unknown[]
    redirectedFrom: unknown
    meta: Record<string, unknown>
  }
  export function useRequestHeaders(headers?: string[]): Record<string, string | undefined>
  export function useCookie(key: string): { value: string | null | undefined }
  export function defineNuxtPlugin(plugin: (nuxtApp: any) => any): any
  export function defineNuxtRouteMiddleware(middleware: (to: any, from?: any) => any): any
  export function navigateTo(to: string, options?: { redirectCode?: number }): any
}
