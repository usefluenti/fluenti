<script setup lang="ts">
import { ref } from 'vue'

const appleCount = ref(0)
const messageCount = ref(1)
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
  </div>
</template>
