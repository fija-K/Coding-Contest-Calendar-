const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\fija\\.gemini\\antigravity\\brain\\a96e7903-8797-487c-ae60-60708bcb2c31';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 950 });

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // Clear any previous completion storage
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  // Wait for data loaded flag
  await page.waitForFunction(() => window.__DATA_LOADED__ === true, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  // 1. Desktop Dark Mode: Default view (All uncompleted, counter shows "Completed: 0 of 14 contests")
  console.log('Capturing Desktop Dark Mode (initial)...');
  await page.screenshot({ path: path.join(artifactDir, 'redesign_desktop_dark.png') });

  // 2. Mark a contest completed
  console.log('Clicking "Mark completed" on first contest card...');
  const firstMarkBtn = await page.$('.completion-toggle-btn');
  if (firstMarkBtn) {
    await firstMarkBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // Switch to "All" status view to view marked contest in list
  console.log('Switching to "All" status view...');
  const statusButtons = await page.$$('.status-segmented-control button');
  for (const b of statusButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.trim() === 'All') {
      await b.click();
      await new Promise(r => setTimeout(r, 400));
      break;
    }
  }

  console.log('Capturing Completion Marked view in All status...');
  await page.screenshot({ path: path.join(artifactDir, 'completion_marked_view.png') });

  // 3. Switch to "Completed" filter view
  console.log('Switching to "Completed" status view...');
  for (const b of statusButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('Completed')) {
      await b.click();
      await new Promise(r => setTimeout(r, 400));
      break;
    }
  }

  console.log('Capturing Completed filter view...');
  await page.screenshot({ path: path.join(artifactDir, 'completed_filter_view.png') });

  // 4. Switch to Calendar View
  console.log('Switching to Calendar View with completed contest...');
  const calendarBtn = await page.$('button[aria-label="Calendar view"]');
  if (calendarBtn) {
    await calendarBtn.click();
    await new Promise(r => setTimeout(r, 400));
    console.log('Capturing Calendar Dark Mode...');
    await page.screenshot({ path: path.join(artifactDir, 'redesign_calendar_dark.png') });
  }

  // 5. Switch back to list and toggle to Light Theme
  const listBtn = await page.$('button[aria-label="List view"]');
  if (listBtn) await listBtn.click();
  await new Promise(r => setTimeout(r, 200));

  const themeBtn = await page.$('button[title*="light mode"], button[title*="dark mode"]');
  if (themeBtn) {
    console.log('Toggling Light Theme...');
    await themeBtn.click();
    await new Promise(r => setTimeout(r, 400));
    console.log('Capturing Desktop Light Mode...');
    await page.screenshot({ path: path.join(artifactDir, 'redesign_desktop_light.png') });
  }

  // 6. Mobile Viewport (Dark Mode)
  console.log('Switching to Mobile Viewport...');
  if (themeBtn) await themeBtn.click();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 400));
  console.log('Capturing Mobile Dark Mode...');
  await page.screenshot({ path: path.join(artifactDir, 'redesign_mobile_dark.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
