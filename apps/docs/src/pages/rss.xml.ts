import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getCollection } from 'astro:content'

export async function GET(context: APIContext) {
  const docs = await getCollection('docs')
  const blogPosts = docs.filter((doc) => doc.id.startsWith('blog/'))

  return rss({
    title: 'Fluenti Blog',
    description:
      'Compile-time i18n for Vue, React, SolidJS, Next.js and Nuxt — news, tutorials, and releases.',
    site: context.site?.origin ?? 'https://fluenti.dev',
    items: blogPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      link: `/${post.id}/`,
    })),
    customData: '<language>en</language>',
  })
}
