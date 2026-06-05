<script setup lang="ts">
import type { Sticker } from '../data/album'

defineProps<{
  stickers: Sticker[]
  compact?: boolean
}>()

defineEmits<{
  select: [sticker: Sticker]
}>()
</script>

<template>
  <div class="sticker-grid" :class="{ 'sticker-grid--compact': compact }">
    <figure
      v-for="sticker in stickers"
      :key="sticker.id"
      class="sticker-card"
      :class="{ 'sticker-card--placeholder': sticker.status === 'placeholder' }"
    >
      <div
        v-if="sticker.image"
        class="sticker-card__button"
        role="button"
        tabindex="0"
        data-sticker-action
        :aria-label="`Abrir ${sticker.title}`"
        @click="$emit('select', sticker)"
        @keydown.enter="$emit('select', sticker)"
        @keydown.space.prevent="$emit('select', sticker)"
      >
        <img :src="sticker.image" :alt="sticker.title" />
      </div>
      <div v-else class="sticker-placeholder" aria-hidden="true">
        <span>+</span>
      </div>
      <figcaption>{{ sticker.title }}</figcaption>
    </figure>
  </div>
</template>
