import { onMounted, onBeforeUnmount, watch, type Ref, shallowRef } from 'vue'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// GitHub Dark highlight style
const githubDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#ff7b72' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#e6edf3' },
  { tag: [t.propertyName], color: '#79c0ff' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: '#d2a8ff' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#79c0ff' },
  { tag: [t.definition(t.name), t.separator], color: '#e6edf3' },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#ffa657' },
  { tag: [t.number], color: '#79c0ff' },
  { tag: [t.operator, t.operatorKeyword], color: '#ff7b72' },
  { tag: [t.url, t.escape, t.regexp, t.link], color: '#a5d6ff' },
  { tag: [t.meta, t.comment], color: '#8b949e', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.heading, fontWeight: 'bold', color: '#79c0ff' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#79c0ff' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#a5d6ff' },
  { tag: t.invalid, color: '#f85149' },
  { tag: t.tagName, color: '#7ee787' },
  { tag: t.attributeName, color: '#79c0ff' },
  { tag: t.attributeValue, color: '#a5d6ff' },
])

const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#e6edf3',
    },
    '.cm-content': {
      caretColor: '#58a6ff',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#58a6ff',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'rgba(56, 139, 253, 0.25)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: '#484f58',
      borderRight: '1px solid var(--color-border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(56, 139, 253, 0.05)',
      color: '#e6edf3',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(56, 139, 253, 0.05)',
    },
  },
  { dark: true },
)

export function useCodeMirror(
  containerRef: Ref<HTMLElement | null>,
  content: Ref<string>,
  options: {
    readonly language?: Ref<Extension>
    readonly extensions?: readonly Extension[]
    readonly onChange?: (value: string) => void
  } = {},
) {
  const view = shallowRef<EditorView | null>(null)
  const languageCompartment = new Compartment()

  onMounted(() => {
    const el = containerRef.value
    if (!el) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const value = update.state.doc.toString()
        content.value = value
        options.onChange?.(value)
      }
    })

    const state = EditorState.create({
      doc: content.value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        syntaxHighlighting(githubDarkHighlight),
        darkTheme,
        languageCompartment.of(options.language?.value ?? []),
        updateListener,
        ...(options.extensions ?? []),
      ],
    })

    view.value = new EditorView({ state, parent: el })
  })

  watch(content, (newVal) => {
    const v = view.value
    if (!v) return
    const current = v.state.doc.toString()
    if (current === newVal) return
    v.dispatch({
      changes: { from: 0, to: current.length, insert: newVal },
    })
  })

  if (options.language) {
    watch(options.language, (newLang) => {
      const v = view.value
      if (!v) return
      v.dispatch({
        effects: languageCompartment.reconfigure(newLang),
      })
    })
  }

  onBeforeUnmount(() => {
    view.value?.destroy()
    view.value = null
  })

  return { view }
}
