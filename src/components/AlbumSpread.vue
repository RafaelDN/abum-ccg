<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { FlipSetting, PageFlip } from 'page-flip'
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
const albumBookRef = ref<HTMLElement | null>(null)
const pageFlip = shallowRef<PageFlip | null>(null)
const coverLogo = `${import.meta.env.BASE_URL}logo-co-gole.svg`
const pageGestureThreshold = 54
const pageGestureTapTolerance = 12

let pageGestureStart: {
  pointerId: number
  pageIndex: number
  startedOnStickerAction: boolean
  x: number
  y: number
} | null = null

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

function suppressStickerClickAfterSwipe() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('album-swipe-on-sticker'))
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

async function openSticker(sticker: Sticker, options: { updateUrl?: boolean } = {}) {
  if (sticker.status === 'placeholder') return

  selectedSticker.value = sticker
  descriptionContent.value = 'Carregando descricao...'
  shareStatus.value = ''

  if (options.updateUrl !== false) {
    updateStickerUrl(sticker)
  }

  flipToStickerPage(sticker)

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

function closeSticker(options: { updateUrl?: boolean } = {}) {
  selectedSticker.value = null
  descriptionContent.value = ''
  shareStatus.value = ''
  modalTiltX.value = 0
  modalTiltY.value = 0
  isTiltingSticker.value = false

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

async function createStickerImageFile(sticker: Sticker) {
  if (!sticker.image) return null

  try {
    const imageUrl = new URL(sticker.image, window.location.origin)
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const blob = await response.blob()
    const extension = blob.type.split('/')[1] || 'png'

    return new File([blob], `${sticker.code}.${extension}`, { type: blob.type })
  } catch {
    return null
  }
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
      const baseShareData: ShareData = {
        title: `${sticker.code} - ${sticker.title}`,
        text: `Figurinha ${sticker.code}: ${sticker.title}`,
        url,
      }
      const imageFile = await createStickerImageFile(sticker)
      const imageShareData: ShareData = imageFile
        ? { ...baseShareData, files: [imageFile] }
        : baseShareData

      if (imageFile && navigator.canShare?.(imageShareData)) {
        await navigator.share(imageShareData)
      } else {
        await navigator.share(baseShareData)
      }

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
  window.addEventListener('popstate', onPopState)
  void bindPageFlip().then(openStickerFromUrl)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPopState)
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
            <StickerGrid :stickers="page.page.stickers" compact @select="openSticker" />
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
    >
      <article class="sticker-modal__panel">
        <button class="sticker-modal__close" type="button" aria-label="Fechar" @click="closeSticker">
          ×
        </button>

        <div class="sticker-modal__figure">
          <div
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
