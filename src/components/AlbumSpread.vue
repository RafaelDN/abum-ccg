<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { FlipSetting, PageFlip } from 'page-flip'
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
const modalTiltX = ref(0)
const modalTiltY = ref(0)
const isTiltingSticker = ref(false)
const albumBookRef = ref<HTMLElement | null>(null)
const pageFlip = shallowRef<PageFlip | null>(null)
const coverLogo = `${import.meta.env.BASE_URL}logo-co-gole.svg`

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

onMounted(() => {
  void bindPageFlip()
})

onBeforeUnmount(() => {
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

    <div class="album-stage">
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
