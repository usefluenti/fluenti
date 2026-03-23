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
      <div class="demo-label">&lt;DateTime :value="now" style="short" /&gt;</div>
      <div><DateTime :value="now" style="short" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="now" style="long" /&gt;</div>
      <div><DateTime :value="now" style="long" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="pastDate" style="relative" /&gt; — past date</div>
      <div><DateTime :value="pastDate" style="relative" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;DateTime :value="now" style="datetime" /&gt;</div>
      <div><DateTime :value="now" style="datetime" /></div>
    </div>
  </div>

  <div class="section">
    <h2>Feature: &lt;NumberFormat&gt; Number Formatting</h2>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="1234567.89" /&gt; — default</div>
      <div><NumberFormat :value="1234567.89" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="42.5" style="currency" /&gt;</div>
      <div><NumberFormat :value="42.5" style="currency" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="0.856" style="percent" /&gt;</div>
      <div><NumberFormat :value="0.856" style="percent" /></div>
    </div>

    <div class="demo-item">
      <div class="demo-label">&lt;NumberFormat :value="1234.5" style="decimal" /&gt;</div>
      <div><NumberFormat :value="1234.5" style="decimal" /></div>
    </div>
  </div>
</template>
