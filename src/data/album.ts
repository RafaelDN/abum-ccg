export type Sticker = {
  id: string
  title: string
  image?: string
  description?: string
  status: 'ready' | 'placeholder'
}

export type AlbumPage = {
  number: number
  title: string
  stickers: Sticker[]
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const sampleStickers: Sticker[] = [
  {
    id: 'sample-01',
    title: 'Nego na copa',
    image: publicAsset('stickers/sample-01.jpeg'),
    description: publicAsset('stickers/sample-01.md'),
    status: 'ready',
  },
  {
    id: 'sample-02',
    title: 'Jeff Crash',
    image: publicAsset('stickers/sample-02.jpeg'),
    description: publicAsset('stickers/sample-02.md'),
    status: 'ready',
  },
  {
    id: 'sample-03',
    title: 'Rubão 13',
    image: publicAsset('stickers/sample-03.png'),
    description: publicAsset('stickers/sample-03.md'),
    status: 'ready',
  },
  {
    id: 'sample-03',
    title: 'Realmatismo',
    image: publicAsset('stickers/sample-04.png'),
    description: publicAsset('stickers/sample-04.md'),
    status: 'ready',
  },
]

function createPlaceholder(pageNumber: number, stickerNumber: number): Sticker {
  return {
    id: `placeholder-p${pageNumber}-s${stickerNumber}`,
    title: 'Nova figurinha',
    status: 'placeholder',
  }
}

const stickersPerPage = 4

export const albumPages: AlbumPage[] = Array.from(
  { length: Math.ceil(sampleStickers.length / stickersPerPage) },
  (_, pageIndex) => {
  const pageNumber = pageIndex + 1
  const pageStickers = sampleStickers.slice(
    pageIndex * stickersPerPage,
    pageIndex * stickersPerPage + stickersPerPage,
  )
  const stickers = Array.from({ length: stickersPerPage }, (_, stickerIndex) => {
    if (stickerIndex < pageStickers.length) {
      return pageStickers[stickerIndex]
    }

    return createPlaceholder(pageNumber, stickerIndex + 1)
  })

  return {
    number: pageNumber,
    title: `Pagina ${pageNumber}`,
    stickers,
  }
  },
)
