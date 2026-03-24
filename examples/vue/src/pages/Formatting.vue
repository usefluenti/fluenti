<script setup lang="ts">
const now = Date.now()
const pastDate = new Date(Date.now() - 86400000 * 3)
</script>

<template>
  <h2 v-t>Formatting Demos</h2>

  <div class="section">
    <h2>Feature: &lt;DateTime&gt; Date Formatting</h2>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="now" /&gt; — default</div>
      <div><DateTime :value="now" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="now" format="short" /&gt;</div>
      <div><DateTime :value="now" format="short" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="now" format="long" /&gt;</div>
      <div><DateTime :value="now" format="long" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="pastDate" format="relative" /&gt; — past date</div>
      <div><DateTime :value="pastDate" format="relative" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="now" format="datetime" /&gt;</div>
      <div><DateTime :value="now" format="datetime" /></div>
    </div>
  </div>

  <div class="section">
    <h2>Feature: &lt;NumberFormat&gt; Number Formatting</h2>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="1234567.89" /&gt; — default</div>
      <div><NumberFormat :value="1234567.89" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="42.5" format="currency" /&gt;</div>
      <div><NumberFormat :value="42.5" format="currency" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="0.856" format="percent" /&gt;</div>
      <div><NumberFormat :value="0.856" format="percent" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="1234.5" format="decimal" /&gt;</div>
      <div><NumberFormat :value="1234.5" format="decimal" /></div>
    </div>
  </div>
</template>
