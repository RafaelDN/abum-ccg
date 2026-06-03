<script setup lang="ts">
import AlbumSpread from './components/AlbumSpread.vue'
import { albumPages } from './data/album'
</script>

<template>
  <main class="app-shell">
    <AlbumSpread :pages="albumPages" />
  </main>
</template>
