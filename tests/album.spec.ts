import { expect, test } from '@playwright/test'

test('shows physical sticker metadata and opens a shareable sticker link', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Capa')).toBeVisible()
  const nextPageButton = page.getByRole('button', { name: 'Proxima pagina' })
  await expect(nextPageButton).toBeEnabled()
  await nextPageButton.click()

  await expect(page.getByText('CCG-001').first()).toBeVisible()
  await expect(page.getByText('Comum')).toBeVisible()
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
