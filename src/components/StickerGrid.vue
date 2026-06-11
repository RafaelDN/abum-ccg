<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { rarityLabels } from '../data/album'
import type { Sticker } from '../data/album'

defineProps<{
  stickers: Sticker[]
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [sticker: Sticker]
}>()

const tapMoveTolerance = 14
const tapDurationLimit = 450
const touchStarts = new Map<string, { x: number; y: number; startedAt: number }>()
let lastTouchSelectAt = 0
let suppressStickerClickUntil = 0

function selectSticker(sticker: Sticker) {
  if (sticker.status === 'placeholder') return

  emit('select', sticker)
}

function selectStickerFromClick(sticker: Sticker) {
  if (Date.now() < suppressStickerClickUntil) return
  if (Date.now() - lastTouchSelectAt < 500) return

  selectSticker(sticker)
}

function rememberStickerTouch(sticker: Sticker, event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return

  touchStarts.set(sticker.id, {
    x: touch.clientX,
    y: touch.clientY,
    startedAt: Date.now(),
  })
}

function selectStickerFromTouch(sticker: Sticker, event: TouchEvent) {
  const touch = event.changedTouches[0]
  const touchStart = touchStarts.get(sticker.id)
  touchStarts.delete(sticker.id)

  if (!touch || !touchStart) return

  const movedX = Math.abs(touch.clientX - touchStart.x)
  const movedY = Math.abs(touch.clientY - touchStart.y)
  const elapsed = Date.now() - touchStart.startedAt

  if (movedX > tapMoveTolerance || movedY > tapMoveTolerance || elapsed > tapDurationLimit) {
    return
  }

  lastTouchSelectAt = Date.now()
  selectSticker(sticker)
}

function stickerStyle(sticker: Sticker) {
  return {
    '--sticker-rotation': `${sticker.tilt ?? 0}deg`,
  }
}

function suppressStickerClick() {
  suppressStickerClickUntil = Date.now() + 650
}

onMounted(() => {
  window.addEventListener('album-swipe-on-sticker', suppressStickerClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('album-swipe-on-sticker', suppressStickerClick)
})
</script>

<template>
  <div class="sticker-grid" :class="{ 'sticker-grid--compact': compact }">
    <figure
      v-for="sticker in stickers"
      :key="sticker.id"
      class="sticker-card"
      :class="[
        { 'sticker-card--placeholder': sticker.status === 'placeholder' },
        sticker.rarity ? `sticker-card--rarity-${sticker.rarity}` : '',
      ]"
      :style="stickerStyle(sticker)"
    >
      <div
        v-if="sticker.image"
        class="sticker-card__button"
        role="button"
        tabindex="0"
        data-sticker-action
        :aria-label="`Abrir ${sticker.title}`"
        @click="selectStickerFromClick(sticker)"
        @keydown.enter="selectSticker(sticker)"
        @keydown.space.prevent="selectSticker(sticker)"
        @touchstart="rememberStickerTouch(sticker, $event)"
        @touchend="selectStickerFromTouch(sticker, $event)"
      >
        <span class="sticker-card__code">{{ sticker.code }}</span>
        <span v-if="sticker.rarity" class="sticker-card__badge">
          {{ rarityLabels[sticker.rarity] }}
        </span>
        <img :src="sticker.image" :alt="sticker.title" />
      </div>
      <div v-else class="sticker-placeholder" :aria-label="`${sticker.code} ainda não revelada`">
        <span class="sticker-placeholder__code">{{ sticker.code }}</span>
        <span class="sticker-placeholder__frame" aria-hidden="true">
          <span class="sticker-placeholder__silhouette"></span>
        </span>
        <span class="sticker-placeholder__text">Ainda não revelada</span>
      </div>
      <figcaption>
        <span>{{ sticker.title }}</span>
        <small>{{ sticker.code }}</small>
      </figcaption>
    </figure>
  </div>
</template>
