<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@fluenti/vue'

const { locale, t, format } = useI18n()

const appleCount = ref(0)
const messageCount = ref(1)
const fileCount = ref(5)

// v-t.plural counter
const count = ref(3)
const vtPluralForms = computed(() => {
  const loc = locale.value
  if (loc === 'zh-CN') return { zero: '没有苹果', one: '1 个苹果', other: '# 个苹果' }
  if (loc === 'ja') return { zero: 'りんごなし', one: 'りんご 1 個', other: 'りんご # 個' }
  return { zero: 'No apples', one: '1 apple', other: '# apples' }
})

// Gender select
const gender = ref('female')

// Ordinal Plurals
const ordinalPattern = '{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}'
const ordinal1 = computed(() => format(ordinalPattern, { n: 1 }))
const ordinal2 = computed(() => format(ordinalPattern, { n: 2 }))
const ordinal3 = computed(() => format(ordinalPattern, { n: 3 }))
const ordinal4 = computed(() => format(ordinalPattern, { n: 4 }))

// Plural with Offset
const offsetPattern = '{n, plural, offset:1 =0 {Nobody liked this} =1 {You liked this} one {You and # other person liked this} other {You and # other people liked this}}'
const offset0 = computed(() => format(offsetPattern, { n: 0 }))
const offset1 = computed(() => format(offsetPattern, { n: 1 }))
const offset2 = computed(() => format(offsetPattern, { n: 2 }))
const offset5 = computed(() => format(offsetPattern, { n: 5 }))

// Nested ICU Messages
const nestedPattern = '{count, plural, =0 {{gender, select, male {He has no items} female {She has no items} other {They have no items}}} one {{gender, select, male {He has # item} female {She has # item} other {They have # item}}} other {{gender, select, male {He has # items} female {She has # items} other {They have # items}}}}'
const nested3 = computed(() => format(nestedPattern, { count: 3, gender: gender.value }))
const nested0 = computed(() => format(nestedPattern, { count: 0, gender: gender.value }))
const nested1 = computed(() => format(nestedPattern, { count: 1, gender: gender.value }))
</script>

<template>
  <h2 v-t>Plural Demos</h2>

  <div class="section">
    <h2>&lt;Plural&gt; — Apples</h2>
    <div class="controls">
      <button @click="appleCount = Math.max(0, appleCount - 1)" v-t>Remove</button>
      <span class="counter-display">{{ appleCount }}</span>
      <button @click="appleCount++" v-t>Add</button>
      <button @click="appleCount = 0" v-t>Reset</button>
    </div>
    <div class="demo-item">
      <div class="demo-label">&lt;Plural :value="appleCount" zero/one/other&gt;</div>
      <Plural
        :value="appleCount"
        zero="No apples"
        one="1 apple"
        other="# apples"
      />
    </div>
  </div>

  <div class="section">
    <h2>&lt;Plural&gt; — Messages</h2>
    <div class="controls">
      <button @click="messageCount = Math.max(0, messageCount - 1)" v-t>Remove</button>
      <span class="counter-display">{{ messageCount }}</span>
      <button @click="messageCount++" v-t>Add</button>
      <button @click="messageCount = 0" v-t>Reset</button>
    </div>
    <div class="demo-item">
      <div class="demo-label">&lt;Plural :value="messageCount" zero/one/other&gt;</div>
      <Plural
        :value="messageCount"
        zero="No new messages"
        one="1 new message"
        other="# new messages"
      />
    </div>
  </div>

  <div class="section">
    <h2>&lt;Plural&gt; — Files</h2>
    <div class="controls">
      <button @click="fileCount = Math.max(0, fileCount - 1)" v-t>Remove</button>
      <span class="counter-display">{{ fileCount }}</span>
      <button @click="fileCount++" v-t>Add</button>
      <button @click="fileCount = 0" v-t>Reset</button>
    </div>
    <div class="demo-item">
      <div class="demo-label">&lt;Plural :value="fileCount" zero/one/other&gt;</div>
      <Plural
        :value="fileCount"
        zero="No files selected"
        one="1 file selected"
        other="# files selected"
      />
    </div>
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>v-t.plural — Interactive Counter</h2>
    <div class="controls">
      <button @click="count = Math.max(0, count - 1)">−</button>
      <span class="counter-display">{{ count }}</span>
      <button @click="count++">+</button>
    </div>
    <Plural
      :value="count"
      v-bind="vtPluralForms"
    />
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>Feature: &lt;Select&gt; Component</h2>

    <div class="controls">
      <button
        v-for="g in ['male', 'female', 'other']"
        :key="g"
        :class="{ active: gender === g }"
        @click="gender = g"
      >
        {{ g }}
      </button>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;Select :value :options&gt; (type-safe)</div>
      <Select
        :value="gender"
        :options="{ male: t`He liked this`, female: t`She liked this` }"
        :other="t`They liked this`"
      />
    </div>
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>Feature: Ordinal Plurals</h2>
    <p class="section-desc">ICU <code>selectordinal</code> picks the suffix based on ordinal plural rules.</p>
    <div class="demo-item">
      <div class="demo-label">format('{n, selectordinal, ...}', { n })</div>
      <div>{{ ordinal1 }} place</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">2nd place</div>
      <div>{{ ordinal2 }} place</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">3rd place</div>
      <div>{{ ordinal3 }} place</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">4th place</div>
      <div>{{ ordinal4 }} place</div>
    </div>
  </div>

  <div class="section">
    <h2>Feature: Plural with Offset</h2>
    <p class="section-desc">Plural <code>offset</code> subtracts before selecting a form — useful for "you and N others" patterns.</p>
    <div class="demo-item">
      <div class="demo-label">offset:1 with 0 people</div>
      <div>{{ offset0 }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">offset:1 with 1 person</div>
      <div>{{ offset1 }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">offset:1 with 2 people</div>
      <div>{{ offset2 }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">offset:1 with 5 people</div>
      <div>{{ offset5 }}</div>
    </div>
  </div>

  <div class="section">
    <h2>Feature: Nested ICU Messages</h2>
    <p class="section-desc">ICU allows nesting — e.g. a <code>select</code> inside a <code>plural</code>, or vice versa.</p>
    <div class="demo-item">
      <div class="demo-label">select inside plural (gender-aware item count)</div>
      <div>{{ nested3 }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">Same pattern with count=0</div>
      <div>{{ nested0 }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">Same pattern with count=1</div>
      <div>{{ nested1 }}</div>
    </div>
  </div>
</template>
