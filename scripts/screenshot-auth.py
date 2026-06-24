"""Screenshot halaman via Chrome yang sudah login (port 9222)"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright

async def screenshot(url: str, output: str):
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        context = browser.contexts[0]
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle")
        out = Path(output)
        out.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(out / "fullpage.png"), full_page=True)
        await page.close()
        print(f"OK: {out / 'fullpage.png'}")

if __name__ == "__main__":
    asyncio.run(screenshot(sys.argv[1], sys.argv[2]))
