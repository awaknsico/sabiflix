/**
 * Smoke tests: the app boots, renders a page, and serves its API.
 *
 * Deliberately auth-free - Clerk is not configured in CI, so anything behind a
 * sign-in wall would only test Clerk's hosted pages. Broaden this once seeded
 * fixture data and a Clerk test instance are wired up.
 */
import { test, expect } from '@playwright/test'

test.describe('app smoke', () => {
  test('home page renders without a server error', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Redirection to a sign-in page is fine; a 5xx is not.
    expect(response?.status(), 'status code').toBeLessThan(500)

    // Something rendered - not a blank document or an error boundary.
    await expect(page.locator('body')).toBeVisible()
    const bodyText = (await page.locator('body').innerText()).trim()
    expect(bodyText.length, 'page rendered no text').toBeGreaterThan(0)

    // Catch Next.js/React crash pages explicitly.
    expect(bodyText).not.toContain('Application error')
    expect(bodyText).not.toContain('Unhandled Runtime Error')
  })

  test('public API responds with JSON', async ({ request }) => {
    const response = await request.get('/api/movies')

    // Route contract only: must not 5xx, and any success must be JSON.
    expect(response.status(), await response.text()).toBeLessThan(500)
    if (response.ok()) {
      expect(response.headers()['content-type'] ?? '').toContain('application/json')
    }
  })
})
