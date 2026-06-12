import { expect, test } from '@playwright/test'

test('shows physical sticker metadata and opens a shareable sticker link', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Capa')).toBeVisible()
  const nextPageButton = page.getByRole('button', { name: 'Proxima pagina' })
  await expect(nextPageButton).toBeEnabled()
  await nextPageButton.click()

  await expect(page.getByText('CCG-001').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir Nego na copa' }).getByText('Comum')).toBeVisible()
  await expect(page.getByText('CCG-003').first()).toBeVisible()
  await expect(page.getByText('Ainda não revelada').first()).toBeVisible()

  await page.getByRole('button', { name: 'Abrir Nego na copa' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nego na copa' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('CCG-001')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Compartilhar figurinha' })).toBeVisible()
  await expect(page).toHaveURL(/sticker=CCG-001/)
})

test('opens a sticker directly from its shared code url', async ({ page }) => {
  await page.goto('/?sticker=CCG-005')

  const dialog = page.getByRole('dialog', { name: 'Rubão 13' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('CCG-005')).toBeVisible()
  await expect(dialog.getByText('Lendária')).toBeVisible()
})

test('reveals an unseen sticker once and remembers it locally', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Proxima pagina' }).click()

  const concealedSticker = page.getByRole('button', { name: 'Virar Sono dos justos' })
  await expect(concealedSticker).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir Sono dos justos' })).toHaveCount(0)

  await concealedSticker.click()

  const dialog = page.getByRole('dialog', { name: 'Sono dos justos' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Virar Sono dos justos' })).toHaveCount(0)
  await expect(dialog.getByRole('img', { name: 'Sono dos justos' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('album-ccg.seen-stickers.v1')))
    .toContain('sample-07')

  await dialog.getByRole('button', { name: 'Fechar' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Proxima pagina' }).click()

  await expect(page.getByRole('button', { name: 'Abrir Sono dos justos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Virar Sono dos justos' })).toHaveCount(0)
})

test('keeps a direct linked reveal sticker concealed inside the modal until clicked', async ({ page }) => {
  await page.goto('/?sticker=CCG-003')

  const dialog = page.getByRole('dialog', { name: 'Sono dos justos' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Virar Sono dos justos' })).toBeVisible()
  await expect(dialog.getByRole('img', { name: 'Sono dos justos' })).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Virar Sono dos justos' }).click()

  await expect(dialog.getByRole('button', { name: 'Virar Sono dos justos' })).toHaveCount(0)
  await expect(dialog.getByRole('img', { name: 'Sono dos justos' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('album-ccg.seen-stickers.v1')))
    .toContain('sample-07')
})

test('turns the page when swiping over a sticker image', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Proxima pagina' }).click()
  await expect(page.getByText('1 / 2')).toBeVisible()

  const stickerButton = page.getByRole('button', { name: 'Abrir Nego na copa' })
  const stickerBox = await stickerButton.boundingBox()
  expect(stickerBox).not.toBeNull()

  if (!stickerBox) return

  const startX = stickerBox.x + stickerBox.width / 2
  const startY = stickerBox.y + stickerBox.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 140, startY, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText('Capa')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Nego na copa' })).toHaveCount(0)
})

test('shares only the direct sticker link', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        window.dispatchEvent(new CustomEvent('share-data', { detail: data }))
        return Promise.resolve()
      },
    })
  })
  const sharedDataPromise = page.evaluate(
    () =>
      new Promise<ShareData>((resolve) => {
        window.addEventListener(
          'share-data',
          (event) => resolve((event as CustomEvent<ShareData>).detail),
          { once: true },
        )
      }),
  )

  await page.getByRole('button', { name: 'Proxima pagina' }).click()
  await page.getByRole('button', { name: 'Abrir Nego na copa' }).click()
  await page.getByRole('button', { name: 'Compartilhar figurinha' }).click()

  const sharedData = await sharedDataPromise
  expect(sharedData).toEqual({
    title: 'CCG-001 - Nego na copa',
    text: 'Figurinha CCG-001: Nego na copa',
    url: 'http://127.0.0.1:5173/?sticker=CCG-001',
  })
  expect('files' in sharedData).toBe(false)
})
