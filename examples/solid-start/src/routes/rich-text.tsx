import type { Component, JSX } from 'solid-js'
import { Trans, t } from '@fluenti/solid'

const Bold: Component<{ children?: JSX.Element }> = (props) => (
  <strong style={{ color: '#2c3e50' }}>{props.children}</strong>
)

const Italic: Component<{ children?: JSX.Element }> = (props) => (
  <em style={{ color: '#8e44ad' }}>{props.children}</em>
)

const Link: Component<{ children?: JSX.Element }> = (props) => (
  <a href="#" style={{ color: '#3498db', 'text-decoration': 'underline' }}>{props.children}</a>
)

const richComponents = { bold: Bold, italic: Italic, link: Link }

export default function RichTextPage() {
  return (
    <div>
      <h1>{t`Rich Text`}</h1>
      <p style={{ color: '#666', 'margin-bottom': '16px' }}>
        The Trans component renders rich text with embedded components, fully SSR-compatible.
      </p>

      <div style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: '16px',
      }}>
        <div style={{
          background: 'white',
          padding: '16px',
          'border-radius': '8px',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ 'margin-bottom': '8px' }}>Welcome Message</h3>
          <p>
            <Trans
              message={t`Welcome to <bold>Fluenti</bold> for <italic>SolidStart</italic>!`}
              components={richComponents}
            />
          </p>
        </div>

        <div style={{
          background: 'white',
          padding: '16px',
          'border-radius': '8px',
          'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ 'margin-bottom': '8px' }}>Feature List</h3>
          <p>
            <Trans
              message={t`Supports <bold>bold</bold>, <italic>italic</italic>, and <link>links</link>.`}
              components={richComponents}
            />
          </p>
        </div>
      </div>
    </div>
  )
}
