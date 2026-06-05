declare module 'page-flip' {
  export type FlipCorner = 'top' | 'bottom'

  export interface FlipSetting {
    startPage?: number
    size?: 'fixed' | 'stretch'
    width: number
    height: number
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    clickEventForward?: boolean
    useMouseEvents?: boolean
    swipeDistance?: number
    showPageCorners?: boolean
    disableFlipByClick?: boolean
  }

  export interface PageFlipInitEvent {
    page: number
    mode: 'portrait' | 'landscape'
  }

  export interface PageFlipEvent<T = unknown> {
    data: T
    object: PageFlip
  }

  export class PageFlip {
    constructor(parent: HTMLElement, settings: Partial<FlipSetting>)

    on(eventName: 'flip', handler: (event: PageFlipEvent<number>) => void): this
    on(eventName: 'init', handler: (event: PageFlipEvent<PageFlipInitEvent>) => void): this
    on(eventName: 'update', handler: (event: PageFlipEvent<PageFlipInitEvent>) => void): this
    on(
      eventName: 'changeOrientation',
      handler: (event: PageFlipEvent<'portrait' | 'landscape'>) => void,
    ): this
    on(
      eventName: 'changeState',
      handler: (event: PageFlipEvent<'user_fold' | 'fold_corner' | 'flipping' | 'read'>) => void,
    ): this

    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    turnToPage(pageNum: number): void
    turnToNextPage(): void
    turnToPrevPage(): void
    flipNext(corner?: FlipCorner): void
    flipPrev(corner?: FlipCorner): void
    flip(pageNum: number, corner?: FlipCorner): void
    update(): void
    destroy(): void
    getCurrentPageIndex(): number
    getPageCount(): number
    getOrientation(): 'portrait' | 'landscape'
    getSettings(): FlipSetting
  }

  const pageFlip: {
    PageFlip: typeof PageFlip
  }

  export default pageFlip
}
