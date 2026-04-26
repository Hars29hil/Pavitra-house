const puppeteer = require('puppeteer-core');
const { executablePath } = require('puppeteer-core');

async function test() {
    try {
        console.log('Executable Path:', executablePath());
        const browser = await puppeteer.launch({
            executablePath: executablePath(),
            args: ['--no-sandbox']
        });
        console.log('Browser launched successfully');
        await browser.close();
    } catch (err) {
        console.error('Launch failed:', err);
    }
}
test();
