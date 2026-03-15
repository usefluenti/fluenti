import { ref } from 'vue'
import { presets } from '../lib/presets'
import type { Preset } from '../lib/presets'
import type { SourceLanguage } from '../lib/extract'

export function usePresets(
  onSelect: (code: string, language: SourceLanguage) => void,
) {
  const activePreset = ref<string>(presets[0]!.name)

  function selectPreset(preset: Preset) {
    activePreset.value = preset.name
    onSelect(preset.code, preset.language)
  }

  return {
    presets,
    activePreset,
    selectPreset,
  }
}
