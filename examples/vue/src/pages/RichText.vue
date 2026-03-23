<script setup lang="ts">
</script>

<template>
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

    <div class="demo-item">
      <div class="demo-label">With internal links</div>
      <Trans>Go to the <a href="#" @click.prevent>home page</a> or check out <a href="#" @click.prevent>plurals</a>.</Trans>
    </div>

    <div class="demo-item">
      <div class="demo-label">Styled link</div>
      <Trans>Read the <a href="#" class="styled-link" @click.prevent>getting started guide</a> for setup instructions.</Trans>
    </div>
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>v-t with Rich Text (HTML Children)</h2>

    <div class="demo-item">
      <div class="demo-label">v-t with &lt;a&gt; child (rich text)</div>
      <p v-t>Read the <a href="/terms">terms of service</a> before continuing</p>
    </div>

    <div class="demo-item">
      <div class="demo-label">v-t with &lt;strong&gt; child</div>
      <p v-t>This is <strong>very important</strong> information</p>
    </div>
  </div>
</template>
