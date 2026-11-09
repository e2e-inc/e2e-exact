import { describe, expect, test, type Screen } from 'e2e';

// One file, two targets: `--target web` drives the page in Chromium, `--target ios` the UIKit app
// on a simulator. Exact gives a `testId` to both: `data-testid` on the web, the
// `accessibilityIdentifier` on iOS. Where iOS reads differently (a list row is one element, as
// VoiceOver reads it), the tests go by role and name, which both platforms share.

// On iOS, Exact gives a form field's testId to its row's wrapper view too; the field is the
// last match. On the web there is one match.
const field = (screen: Screen, testId: string) => screen.getByTestId(testId).last();

describe('Shelf', () => {
  test.beforeEach(async ({ app }) => {
    // Each test starts from the three seed books.
    await app.clearState();
    await app.open();
  });

  test('opens with the seed books, newest first', async ({ screen }) => {
    await expect(screen.getByTestId('library-count')).toHaveText('3 of 3 books');
    // A row is one element on iOS, so check the row's text, not the parts inside it.
    await expect(screen.getByTestId('book-seed-3')).toContainText('Want to Read');
    await expect(screen.getByTestId('book-seed-2')).toContainText('44% · page 120 of 272');
  });

  test('search and the filter narrow the list', async ({ screen }) => {
    await screen.getByTestId('search').fill('le guin');
    await expect(screen.getByTestId('library-count')).toHaveText('2 of 3 books');
    await expect(screen.getByTestId('book-seed-2')).toHaveCount(0);

    await screen.getByTestId('search').fill('');
    await screen.getByTestId('filter-reading').tap();
    await expect(screen.getByTestId('library-count')).toHaveText('1 of 3 books');
    await expect(screen.getByTestId('book-seed-2')).toContainText('Piranesi');
  });

  test('the add sheet checks the title, then saves a book that survives a restart', async ({ app, screen }) => {
    await screen.getByTestId('add-book').tap();
    await screen.getByTestId('add-save').tap();
    await expect(screen.getByText('Enter a title.')).toBeVisible();

    await field(screen, 'add-title').fill('Wolf Hall');
    await field(screen, 'add-author').fill('Hilary Mantel');
    await field(screen, 'add-pages').fill('604');
    await screen.getByTestId('add-save').tap();
    await expect(screen.getByTestId('library-count')).toHaveText('4 of 4 books');
    await expect(screen.getByRole('link', { name: /Wolf Hall Hilary Mantel/ })).toBeVisible();

    await app.restart();
    await expect(screen.getByTestId('library-count')).toHaveText('4 of 4 books');
  });

  test('a book moves forward, finishes and takes a rating', async ({ app, screen }) => {
    await screen.getByTestId('book-seed-2').tap();
    await expect(screen.getByTestId('page-label')).toHaveText('Page 120 of 272');

    await screen.getByRole('button', { name: 'Forward 10 pages' }).tap();
    await expect(screen.getByTestId('page-label')).toHaveText('Page 130 of 272');
    await expect(screen.getByText('48% read')).toBeVisible();

    await screen.getByTestId('detail-status-done').tap();
    await expect(screen.getByTestId('page-label')).toHaveText('Page 272 of 272');
    await screen.getByRole('button', { name: '4 stars' }).tap();
    // Back in the library, the book's row says the new status and rating.
    await app.back();
    await expect(screen.getByTestId('book-seed-2')).toHaveAccessibleName(/Finished.*Rated 4 of 5/);
  });

  test('removing a book asks first', async ({ screen }) => {
    await screen.getByTestId('book-seed-3').tap();
    await screen.getByTestId('remove-book').tap();
    // The web draws a dialog; iOS shows the system alert. Both have a Remove button.
    await screen.getByRole('button', { name: 'Remove', exact: true }).tap();
    await expect(screen.getByTestId('library-count')).toHaveText('2 of 2 books');
    await expect(screen.getByTestId('book-seed-3')).toHaveCount(0);
  });
});

const skip = process.env.AI_GATEWAY_API_KEY ? false : 'set AI_GATEWAY_API_KEY to run the agent tests';

describe('Shelf, by the agent', { skip }, () => {
  test.beforeEach(async ({ app }) => {
    await app.clearState();
    await app.open();
  });

  // The agent works from the screen, as a person would; the checks after it are exact.
  test('adds a book it is told about', async ({ agent, screen }) => {
    await agent.act('Add the book "The Hobbit" by J.R.R. Tolkien, 310 pages, as one you are reading now.');
    // The agent may leave a filter on, so check the total, then the new row: being read, at page 0.
    await expect(screen.getByTestId('library-count')).toContainText('of 4 books');
    await expect(screen.getByRole('link', { name: /The Hobbit/ })).toContainText('page 0 of 310');
  });

  test('raises the yearly goal on the Stats tab', async ({ agent, screen }) => {
    await agent.act('Open Stats and raise the yearly reading goal to 14 books.');
    await expect(screen.getByTestId('goal')).toHaveText('14 books');
  });
});
