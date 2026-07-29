import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ══════════════════════════════════════════════════════════════════════════
//  SPAM PROTECTION — AND WHY IT IS NOT MAINLY BASED ON IP ADDRESS
//
//  Without protection, anyone could POST here in a loop and add thousands of
//  fake addresses. That matters especially because the signup count is shown
//  publicly on the homepage, and because the database is on a free plan.
//
//  ⚠️ THE NIGERIAN PROBLEM WITH BLOCKING BY IP ADDRESS
//  MTN, Airtel and Glo put very large numbers of subscribers behind a small
//  pool of shared public addresses (carrier-grade NAT). Offices, campuses and
//  cyber cafés do the same. So "5 signups from one address" is NOT suspicious
//  in Nigeria — during a paid ad campaign it is exactly what success looks
//  like. A tight IP limit would silently reject the very customers the advert
//  brought in, and neither you nor they would know why.
//
//  So the real defences below are behavioural and do not care about IP:
//    1. HONEYPOT   — a hidden field only automated scripts fill in.
//    2. TIMING     — a human needs seconds to type an email; a bot posts
//                    instantly. Anything submitted implausibly fast is refused.
//    3. DUPLICATES — the same address twice never creates a second row.
//
//  The IP limit is only a last-resort backstop against one machine hammering
//  the endpoint, and is set deliberately HIGH so ordinary shared-connection
//  traffic never reaches it. A real flood is thousands per minute; a real
//  campaign is not.
// ══════════════════════════════════════════════════════════════════════════

// ── TUNE THIS BEFORE A BIG CAMPAIGN ──────────────────────────────────────
//  Signups allowed from ONE internet connection per 10 minutes.
//  60 is comfortable for an office, a campus, or a carrier's shared address.
//  Raise it if you are running heavy paid advertising. Set it to 0 to switch
//  the IP backstop off completely and rely on the honeypot and timing checks.
const MAX_SIGNUPS_PER_IP = 60
// Fastest a real person could plausibly read the form and type an email.
// Anything quicker than this is a script, not a customer.
const MIN_SECONDS_ON_PAGE = 2
// ─────────────────────────────────────────────────────────────────────────

const WINDOW_MS = 10 * 60 * 1000
const recentAttempts = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  if (MAX_SIGNUPS_PER_IP <= 0) return false      // backstop switched off
  const now = Date.now()
  const times = (recentAttempts.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  times.push(now)
  recentAttempts.set(ip, times)

  // Stop the Map growing forever on a long-running server.
  if (recentAttempts.size > 5000) {
    for (const [key, stamps] of recentAttempts) {
      if (stamps.every(t => now - t >= WINDOW_MS)) recentAttempts.delete(key)
    }
  }
  return times.length > MAX_SIGNUPS_PER_IP
}

// Rejects the obviously-malformed. Deliberately not a strict RFC pattern —
// over-tight email regexes reject real addresses, which costs you signups.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, company, elapsedMs } = body

    // DEFENCE 1 — Honeypot. 'company' is an invisible field no human ever
    // sees. If anything arrived in it, it was a script. We return a normal
    // success message so the bot gets no signal it was caught, and save
    // nothing. A real person can never trigger this.
    if (typeof company === 'string' && company.trim() !== '') {
      console.warn('[waitlist POST] honeypot triggered — discarded')
      return NextResponse.json({ message: 'Successfully joined the waitlist!' }, { status: 200 })
    }

    // DEFENCE 2 — Timing. Nobody reads a page and types an email in under two
    // seconds. Bots post the instant they load. Same silent discard.
    // (Missing or malformed timing is allowed through, so a privacy browser
    // that strips it never blocks a genuine signup.)
    if (typeof elapsedMs === 'number' && elapsedMs >= 0 && elapsedMs < MIN_SECONDS_ON_PAGE * 1000) {
      console.warn(`[waitlist POST] submitted in ${elapsedMs}ms — too fast, discarded`)
      return NextResponse.json({ message: 'Successfully joined the waitlist!' }, { status: 200 })
    }

    // DEFENCE 3 — IP backstop. Deliberately generous; see the note above about
    // Nigerian carriers sharing addresses between very many subscribers.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'

    if (isRateLimited(ip)) {
      console.warn(`[waitlist POST] IP backstop hit for ${ip}`)
      return NextResponse.json(
        { error: 'We are getting a lot of signups from your network right now. Please try again in a few minutes, or message us on WhatsApp and we will add you.' },
        { status: 429 }
      )
    }

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim()) || email.length > 254) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: existing } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', sanitizedEmail)
      .single()

    if (existing) {
      return NextResponse.json(
        { message: 'You are already on the waitlist!' },
        { status: 200 }
      )
    }

    const { error } = await supabase
      .from('waitlist')
      .insert([
        {
          email: sanitizedEmail,
          source: 'landing_page',
        },
      ])

    if (error) {
      // The full reason goes to the server log (visible in your terminal, or
      // in Vercel under Deployments → Logs) so a failure is never a mystery.
      console.error('[waitlist POST] database error:', error.message, error.details ?? '')
      return NextResponse.json(
        { error: 'We could not save your email right now. Please try again shortly.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Successfully joined the waitlist!' },
      { status: 200 }
    )

  } catch (error) {
    // Usually means the database could not be reached at all — for example
    // if the Supabase project is paused, or the keys in .env.local are stale.
    const reason = error instanceof Error ? error.message : 'unknown error'
    console.error('[waitlist POST] could not reach the database:', reason)
    return NextResponse.json(
      { error: 'We could not save your email right now. Please try again shortly.' },
      { status: 500 }
    )
  }
}

// Returns how many people have joined the waitlist.
//
// IMPORTANT: this used to return { count: 0 } whenever the database was
// unreachable, which made a total outage look identical to "nobody has
// signed up yet". Now it says so honestly with { ok: false }, and the page
// hides the counter instead of displaying a misleading zero.
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

    // The reason is written to the server log for you, but NOT returned to the
    // browser. It previously was, which published raw database error text to
    // anyone who opened /api/waitlist — free reconnaissance for an attacker.
    if (error) {
      console.error('[waitlist GET] database error:', error.message)
      return NextResponse.json({ ok: false, count: null }, { status: 200 })
    }

    return NextResponse.json({ ok: true, count: count ?? 0 }, { status: 200 })
  } catch (e) {
    console.error('[waitlist GET] could not reach the database:', e instanceof Error ? e.message : 'unknown error')
    return NextResponse.json({ ok: false, count: null }, { status: 200 })
  }
}