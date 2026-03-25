const fs = require('fs');
const puppeteer = require('puppeteer');

async function main() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (executablePath && !fs.existsSync(executablePath)) {
    throw new Error(`Configured browser executable was not found at: ${executablePath}`);
  }

  const disableSandbox = (process.env.PUPPETEER_DISABLE_SANDBOX || 'true') !== 'false';
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: disableSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
  });

  try {
    const page = await browser.newPage();
    await page.setContent('<html lang=\"ar\" dir=\"rtl\"><body><h1>PDF Runtime Check</h1><p>جاهزية التصدير مؤكدة.</p></body></html>', {
      waitUntil: 'domcontentloaded',
    });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    if (!pdf || pdf.length === 0) {
      throw new Error('Puppeteer launched, but PDF generation returned an empty buffer');
    }
    console.log(`PDF runtime check passed. Generated ${pdf.length} bytes.`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`PDF runtime check failed: ${error.message}`);
  process.exit(1);
});
