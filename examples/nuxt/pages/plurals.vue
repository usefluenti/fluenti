<script setup lang="ts">
import { ref } from 'vue'

const appleCount = ref(0)
const messageCount = ref(1)
const gender = ref('other')
</script>

<template>
  <div>
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
        <div class="demo-label">&lt;Select :value="gender" ...&gt;</div>
        <Select
          :value="gender"
          :options="{ male: 'He liked this', female: 'She liked this' }"
          other="They liked this"
        />
      </div>
    </div>
  </div>
</template>
