export type StickerRarity = 'common' | 'rare' | 'legendary' | 'shiny' | 'limited'

export type Sticker = {
  id: string
  number: number
  code: string
  title: string
  image?: string
  description?: string
  rarity?: StickerRarity
  revealOnFirstView?: boolean
  tilt?: number
  status: 'ready' | 'placeholder'
}

export type AlbumPage = {
  number: number
  title: string
  stickers: Sticker[]
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`
const stickerCode = (number: number) => `CCG-${String(number).padStart(3, '0')}`

export const rarityLabels: Record<StickerRarity, string> = {
  common: 'Comum',
  rare: 'Rara',
  legendary: 'Lendária',
  shiny: 'Brilhante',
  limited: 'Edição limitada',
}

const sampleStickers: Sticker[] = [
  {
    id: 'sample-01',
    number: 1,
    code: stickerCode(1),
    title: 'Nego na copa',
    image: publicAsset('stickers/sample-01.jpeg'),
    description: publicAsset('stickers/sample-01.md'),
    rarity: 'common',
    tilt: -1.2,
    status: 'ready',
  },
  {
    id: 'sample-02',
    number: 2,
    code: stickerCode(2),
    title: 'Jeff Crash',
    image: publicAsset('stickers/sample-02.jpeg'),
    description: publicAsset('stickers/sample-02.md'),
    rarity: 'rare',
    tilt: 0.9,
    status: 'ready',
  },
  {
    id: 'sample-03',
    number: 5,
    code: stickerCode(5),
    title: 'Rubão 13',
    image: publicAsset('stickers/sample-03.png'),
    description: publicAsset('stickers/sample-03.md'),
    rarity: 'legendary',
    tilt: -0.7,
    status: 'ready',
  },
  {
    id: 'sample-04',
    number: 6,
    code: stickerCode(6),
    title: 'Realmatismo',
    image: publicAsset('stickers/sample-04.png'),
    description: publicAsset('stickers/sample-04.md'),
    rarity: 'limited',
    tilt: 1.1,
    status: 'ready',
  },
  {
    id: 'sample-05',
    number: 7,
    code: stickerCode(7),
    title: 'Dr Messi',
    image: publicAsset('stickers/sample-05.png'),
    description: publicAsset('stickers/sample-05.md'),
    rarity: 'rare',
    tilt: -0.8,
    status: 'ready',
  },

  {
    id: 'sample-06',
    number: 4,
    code: stickerCode(4),
    title: 'Companheiro',
    image: publicAsset('stickers/sample-06.png'),
    description: publicAsset('stickers/sample-06.md'),
    rarity: 'common',
    tilt: -0.4,
    status: 'ready',
  },
   {
    id: 'sample-07',
    number: 3,
    code: stickerCode(3),
    title: 'Sono dos justos',
    image: publicAsset('stickers/sample-07.png'),
    description: publicAsset('stickers/sample-07.md'),
    rarity: 'legendary',
    revealOnFirstView: true,
    tilt: 0.7,
    status: 'ready',
  },
  // {
  //   id: 'sample-08',
  //   number: 11,
  //   code: stickerCode(11),
  //   title: 'Bald love',
  //   image: publicAsset('stickers/sample-08.png'),
  //   description: publicAsset('stickers/sample-08.md'),
  //   rarity: 'rare',
  //   revealOnFirstView: true,
  //   tilt: 0.7,
  //   status: 'ready',
  // },
  {
    id: 'sample-09',
    number: 10,
    code: stickerCode(10),
    title: 'Ney <3',
    image: publicAsset('stickers/sample-09.png'),
    description: publicAsset('stickers/sample-09.md'),
    rarity: 'common',
    revealOnFirstView: true,
    tilt: 0.2,
    status: 'ready',
  },
]

function createPlaceholder(stickerNumber: number): Sticker {
  return {
    id: `placeholder-${stickerCode(stickerNumber)}`,
    number: stickerNumber,
    code: stickerCode(stickerNumber),
    title: 'Ainda não revelada',
    tilt: stickerNumber % 2 === 0 ? 0.6 : -0.5,
    status: 'placeholder',
  }
}

const stickersPerPage = 4
const sampleStickerByNumber = new Map(sampleStickers.map((sticker) => [sticker.number, sticker]))
const maxStickerNumber = Math.max(...sampleStickers.map((sticker) => sticker.number))
const pageCount = Math.ceil(maxStickerNumber / stickersPerPage)

export const albumPages: AlbumPage[] = Array.from({ length: pageCount }, (_, pageIndex) => {
  const pageNumber = pageIndex + 1
  const firstStickerNumber = pageIndex * stickersPerPage + 1
  const stickers = Array.from({ length: stickersPerPage }, (_, stickerIndex) => {
    const stickerNumber = firstStickerNumber + stickerIndex

    return sampleStickerByNumber.get(stickerNumber) ?? createPlaceholder(stickerNumber)
  })

  return {
    number: pageNumber,
    title: `Pagina ${pageNumber}`,
    stickers,
  }
}).filter((page) => page.stickers.some((sticker) => sticker.status === 'ready'))
