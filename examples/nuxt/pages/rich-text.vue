<script setup lang="ts">
</script>

<template>
  <div>
    <h2 v-t>Rich Text Demos</h2>

    <div class="section">
      <h2>&lt;Trans&gt; — Rich Text with Components</h2>

      <div class="demo-item">
        <div class="demo-label">Link example (external &lt;a&gt;)</div>
        <Trans>Visit our <a href="https://github.com" target="_blank">documentation</a> to learn more.</Trans>
      </div>

      <div class="demo-item">
        <div class="demo-label">Bold example (&lt;strong&gt;)</div>
        <Trans>This is <strong>important</strong> information.</Trans>
      </div>

      <div class="demo-item">
        <div class="demo-label">Combined: link + bold</div>
        <Trans>Please <a href="#" @click.prevent>sign in</a> or <strong>register</strong> to continue.</Trans>
      </div>
    </div>
  </div>
</template>

<style scoped>
a {
  color: #00dc82;
  text-decoration: underline;
}

strong {
  color: #e74c3c;
}
</style>
