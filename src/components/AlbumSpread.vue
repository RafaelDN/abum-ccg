<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { FlipSetting, PageFlip } from 'page-flip'
import featureFlags from '../data/feature-flags.json'
import { rarityLabels } from '../data/album'
import type { AlbumPage, Sticker } from '../data/album'
import StickerGrid from './StickerGrid.vue'

type PageFlipConstructor = new (
  parent: HTMLElement,
  settings: Partial<FlipSetting>,
) => PageFlip

type PageFlipModule = {
  PageFlip?: PageFlipConstructor
  default?: {
    PageFlip?: PageFlipConstructor
  }
}

type BookPage =
  | {
      key: string
      kind: 'cover'
      density: 'hard'
      title: string
      subtitle: string
    }
  | {
      key: string
      kind: 'content'
      density: 'soft'
      page: AlbumPage
    }
  | {
      key: string
      kind: 'back'
      density: 'hard'
      title: string
      subtitle: string
    }

const props = defineProps<{
  pages: AlbumPage[]
}>()

const currentPageIndex = ref(0)
const pageCount = ref(0)
const selectedSticker = ref<Sticker | null>(null)
const descriptionContent = ref('')
const shareStatus = ref('')
const modalTiltX = ref(0)
const modalTiltY = ref(0)
const isTiltingSticker = ref(false)
const isRevealingSticker = ref(false)
const seenStickerIds = ref<Set<string>>(new Set())
const isRevealStateReady = ref(false)
const albumBookRef = ref<HTMLElement | null>(null)
const pageFlip = shallowRef<PageFlip | null>(null)
const coverLogo = `${import.meta.env.BASE_URL}logo-co-gole.svg`
const stickerRevealFeature = featureFlags.stickerReveal
const pageGestureThreshold = 54
const pageGestureTapTolerance = 12
const modalGestureThreshold = 60
const revealAnimationDurationMs = 900

let revealTimer: ReturnType<typeof setTimeout> | null = null

let pageGestureStart: {
  pointerId: number
  pageIndex: number
  startedOnStickerAction: boolean
  x: number
  y: number
} | null = null

let modalGestureStart: {
  pointerId: number
  x: number
  y: number
} | null = null

const modalMouseGestureId = -1

const pageFlipSettings = {
  width: 550,
  height: 733,
  size: 'stretch',
  minWidth: 200,
  maxWidth: 560,
  minHeight: 347,
  maxHeight: 746,
  maxShadowOpacity: 0.5,
  showCover: true,
  mobileScrollSupport: false,
  useMouseEvents: false,
  disableFlipByClick: true,
} satisfies Partial<FlipSetting>

const bookPages = computed<BookPage[]>(() => {
  const contentPages = props.pages.map(
    (page): BookPage => ({
      key: `page-${page.number}`,
      kind: 'content',
      density: 'soft',
      page,
    }),
  )

  return [
    {
      key: 'cover',
      kind: 'cover',
      density: 'hard',
      title: 'Album compromisso - 2026',
      subtitle: 'Abra para virar as paginas',
    },
    ...contentPages,
    {
      key: 'back-cover',
      kind: 'back',
      density: 'hard',
      title: 'Fim do album',
      subtitle: 'Volte para rever as figurinhas',
    },
  ]
})

const allStickers = computed(() => props.pages.flatMap((page) => page.stickers))
const readyStickers = computed(() =>
  allStickers.value.filter((sticker) => sticker.status === 'ready'),
)
const concealedStickerIds = computed(() =>
  allStickers.value.filter((sticker) => isStickerConcealed(sticker)).map((sticker) => sticker.id),
)
const canGoBack = computed(() => currentPageIndex.value > 0)
const canGoForward = computed(() => currentPageIndex.value < pageCount.value - 1)
const pageCounter = computed(() => {
  if (currentPageIndex.value === 0) return 'Capa'
  if (currentPageIndex.value === pageCount.value - 1) return 'Contracapa'
  return `${currentPageIndex.value} / ${props.pages.length}`
})
const modalStickerStyle = computed(() => {
  if (!isTiltingSticker.value) return {}

  return {
    transform: `rotateX(${modalTiltX.value}deg) rotateY(${modalTiltY.value}deg) translateZ(18px)`,
  }
})
const selectedStickerRarityLabel = computed(() => {
  const rarity = selectedSticker.value?.rarity

  return rarity ? rarityLabels[rarity] : ''
})
const isSelectedStickerConcealed = computed(() =>
  selectedSticker.value ? isStickerConcealed(selectedSticker.value) : false,
)

function getBookPages(): HTMLElement[] {
  const bookRoot = albumBookRef.value
  if (!bookRoot) return []

  return Array.from(bookRoot.querySelectorAll<HTMLElement>('.album-book__page'))
}

async function resolvePageFlipConstructor(): Promise<PageFlipConstructor | null> {
  const pageFlipModule = (await import('page-flip')) as unknown as PageFlipModule

  return pageFlipModule.PageFlip ?? pageFlipModule.default?.PageFlip ?? null
}

async function bindPageFlip() {
  if (pageFlip.value || !albumBookRef.value) return

  const pages = getBookPages()
  if (pages.length === 0) return

  const PageFlipConstructor = await resolvePageFlipConstructor()
  if (!PageFlipConstructor || pageFlip.value || !albumBookRef.value) return

  const instance = markRaw(new PageFlipConstructor(albumBookRef.value, pageFlipSettings))
  instance.on('flip', ({ data }) => {
    currentPageIndex.value = Number(data)
  })
  instance.on('init', ({ data }) => {
    currentPageIndex.value = Number(data.page)
    pageCount.value = instance.getPageCount()
  })

  pageFlip.value = instance
  instance.loadFromHTML(pages)
  pageCount.value = instance.getPageCount()
}

function flipToBookPage(pageIndex: number) {
  if (!pageFlip.value) return

  const nextPageIndex = Math.max(0, Math.min(pageIndex, pageCount.value - 1))
  const settings = pageFlip.value.getSettings()
  const previousDisableFlipByClick = settings.disableFlipByClick

  settings.disableFlipByClick = false
  pageFlip.value.flip(nextPageIndex, 'top')
  settings.disableFlipByClick = previousDisableFlipByClick
}

function goToPreviousSpread() {
  if (!pageFlip.value) return

  const currentIndex = pageFlip.value.getCurrentPageIndex()
  const previousIndex =
    pageFlip.value.getOrientation() === 'portrait'
      ? currentIndex - 1
      : currentIndex <= 1
        ? 0
        : currentIndex - 2

  flipToBookPage(previousIndex)
}

function goToNextSpread() {
  if (!pageFlip.value) return

  const currentIndex = pageFlip.value.getCurrentPageIndex()
  const nextIndex =
    pageFlip.value.getOrientation() === 'portrait'
      ? currentIndex + 1
      : currentIndex === 0
        ? 1
        : currentIndex + 2

  flipToBookPage(nextIndex)
}

function shouldIgnorePageGesture(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  return Boolean(target.closest('a, button, input, select, textarea'))
}

function capturePageGesture(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (shouldIgnorePageGesture(event.target)) return

  const startedOnStickerAction =
    event.target instanceof Element && Boolean(event.target.closest('[data-sticker-action]'))

  pageGestureStart = {
    pointerId: event.pointerId,
    pageIndex: currentPageIndex.value,
    startedOnStickerAction,
    x: event.clientX,
    y: event.clientY,
  }

  if (startedOnStickerAction) return

  try {
    const stage = event.currentTarget as HTMLElement
    stage.setPointerCapture(event.pointerId)
  } catch {
    // Some browser/page-flip combinations can release capture during animation.
  }
}

function releasePageGestureCapture(event: PointerEvent) {
  try {
    const stage = event.currentTarget as HTMLElement
    stage.releasePointerCapture(event.pointerId)
  } catch {
    // Capture may already have been released.
  }
}

function finishPageGesture(event: PointerEvent) {
  if (!pageGestureStart || pageGestureStart.pointerId !== event.pointerId) return

  const gesture = pageGestureStart
  pageGestureStart = null
  releasePageGestureCapture(event)

  const deltaX = event.clientX - gesture.x
  const deltaY = event.clientY - gesture.y
  const isHorizontalSwipe =
    Math.abs(deltaX) >= pageGestureThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.25

  if (isHorizontalSwipe) {
    event.preventDefault()

    if (gesture.startedOnStickerAction) {
      suppressStickerClickAfterSwipe()
    }

    if (deltaX < 0) {
      goToNextSpread()
    } else {
      goToPreviousSpread()
    }

    return
  }

  const isTap =
    Math.abs(deltaX) <= pageGestureTapTolerance && Math.abs(deltaY) <= pageGestureTapTolerance

  if (isTap && gesture.pageIndex === 0) {
    event.preventDefault()
    goToNextSpread()
  }
}

function cancelPageGesture(event: PointerEvent) {
  if (pageGestureStart?.pointerId !== event.pointerId) return

  pageGestureStart = null
  releasePageGestureCapture(event)
}

function shouldIgnoreModalGesture(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  return Boolean(target.closest('button, a, input, select, textarea'))
}

function captureModalGesture(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (shouldIgnoreModalGesture(event.target)) return

  if (modalGestureStart) {
    modalGestureStart = null
    clearModalGestureListeners()
  }

  modalGestureStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  }

  window.addEventListener('pointermove', moveModalGesture)
  window.addEventListener('pointerup', finishModalGesture)
  window.addEventListener('pointercancel', cancelModalGesture)
  window.addEventListener('mousemove', moveModalMouseGesture)
  window.addEventListener('mouseup', finishModalMouseGesture)
}

function clearModalGestureListeners() {
  window.removeEventListener('pointermove', moveModalGesture)
  window.removeEventListener('pointerup', finishModalGesture)
  window.removeEventListener('pointercancel', cancelModalGesture)
  window.removeEventListener('mousemove', moveModalMouseGesture)
  window.removeEventListener('mouseup', finishModalMouseGesture)
}

function getModalGestureDirection(clientX: number, clientY: number) {
  if (!modalGestureStart) return

  const deltaX = clientX - modalGestureStart.x
  const deltaY = clientY - modalGestureStart.y
  const isHorizontalSwipe =
    Math.abs(deltaX) >= modalGestureThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.25

  if (!isHorizontalSwipe) return null

  return deltaX < 0 ? 1 : -1
}

function moveModalGesture(event: PointerEvent) {
  if (modalGestureStart?.pointerId !== event.pointerId) return

  const direction = getModalGestureDirection(event.clientX, event.clientY)
  if (!direction) return

  event.preventDefault()
  modalGestureStart = null
  clearModalGestureListeners()

  openAdjacentSticker(direction)
}

function finishModalGesture(event: PointerEvent) {
  if (modalGestureStart?.pointerId !== event.pointerId) return

  const direction = getModalGestureDirection(event.clientX, event.clientY)

  modalGestureStart = null
  clearModalGestureListeners()

  if (!direction) return

  event.preventDefault()
  openAdjacentSticker(direction)
}

function cancelModalGesture(event: PointerEvent) {
  if (modalGestureStart?.pointerId !== event.pointerId) return

  modalGestureStart = null
  clearModalGestureListeners()
}

function captureModalMouseGesture(event: MouseEvent) {
  if (!selectedSticker.value) return
  if (event.button !== 0) return
  if (shouldIgnoreModalGesture(event.target)) return

  if (modalGestureStart) {
    modalGestureStart = null
    clearModalGestureListeners()
  }

  modalGestureStart = {
    pointerId: modalMouseGestureId,
    x: event.clientX,
    y: event.clientY,
  }

  window.addEventListener('mousemove', moveModalMouseGesture)
  window.addEventListener('mouseup', finishModalMouseGesture)
}

function captureWindowModalMouseGesture(event: MouseEvent) {
  if (!selectedSticker.value) return
  if (event.button !== 0) return
  if (shouldIgnoreModalGesture(event.target)) return

  if (modalGestureStart) {
    modalGestureStart = null
    clearModalGestureListeners()
  }

  modalGestureStart = {
    pointerId: modalMouseGestureId,
    x: event.clientX,
    y: event.clientY,
  }

  window.addEventListener('mousemove', moveModalMouseGesture)
  window.addEventListener('mouseup', finishModalMouseGesture)
}

function moveModalMouseGesture(event: MouseEvent) {
  if (!modalGestureStart) return

  const direction = getModalGestureDirection(event.clientX, event.clientY)
  if (!direction) return

  event.preventDefault()
  modalGestureStart = null
  clearModalGestureListeners()

  openAdjacentSticker(direction)
}

function finishModalMouseGesture(event: MouseEvent) {
  if (!modalGestureStart) return

  const direction = getModalGestureDirection(event.clientX, event.clientY)

  modalGestureStart = null
  clearModalGestureListeners()

  if (!direction) return

  event.preventDefault()
  openAdjacentSticker(direction)
}

function suppressStickerClickAfterSwipe() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('album-swipe-on-sticker'))
}

function isStickerConcealed(sticker: Sticker) {
  return (
    stickerRevealFeature.enabled &&
    isRevealStateReady.value &&
    sticker.status === 'ready' &&
    Boolean(sticker.revealOnFirstView) &&
    !seenStickerIds.value.has(sticker.id)
  )
}

function getStoredSeenStickerIds() {
  if (typeof window === 'undefined') return new Set<string>()

  try {
    const storedValue = window.localStorage.getItem(stickerRevealFeature.storageKey)
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : []
    const stickerIds = Array.isArray(parsedValue)
      ? parsedValue.filter((id) => typeof id === 'string')
      : []

    return new Set(stickerIds)
  } catch {
    return new Set<string>()
  }
}

function persistSeenStickerIds(nextSeenStickerIds: Set<string>) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      stickerRevealFeature.storageKey,
      JSON.stringify([...nextSeenStickerIds]),
    )
  } catch {
    // Storage can be unavailable in private or restricted browser modes.
  }
}

function markStickerSeen(sticker: Sticker) {
  const nextSeenStickerIds = new Set(seenStickerIds.value)
  nextSeenStickerIds.add(sticker.id)
  seenStickerIds.value = nextSeenStickerIds
  persistSeenStickerIds(nextSeenStickerIds)
}

function clearRevealTimer() {
  if (!revealTimer) return

  clearTimeout(revealTimer)
  revealTimer = null
}

function revealSelectedSticker() {
  const sticker = selectedSticker.value
  if (!sticker || !isStickerConcealed(sticker) || isRevealingSticker.value) return

  isRevealingSticker.value = true
  clearRevealTimer()

  if (typeof window === 'undefined') {
    markStickerSeen(sticker)
    isRevealingSticker.value = false
    return
  }

  revealTimer = window.setTimeout(() => {
    markStickerSeen(sticker)
    isRevealingSticker.value = false
    revealTimer = null
  }, revealAnimationDurationMs)
}

function syncSeenStickersFromStorage(event: StorageEvent) {
  if (event.key !== stickerRevealFeature.storageKey && event.key !== null) return

  seenStickerIds.value = getStoredSeenStickerIds()
}

function getAdjacentSticker(offset: 1 | -1) {
  const sticker = selectedSticker.value
  const stickers = readyStickers.value
  if (!sticker || stickers.length === 0) return null

  const currentIndex = stickers.findIndex((currentSticker) => currentSticker.id === sticker.id)
  if (currentIndex < 0) return null

  return stickers[(currentIndex + offset + stickers.length) % stickers.length] ?? null
}

function openAdjacentSticker(offset: 1 | -1) {
  const sticker = getAdjacentSticker(offset)
  if (!sticker) return

  void openSticker(sticker, { syncPage: false })
}

function getStickerShareUrl(sticker: Sticker) {
  if (typeof window === 'undefined') return ''

  const url = new URL(window.location.href)
  url.searchParams.set('sticker', sticker.code)
  url.hash = ''

  return url.toString()
}

function updateStickerUrl(sticker: Sticker) {
  const url = getStickerShareUrl(sticker)
  if (!url || window.location.href === url) return

  window.history.pushState({ sticker: sticker.code }, '', url)
}

function clearStickerUrl() {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (!url.searchParams.has('sticker')) return

  url.searchParams.delete('sticker')
  window.history.replaceState({}, '', url)
}

function flipToStickerPage(sticker: Sticker) {
  const pageIndex = props.pages.findIndex((page) =>
    page.stickers.some((pageSticker) => pageSticker.code === sticker.code),
  )

  if (pageIndex >= 0) {
    flipToBookPage(pageIndex + 1)
  }
}

async function openSticker(
  sticker: Sticker,
  options: { updateUrl?: boolean; syncPage?: boolean } = {},
) {
  if (sticker.status === 'placeholder') return

  clearRevealTimer()
  isRevealingSticker.value = false
  selectedSticker.value = sticker
  descriptionContent.value = 'Carregando descricao...'
  shareStatus.value = ''

  if (options.updateUrl !== false) {
    updateStickerUrl(sticker)
  }

  if (options.syncPage !== false) {
    flipToStickerPage(sticker)
  }

  if (!sticker.description) {
    if (selectedSticker.value?.id === sticker.id) {
      descriptionContent.value = 'Descricao ainda nao cadastrada.'
    }
    return
  }

  try {
    const response = await fetch(sticker.description)
    const nextDescription = response.ok
      ? await response.text()
      : 'Descricao ainda nao cadastrada.'

    if (selectedSticker.value?.id === sticker.id) {
      descriptionContent.value = nextDescription
    }
  } catch {
    if (selectedSticker.value?.id === sticker.id) {
      descriptionContent.value = 'Descricao ainda nao cadastrada.'
    }
  }
}

function closeSticker(options: { updateUrl?: boolean } = {}) {
  clearRevealTimer()
  selectedSticker.value = null
  descriptionContent.value = ''
  shareStatus.value = ''
  modalTiltX.value = 0
  modalTiltY.value = 0
  isTiltingSticker.value = false
  isRevealingSticker.value = false

  if (options.updateUrl !== false) {
    clearStickerUrl()
  }
}

function openStickerFromUrl() {
  if (typeof window === 'undefined') return

  const code = new URLSearchParams(window.location.search).get('sticker')?.toUpperCase()
  const sticker = allStickers.value.find(
    (currentSticker) => currentSticker.code === code && currentSticker.status === 'ready',
  )

  if (sticker) {
    void openSticker(sticker, { updateUrl: false })
  } else if (selectedSticker.value) {
    closeSticker({ updateUrl: false })
  }
}

function onPopState() {
  openStickerFromUrl()
}

function copyShareLink(url: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(url)
  }

  const input = document.createElement('textarea')
  input.value = url
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.append(input)
  input.select()
  document.execCommand('copy')
  input.remove()

  return Promise.resolve()
}

async function shareSelectedSticker() {
  const sticker = selectedSticker.value
  if (!sticker) return

  const url = getStickerShareUrl(sticker)
  shareStatus.value = ''

  try {
    if (navigator.share) {
      await navigator.share({
        title: `${sticker.code} - ${sticker.title}`,
        text: `Figurinha ${sticker.code}: ${sticker.title}`,
        url,
      })

      shareStatus.value = 'Compartilhamento aberto.'
      return
    }

    await copyShareLink(url)
    shareStatus.value = 'Link copiado.'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      shareStatus.value = 'Compartilhamento cancelado.'
      return
    }

    try {
      await copyShareLink(url)
      shareStatus.value = 'Link copiado.'
    } catch {
      shareStatus.value = url
    }
  }
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

onMounted(() => {
  seenStickerIds.value = getStoredSeenStickerIds()
  isRevealStateReady.value = true
  window.addEventListener('popstate', onPopState)
  window.addEventListener('storage', syncSeenStickersFromStorage)
  window.addEventListener('mousedown', captureWindowModalMouseGesture, true)
  void bindPageFlip().then(openStickerFromUrl)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPopState)
  window.removeEventListener('storage', syncSeenStickersFromStorage)
  window.removeEventListener('mousedown', captureWindowModalMouseGesture, true)
  clearModalGestureListeners()
  clearRevealTimer()
  pageFlip.value?.destroy()
  pageFlip.value = null
})
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

    <div
      class="album-stage"
      @pointerdown.capture="capturePageGesture"
      @pointerup.capture="finishPageGesture"
      @pointercancel.capture="cancelPageGesture"
    >
      <div ref="albumBookRef" class="album-book">
        <article
          v-for="page in bookPages"
          :key="page.key"
          class="page album-book__page"
          :class="[`album-book__page--${page.kind}`]"
          :data-density="page.density"
        >
          <div v-if="page.kind === 'cover'" class="page-content album-book__page-content">
            <div class="album-book__cover">
              <p class="album__title">{{ page.title }}</p>
              <img :src="coverLogo" alt="Co Gole" />
              <p class="album-book__subtitle">{{ page.subtitle }}</p>
            </div>
          </div>

          <div v-else-if="page.kind === 'content'" class="page-content album-book__page-content">
            <div class="album-page__topline">
              <span>{{ page.page.title }}</span>
              <span>{{ page.page.number }}</span>
            </div>
            <StickerGrid
              :stickers="page.page.stickers"
              :concealed-sticker-ids="concealedStickerIds"
              compact
              @select="openSticker"
              @reveal="openSticker"
            />
          </div>

          <div v-else class="page-content album-book__page-content">
            <div class="album-book__back-cover">
              <p class="album__title">{{ page.title }}</p>
              <p class="album-book__subtitle">{{ page.subtitle }}</p>
            </div>
          </div>
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
      @pointerdown.capture="captureModalGesture"
      @pointerup.capture="finishModalGesture"
      @pointercancel.capture="cancelModalGesture"
      @mousedown.capture="captureModalMouseGesture"
      @mouseup.capture="finishModalMouseGesture"
    >
      <article
        class="sticker-modal__panel"
        :class="selectedSticker.rarity ? `sticker-modal__panel--rarity-${selectedSticker.rarity}` : ''"
      >
        <button class="sticker-modal__close" type="button" aria-label="Fechar" @click="closeSticker">
          ×
        </button>

        <div class="sticker-modal__figure">
          <button
            v-if="isSelectedStickerConcealed"
            class="sticker-modal__reveal"
            :class="{ 'sticker-modal__reveal--flipping': isRevealingSticker }"
            type="button"
            :disabled="isRevealingSticker"
            :aria-label="`Virar ${selectedSticker.title}`"
            @click="revealSelectedSticker"
          >
            <span class="sticker-modal__reveal-card">
              <span class="sticker-modal__reveal-side sticker-modal__reveal-side--back">
                <span class="sticker-modal__reveal-code">{{ selectedSticker.code }}</span>
                <img class="sticker-modal__reveal-logo" :src="coverLogo" alt="" />
                <span class="sticker-modal__reveal-hint">Virar</span>
              </span>
              <span class="sticker-modal__reveal-side sticker-modal__reveal-side--front" aria-hidden="true">
                <img v-if="selectedSticker.image" :src="selectedSticker.image" alt="" />
              </span>
            </span>
          </button>
          <div
            v-else
            class="sticker-modal__tilt"
            :style="modalStickerStyle"
            @pointermove="onModalStickerMove"
            @pointerleave="resetModalTilt"
          >
            <img v-if="selectedSticker.image" :src="selectedSticker.image" :alt="selectedSticker.title" />
          </div>
        </div>

        <div class="sticker-modal__description">
          <div class="sticker-modal__meta">
            <span class="sticker-modal__code">{{ selectedSticker.code }}</span>
            <span
              v-if="selectedSticker.rarity"
              class="sticker-modal__badge"
              :class="`sticker-modal__badge--${selectedSticker.rarity}`"
            >
              {{ selectedStickerRarityLabel }}
            </span>
          </div>
          <h2>{{ selectedSticker.title }}</h2>
          <button class="sticker-modal__share" type="button" @click="shareSelectedSticker">
            Compartilhar figurinha
          </button>
          <p v-if="shareStatus" class="sticker-modal__share-status" aria-live="polite">
            {{ shareStatus }}
          </p>
          <p class="album__eyebrow">Descricao</p>
          <div class="sticker-modal__text">{{ descriptionContent }}</div>
        </div>
      </article>
    </div>
  </section>
</template>
