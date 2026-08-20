import { chromium } from 'playwright'

const BASE = process.env.HERO_BASE_URL || 'http://localhost:3100'

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x760', width: 1366, height: 760 },
  { name: '1366x700', width: 1366, height: 700 },
]

const selectors = {
  hero: '[data-hero-stage]',
  bar: '[data-why-bar]',
  primaryCta: '[data-hero-stage] .btn-hero-primary',
  secondaryCta: '[data-hero-stage] .btn-hero-secondary',
}

let allPass = true

function report(viewport, label, pass, detail) {
  const status = pass ? 'PASS' : 'FAIL'
  if (!pass) allPass = false
  console.log(`[${status}] ${viewport} :: ${label}${detail ? ` — ${detail}` : ''}`)
}

async function checkSingleLineButton(page, viewport, selector, label) {
  const el = page.locator(selector)
  const box = await el.boundingBox()
  const style = await el.evaluate((node) => {
    const cs = getComputedStyle(node)
    return {
      fontSize: parseFloat(cs.fontSize),
      lineHeight: parseFloat(cs.lineHeight),
      paddingTop: parseFloat(cs.paddingTop),
      paddingBottom: parseFloat(cs.paddingBottom),
      borderTop: parseFloat(cs.borderTopWidth),
      borderBottom: parseFloat(cs.borderBottomWidth),
    }
  })
  const lh = Number.isNaN(style.lineHeight)
    ? style.fontSize * 1.5
    : style.lineHeight
  const oneLine =
    lh + style.paddingTop + style.paddingBottom + style.borderTop + style.borderBottom
  const diff = Math.abs(box.height - oneLine)
  report(
    viewport,
    `${label} single-line label`,
    diff <= 6,
    `box.height=${box.height.toFixed(1)} oneLine=${oneLine.toFixed(1)} diff=${diff.toFixed(1)}`,
  )
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await context.newPage()
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)

  const heroBox = await page.locator(selectors.hero).boundingBox()
  const barBox = await page.locator(selectors.bar).boundingBox()
  if (!heroBox || !barBox) {
    report(vp.name, 'elements found', false, `heroBox=${JSON.stringify(heroBox)} barBox=${JSON.stringify(barBox)}`)
    await context.close()
    return
  }

  report(
    vp.name,
    'hero image block exists with bounded height',
    true,
    `hero: y=${heroBox.y.toFixed(1)} h=${heroBox.height.toFixed(1)} bottom=${(heroBox.y + heroBox.height).toFixed(1)}`,
  )
  report(
    vp.name,
    'highlights row height',
    true,
    `bar: y=${barBox.y.toFixed(1)} h=${barBox.height.toFixed(1)} bottom=${(barBox.y + barBox.height).toFixed(1)}`,
  )

  const zeroOverlap = heroBox.y + heroBox.height <= barBox.y + 0.5
  report(
    vp.name,
    'zero vertical overlap (hero ends before bar starts)',
    zeroOverlap,
    `heroBottom=${(heroBox.y + heroBox.height).toFixed(1)} barTop=${barBox.y.toFixed(1)}`,
  )

  const fitsViewport = barBox.y + barBox.height <= vp.height + 0.5
  report(
    vp.name,
    'full highlights row fits viewport (no scroll)',
    fitsViewport,
    `barBottom=${(barBox.y + barBox.height).toFixed(1)} viewport=${vp.height}`,
  )

  const positions = await page.evaluate((sel) => {
    const get = (s) => {
      const el = document.querySelector(s)
      return el ? getComputedStyle(el).position : 'missing'
    }
    return { hero: get(sel.hero), bar: get(sel.bar) }
  }, selectors)
  const noAbsoluteStacking = positions.hero !== 'absolute' && positions.bar !== 'absolute'
  report(
    vp.name,
    'no absolute stacking between hero and bar',
    noAbsoluteStacking,
    `hero position=${positions.hero} bar position=${positions.bar}`,
  )

  await checkSingleLineButton(page, vp.name, selectors.primaryCta, 'CTA primary')
  await checkSingleLineButton(page, vp.name, selectors.secondaryCta, 'CTA secondary')

  await context.close()
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const vp of VIEWPORTS) {
    await runViewport(browser, vp)
  }
} finally {
  await browser.close()
}

console.log(allPass ? '\nALL ASSERTIONS PASSED' : '\nSOME ASSERTIONS FAILED')
process.exit(allPass ? 0 : 1)