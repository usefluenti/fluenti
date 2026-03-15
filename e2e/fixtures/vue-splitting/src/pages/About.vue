<template>
  <div data-testid="about-page">
    <h1 data-testid="about-title">{{ $t('About our project') }}</h1>
    <p data-testid="about-desc">{{ $t('Learn more about Fluenti.') }}</p>
    <p data-testid="contact">{{ $t('Contact us at {email}', { email: 'hello@fluenti.dev' }) }}</p>
  </div>
</template>
