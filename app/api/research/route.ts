/**
 * ON-DEMAND AI research endpoint.
 * Calls Anthropic API with web search. NEVER triggered automatically.
 * Writes results to research-suggestions.json.
 * Protected by CRON_SECRET bearer token on POST.
 * GET returns history from research-suggestions.json.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SUGGESTIONS_FILE = path.join(process.cwd(), 'research-suggestions.json')
const MODEL = 'claude-opus-4-8'
const INPUT_PRICE_PER_MTOK = 5.0
const OUTPUT_PRICE_PER_MTOK = 25.0

interface ResearchEntry {
  id: string
  query: string
  result: string
  model: string
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCostUsd: number
  timestamp: string
  sources: string[]
}

async function readHistory(): Promise<ResearchEntry[]> {
  try {
    const raw = await fs.readFile(SUGGESTIONS_FILE, 'utf8')
    const data = JSON.parse(raw) as { entries?: ResearchEntry[] }
    return data.entries ?? []
  } catch {
    return []
  }
}

async function appendHistory(entry: ResearchEntry): Promise<void> {
  const existing = await readHistory()
  const updated = [entry, ...existing].slice(0, 100)
  await fs.writeFile(SUGGESTIONS_FILE, JSON.stringify({ entries: updated }, null, 2), 'utf8')
}

export async function GET() {
  const history = await readHistory()
  return NextResponse.json({ history })
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  let body: { query?: string }
  try {
    body = await req.json() as { query?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = body?.query?.trim()
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  if (query.length > 2000) {
    return NextResponse.json({ error: 'query too long (max 2000 chars)' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are an AI infrastructure supply chain research assistant.
Your role is to find and summarize publicly available information about AI chip supply chains,
semiconductor partnerships, data center investments, and related industry developments.

IMPORTANT CONSTRAINTS:
- Report only factual, publicly available information
- Do NOT provide investment advice or buy/sell/hold recommendations
- Do NOT speculate about stock prices or returns
- Cite sources where possible
- Be concise and factual
- Focus on supply chain relationships, capacity deals, partnerships, and strategic moves`

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = (client.messages as any).stream({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [{ role: 'user', content: query }],
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: any = await stream.finalMessage()

    // Extract text content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlocks = (message.content as any[]).filter((b: any) => b.type === 'text')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultText = textBlocks.map((b: any) => ('text' in b ? b.text : '')).join('\n').trim()

    // Extract URLs from tool results
    const sources: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const block of message.content as any[]) {
      if (block.type === 'tool_result' && Array.isArray(block.content)) {
        for (const item of block.content as Array<{ type: string; text?: string }>) {
          if (item.type === 'text' && item.text) {
            const urls = item.text.match(/https?:\/\/[^\s"<>)]+/g) ?? []
            sources.push(...urls)
          }
        }
      }
    }

    const usage = message.usage
    const inputTok = usage?.input_tokens ?? 0
    const outputTok = usage?.output_tokens ?? 0
    const costUsd = (inputTok / 1_000_000) * INPUT_PRICE_PER_MTOK
      + (outputTok / 1_000_000) * OUTPUT_PRICE_PER_MTOK

    const entry: ResearchEntry = {
      id: randomUUID(),
      query,
      result: resultText,
      model: MODEL,
      estimatedInputTokens: inputTok,
      estimatedOutputTokens: outputTok,
      estimatedCostUsd: costUsd,
      timestamp: new Date().toISOString(),
      sources: [...new Set(sources)].slice(0, 20),
    }

    await appendHistory(entry)

    return NextResponse.json(entry)
  } catch (err) {
    console.error('[research] Anthropic API error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
