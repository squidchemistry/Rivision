import { expect, test, type Page } from '@playwright/test';

const LEARNER = { email: 'demo@rivision.app', password: process.env.DEMO_PASSWORD || 'demo-learner-1' };
const ADMIN = { email: 'admin@rivision.app', password: process.env.DEMO_PASSWORD || 'demo-admin-1234' };

async function signIn(page: Page, { email, password }: { email: string; password: string }) {
    await page.goto('/auth');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/profile');
}

test('signed-out visitors are blocked from data and admin APIs', async ({ request }) => {
    for (const path of ['/api/topics', '/api/daily', '/api/profile', '/api/admin/users', '/api/admin/payment-requests']) {
        expect((await request.get(path)).status(), path).toBe(401);
    }
});

test('health and readiness report demo mode with the mock AI', async ({ request }) => {
    expect((await request.get('/api/health')).ok()).toBe(true);
    const ready = await request.get('/api/ready');
    expect(ready.ok()).toBe(true);
    expect((await ready.json()).config).toMatchObject({ llmProvider: 'mock', demoMode: true });
});

test('a new learner can sign up and lands on their profile', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.test`;
    await page.goto('/auth');
    await page.getByRole('button', { name: 'Register Here' }).click();
    await page.getByPlaceholder('John Doe').fill('E2E Learner');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill('a-long-password');
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/profile');
    await expect(page.getByTestId('demo-banner')).toBeVisible();
});

test('wrong password shows an error and stays on the sign-in page', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('you@example.com').fill(LEARNER.email);
    await page.getByPlaceholder('••••••••').fill('definitely-wrong');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    expect(page.url()).toContain('/auth');
});

test('learner completes a daily revision session and sees a score', async ({ page }) => {
    await signIn(page, LEARNER);
    await page.goto('/daily');
    await page.getByRole('button', { name: /Theory Q&A/ }).click();
    await page.getByRole('button', { name: /Start Q&A Revision/ }).click();

    const answer = page.getByPlaceholder(/Type your answer here/);
    await expect(answer).toBeVisible();
    const total = await page.locator('button.rounded-full').count();
    expect(total).toBe(5);
    for (let i = 0; i < total; i++) {
        await answer.fill(
            'A hash map hashes the key to a bucket, handles collisions by chaining, and gives average O(1) lookup while the sliding window keeps both pointers moving once through the array.'
        );
        if (i < total - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.getByRole('button', { name: /Submit Answers/ }).click();

    await expect(page.getByText('Average Score')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/\d+%/).first()).toBeVisible();
});

test('a normal learner cannot open the admin page', async ({ page }) => {
    await signIn(page, LEARNER);
    await page.goto('/admin');
    await page.waitForURL('**/profile');
});

test('admin approves a pending payment', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/admin');
    await expect(page.getByText('DEMO-UTR-000123')).toBeVisible();
    await page.getByRole('button', { name: 'Approve' }).first().click();
    await expect(page.getByText('DEMO-UTR-000123')).toBeHidden();
});
