const NTFY_BASE = 'https://ntfy.sh'

interface NtfyOptions {
  title?: string
  priority?: 1 | 2 | 3 | 4 | 5
  tags?: string[]
}

export async function sendNtfy(message: string, options: NtfyOptions = {}): Promise<void> {
  const topic = process.env.NTFY_TOPIC
  if (!topic) {
    console.warn('[ntfy] NTFY_TOPIC not set — skipping notification')
    return
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
    'User-Agent': 'ai-infra-tracker/1.0',
  }

  if (options.title) headers['Title'] = options.title
  if (options.priority) headers['Priority'] = String(options.priority)
  if (options.tags?.length) headers['Tags'] = options.tags.join(',')

  try {
    const res = await fetch(`${NTFY_BASE}/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers,
      body: message,
    })
    if (!res.ok) {
      console.error(`[ntfy] HTTP ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    console.error('[ntfy] Fetch error:', err)
  }
}

export async function sendBundledNtfy(items: string[], titlePrefix: string): Promise<void> {
  const CAP = 8
  if (items.length === 0) return

  if (items.length <= CAP) {
    for (const item of items) {
      await sendNtfy(item, { title: titlePrefix, priority: 3, tags: ['chart_increasing'] })
    }
  } else {
    const shown = items.slice(0, CAP)
    const overflow = items.length - CAP
    const bundle = shown.join('\n\n') + `\n\n...and ${overflow} more (check dashboard)`
    await sendNtfy(bundle, {
      title: `${titlePrefix} (${items.length} signals)`,
      priority: 3,
      tags: ['chart_increasing'],
    })
  }
}
