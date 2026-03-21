/**
 * Type shims for Nuxt virtual modules and Nitro dependencies.
 * These modules are resolved at runtime by Nuxt, not during library build.
 */

declare module 'h3' {
  interface H3Event {
    path: string
    context: Record<string, unknown>
  }
  export function defineEventHandler(handler: (event: H3Event) => unknown): unknown
  export function sendRedirect(event: H3Event, location: string, code?: number): unknown
  export function getHeader(event: H3Event, name: string): string | undefined
  export function getCookie(event: H3Event, name: string): string | undefined
  export function getQuery(event: H3Event): Record<string, string | string[] | undefined>
}
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
  export function useRouter(): import('vue-router').Router
  export function useRequestHeaders(headers?: string[]): Record<string, string | undefined>
  export function useCookie(key: string): { value: string | null | undefined }
  export function useNuxtApp(): {
    runWithContext<T>(fn: () => T): T
  }
  export function defineNuxtPlugin(plugin: (nuxtApp: any) => any): any
  export function defineNuxtRouteMiddleware(middleware: (to: any, from?: any) => any): any
  export function navigateTo(to: string, options?: { redirectCode?: number }): any
}
