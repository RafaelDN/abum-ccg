<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AlbumPage, Sticker } from '../data/album'
import StickerGrid from './StickerGrid.vue'

const props = defineProps<{
  pages: AlbumPage[]
}>()

const isAlbumOpen = ref(false)
const currentPageIndex = ref(0)
const direction = ref<'next' | 'previous'>('next')
const coverDragStartX = ref(0)
const coverDragX = ref(0)
const isDraggingCover = ref(false)
const suppressCoverClick = ref(false)
const dragStartX = ref(0)
const dragX = ref(0)
const isDragging = ref(false)
const selectedSticker = ref<Sticker | null>(null)
const descriptionContent = ref('')
const modalTiltX = ref(0)
const modalTiltY = ref(0)
const isTiltingSticker = ref(false)
const coverLogo = `${import.meta.env.BASE_URL}logo-co-gole.svg`

const currentPage = computed(() => props.pages[currentPageIndex.value])
const canGoBack = computed(() => isAlbumOpen.value && currentPageIndex.value > 0)
const canGoForward = computed(() => !isAlbumOpen.value || currentPageIndex.value + 1 < props.pages.length)
const pageCounter = computed(() => {
  if (!isAlbumOpen.value || !currentPage.value) return 'Capa'
  return `${currentPage.value.number} / ${props.pages.length}`
})
const coverDragProgress = computed(() => {
  const maxDrag = 220
  const clamped = Math.max(-maxDrag, Math.min(0, coverDragX.value))

  return Math.abs(clamped) / maxDrag
})
const coverStyle = computed(() => {
  if (!isDraggingCover.value) return {}

  const rotation = coverDragProgress.value * -36
  const lift = coverDragProgress.value * 8

  return {
    transform: `translateY(${-lift}px) rotateY(${rotation}deg)`,
  }
})
const dragProgress = computed(() => {
  const maxDrag = 220
  const clamped = Math.max(-maxDrag, Math.min(maxDrag, dragX.value))

  return clamped / maxDrag
})
const pageStyle = computed(() => {
  if (!isDragging.value) return {}

  const progress = dragProgress.value
  const rotation = progress * 38
  const lift = Math.abs(progress) * 10

  return {
    transform: `translateY(${-lift}px) rotateY(${rotation}deg)`,
  }
})
const modalStickerStyle = computed(() => {
  if (!isTiltingSticker.value) return {}

  return {
    transform: `rotateX(${modalTiltX.value}deg) rotateY(${modalTiltY.value}deg) translateZ(18px)`,
  }
})

function goToPreviousSpread() {
  if (!isAlbumOpen.value) return
  if (currentPageIndex.value === 0) {
    closeAlbum()
    return
  }

  direction.value = 'previous'
  currentPageIndex.value = Math.max(0, currentPageIndex.value - 1)
}

function goToNextSpread() {
  if (!canGoForward.value) return

  if (!isAlbumOpen.value) {
    openAlbum()
    return
  }

  direction.value = 'next'
  currentPageIndex.value += 1
}

function openAlbum() {
  isAlbumOpen.value = true
  direction.value = 'next'
  currentPageIndex.value = 0
  isDraggingCover.value = false
  coverDragX.value = 0
}

function onCoverClick() {
  if (suppressCoverClick.value) {
    suppressCoverClick.value = false
    return
  }

  openAlbum()
}

function closeAlbum() {
  isAlbumOpen.value = false
  direction.value = 'previous'
  currentPageIndex.value = 0
}

function onCoverPointerDown(event: PointerEvent) {
  if (event.button !== 0 && event.pointerType === 'mouse') return

  isDraggingCover.value = true
  coverDragStartX.value = event.clientX
  coverDragX.value = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onCoverPointerMove(event: PointerEvent) {
  if (!isDraggingCover.value) return
  coverDragX.value = event.clientX - coverDragStartX.value
}

function finishCoverDrag(event: PointerEvent) {
  if (!isDraggingCover.value) return

  const shouldOpen = coverDragX.value < -54
  suppressCoverClick.value = Math.abs(coverDragX.value) > 6

  isDraggingCover.value = false
  coverDragX.value = 0
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)

  if (shouldOpen) openAlbum()
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 && event.pointerType === 'mouse') return
  if ((event.target as HTMLElement).closest('[data-sticker-action]')) return

  isDragging.value = true
  dragStartX.value = event.clientX
  dragX.value = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  dragX.value = event.clientX - dragStartX.value
}

function finishDrag(event: PointerEvent) {
  if (!isDragging.value) return

  const threshold = 72
  const shouldGoNext = dragX.value < -threshold
  const shouldGoBack = dragX.value > threshold

  isDragging.value = false
  dragX.value = 0
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)

  if (shouldGoNext) goToNextSpread()
  if (shouldGoBack) goToPreviousSpread()
}

async function openSticker(sticker: Sticker) {
  selectedSticker.value = sticker
  descriptionContent.value = 'Carregando descricao...'

  if (!sticker.description) {
    descriptionContent.value = 'Descricao ainda nao cadastrada.'
    return
  }

  try {
    const response = await fetch(sticker.description)
    descriptionContent.value = response.ok
      ? await response.text()
      : 'Descricao ainda nao cadastrada.'
  } catch {
    descriptionContent.value = 'Descricao ainda nao cadastrada.'
  }
}

function closeSticker() {
  selectedSticker.value = null
  descriptionContent.value = ''
  modalTiltX.value = 0
  modalTiltY.value = 0
  isTiltingSticker.value = false
}

function onModalStickerMove(event: PointerEvent) {
  isTiltingSticker.value = true
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (event.clientX - bounds.left) / bounds.width - 0.5
  const y = (event.clientY - bounds.top) / bounds.height - 0.5

  modalTiltX.value = y * -14
  modalTiltY.value = x * 18
}

function resetModalTilt() {
  modalTiltX.value = 0
  modalTiltY.value = 0
  isTiltingSticker.value = false
}
</script>

<template>
  <section class="album">
    <div class="album__header">
      <div>
        <p class="album__eyebrow">Album compromisso - 2026</p>
      </div>

      <div class="album-controls" aria-label="Navegacao de paginas">
        <button type="button" :disabled="!canGoBack" aria-label="Pagina anterior" @click="goToPreviousSpread">
          <span aria-hidden="true">&lt;</span>
        </button>
        <output>{{ pageCounter }}</output>
        <button type="button" :disabled="!canGoForward" aria-label="Proxima pagina" @click="goToNextSpread">
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
    </div>

    <div class="album-stage">
      <button
        v-if="!isAlbumOpen"
        class="album-cover"
        :class="{ 'album-cover--dragging': isDraggingCover }"
        :style="coverStyle"
        type="button"
        @click="onCoverClick"
        @pointerdown="onCoverPointerDown"
        @pointermove="onCoverPointerMove"
        @pointerup="finishCoverDrag"
        @pointercancel="finishCoverDrag"
      >
        <p class="album__title">Album compromisso - 2026</p>
        <img :src="coverLogo" alt="Co Gole" />
      </button>

      <div
        v-else
        :key="`${currentPageIndex}-${direction}`"
        class="spread-shell spread-shell--page"
        :class="{
          'spread-shell--dragging': isDragging,
          'turn-next': !isDragging && direction === 'next',
          'turn-previous': !isDragging && direction === 'previous',
        }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="finishDrag"
        @pointercancel="finishDrag"
      >
        <article
          v-if="currentPage"
          class="album-page album-page--spread album-page--single"
          :style="pageStyle"
        >
          <div class="album-page__topline">
            <span>{{ currentPage.title }}</span>
          </div>
          <StickerGrid :stickers="currentPage.stickers" compact @select="openSticker" />
        </article>
      </div>
    </div>

    <div
      v-if="selectedSticker"
      class="sticker-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedSticker.title"
      @click.self="closeSticker"
    >
      <article class="sticker-modal__panel">
        <button class="sticker-modal__close" type="button" aria-label="Fechar" @click="closeSticker">
          x
        </button>

        <div class="sticker-modal__figure">
          <div
            class="sticker-modal__tilt"
            :style="modalStickerStyle"
            @pointermove="onModalStickerMove"
            @pointerleave="resetModalTilt"
          >
            <img :src="selectedSticker.image" :alt="selectedSticker.title" />
          </div>
        </div>

        <div class="sticker-modal__description">
          <p class="album__eyebrow">Descricao</p>
          <h2>{{ selectedSticker.title }}</h2>
          <div class="sticker-modal__text">{{ descriptionContent }}</div>
        </div>
      </article>
    </div>
  </section>
</template>
