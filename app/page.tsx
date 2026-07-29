'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { track } from '@vercel/analytics'

export default function Home() {
  const [wordIdx, setWordIdx] = useState(0)
  const [wordFade, setWordFade] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [formState, setFormState] = useState('idle')
  const [formError, setFormError] = useState('')   // message shown under the waitlist form
  const [honeypot, setHoneypot] = useState('')     // bot trap — see the hidden input in the form
  // Number of people on the waitlist. null = we could not reach the database.
  const [count, setCount] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // When this visitor's browser loaded the page. Used only to tell a human
  // apart from a bot. Set on mount, not during render — during render it would
  // run on the server and record the server's clock instead of the visitor's.
  const pageLoadedAt = useRef<number>(0)
  // The words that rotate in the hero line "Built for every ___ in Africa."
  // Add or remove words here — the animation adjusts by itself.
  const words = useMemo(
    // Real people in the real market. "Dreamer" and "innovator" were
    // abstractions sitting next to concrete words like "merchant".
    () => ['merchant', 'trader', 'builder', 'founder', 'entrepreneur'],
    []
  )

  // Some people set "reduce motion" in their phone or computer settings, often
  // because movement makes them dizzy or ill. globals.css already honours it for
  // CSS animations, but the starfield and the rotating word are driven by
  // JavaScript, so they have to check for themselves.
  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReducedMotion()) return   // leave the first word showing, still
    const t = setInterval(() => {
      setWordFade(true)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % words.length)
        setWordFade(false)
      }, 350)
    }, 2200)
    return () => clearInterval(t)
  }, [words.length])

  useEffect(() => { pageLoadedAt.current = Date.now() }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Pressing the Escape key closes the menu or any open pop-up.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileOpen(false); setModal(null) }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    // Reduced motion: draw the starfield once, still, and never animate it.
    // The look is kept; the movement is not.
    const still = prefersReducedMotion()
    let animId: number
    let active = true
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.3,
      vx: (Math.random() - 0.5) * 0.13, vy: (Math.random() - 0.5) * 0.13,
      a: Math.random() * 0.4 + 0.12,
    }))
    const hero = canvas.parentElement
    const obs = new IntersectionObserver(e => { active = e[0].isIntersecting }, { threshold: 0 })
    if (hero) obs.observe(hero)
    const draw = () => {
      if (active) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        pts.forEach(p => {
          if (!still) {
            p.x = (p.x + p.vx + canvas.width) % canvas.width
            p.y = (p.y + p.vy + canvas.height) % canvas.height
          }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245,243,237,${p.a})`; ctx.fill()
        })
        const g = ctx.createLinearGradient(0, canvas.height - 90, 0, canvas.height)
        g.addColorStop(0, 'rgba(253,186,116,0)')
        g.addColorStop(0.5, 'rgba(251,113,133,0.06)')
        g.addColorStop(1, 'rgba(253,186,116,0.16)')
        ctx.fillStyle = g; ctx.fillRect(0, canvas.height - 90, canvas.width, 90)
      }
      // One frame is enough when motion is reduced — this also stops the
      // animation loop running forever on that visitor's battery.
      if (!still) animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); obs.disconnect() }
  }, [])

  // Fetches the real number of waitlist signups from your Supabase database.
  // If the database is unreachable, count stays null and the counter simply
  // does not appear — better than showing a wrong number.
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/waitlist')
        const data = await res.json()
        setCount(data.ok ? (data.count ?? 0) : null)
      } catch {
        setCount(null)
      }
    }
    fetchCount()
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
  if (e.isIntersecting) {
    const target = e.target as HTMLElement
    if (target.dataset?.rev) {
      setRevealed(r => new Set([...r, target.dataset.rev!]))
    }
  }
})
    }, { threshold: 0.08 })
    document.querySelectorAll('[data-rev]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const r = (id: string) => revealed.has(id) ? 'rev on' : 'rev'
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  // Runs when someone joins the waitlist — by clicking the button OR by
  // pressing Enter in the email box. Errors appear under the form as text,
  // not as an ugly browser pop-up.
  const handleJoin = async () => {
    if (formState !== 'idle') return

    // Basic check before we bother the server.
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setFormError('Please enter a valid email address.')
      return
    }

    setFormError('')
    setFormState('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // elapsedMs lets the server tell a person from a script without
        // punishing anyone for sharing an internet connection.
        body: JSON.stringify({ email, company: honeypot, elapsedMs: Date.now() - pageLoadedAt.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setFormState('success')
        setCount(c => (c === null ? null : c + 1))
        // Records that a signup happened — no email, no personal data, just
        // the fact of it. This is what turns "500 visits" into "500 visits,
        // 38 signups", which is the number that actually tells you whether
        // an advert or a post was worth running.
        track('waitlist_signup')
      } else {
        setFormState('idle')
        setFormError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setFormState('idle')
      setFormError('Could not reach the server. Please check your connection and try again.')
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SETTINGS — THE ONLY PART OF THIS FILE YOU NORMALLY NEED TO EDIT
  //
  //  Change the text between the ' ' quote marks. Keep the quotes and the
  //  commas exactly where they are. Save the file and the site updates.
  //
  //  IMPORTANT: anything left as an empty '' is automatically HIDDEN on the
  //  website. That is deliberate — it means a fake phone number or a dead
  //  social link can never accidentally go live. Fill it in and it appears.
  // ══════════════════════════════════════════════════════════════════════
  const SETTINGS = {
    // Your real WhatsApp business number, in full international format,
    // digits only — no +, no spaces. Nigeria example: 2348012345678
    // Leave as '' until you have the real number.
    whatsappNumber: '2349158525876',

    // Your social media profile links. Paste the full https://... address.
    // Leave any you haven't claimed yet as '' and they simply won't show.
    socials: {
      twitter:   'https://x.com/dawnovatech',
      instagram: 'https://instagram.com/dawnovatech',
      linkedin:  '',   // no company page yet — hidden until you paste one here
    },

    // ══ EMAIL SWITCH — READ THIS BEFORE YOU CHANGE IT ═════════════════════
    //
    //  These two addresses CANNOT RECEIVE MAIL YET. They need the
    //  dawnova.tech domain to be bought AND mailboxes created for them.
    //  Until both are done, anyone who emails you gets a bounce — which
    //  costs you the enquiry and looks worse than showing no address.
    //
    //    true  = the email addresses appear on the site
    //    false = they are hidden, and WhatsApp is offered instead
    //
    //  ONE WORD is all you change. Set it to false right now if you would
    //  rather wait; set it back to true the day your mailboxes go live.
    // ══════════════════════════════════════════════════════════════════════
    emailIsLive: true,
    contactEmail:     'info@dawnova.tech',
    partnershipEmail: 'partnerships@dawnova.tech',

    // The live signup counter shows as soon as there is at least this many
    // people on the waitlist. It reads the real number from your Supabase
    // 'waitlist' table. Set to 1 so it appears as soon as anyone joins.
    //
    // Note: if the database cannot be reached, the counter hides itself
    // rather than showing a misleading "0".
    showCounterAfter: 1,
  }

  // ══════════════════════════════════════════════════════════════════════
  //  THE TEAM — ADD PEOPLE HERE AS THEY ARE CONFIRMED
  //
  //  Roles are taken from your Official Business Register (section 2.2).
  //  A row with an empty name '' shows as "Appointment in progress" — an
  //  honest placeholder. NOBODY IS INVENTED. The moment you fill in a
  //  name, that card turns into a real person automatically.
  //
  //  TO ADD SOMEONE, three steps:
  //    1. Put their photo in  public/team/  (square image, 400x400 or bigger)
  //    2. Type their name between the quotes on the  name:  line
  //    3. Type the file name on the  photo:  line, e.g. '/team/amaka.png'
  //  Save the file. That is all — nothing else needs changing.
  //
  //  The bio line is optional. Leave it as '' if you'd rather not add one.
  //  To remove a role entirely, delete its whole { ... } block and the comma.
  // ══════════════════════════════════════════════════════════════════════
  const TEAM = [
    {
      name:  'Habeeb Ayodeji Sina-Omigbule',
      role:  'Founder & Chief Executive Officer',
      photo: '/habeeb.png',
      bio:   'Computer Engineering graduate and teacher. Founded Dawnova Technologies to build the digital backbone of African business.',
    },
    { name: '', role: 'Chief Operating Officer',        photo: '', bio: '' },
    { name: '', role: 'Chief Technology Officer',       photo: '', bio: '' },
    { name: '', role: 'Chief Financial Officer',        photo: '', bio: '' },
    { name: '', role: 'Chief Compliance Officer',       photo: '', bio: '' },
    { name: '', role: 'Company Secretary',              photo: '', bio: '' },
    { name: '', role: 'Head of Brand & Communications', photo: '', bio: '' },
  ]

  // ── TESTIMONIALS ─────────────────────────────────────────────────────
  //  false = the whole "What people are saying" section is hidden.
  //  true  = it shows, using the quotes listed below.
  //  Only set this to true once these are REAL people who gave permission.
  const showTestimonials = false

  const testimonials = [
    // This is an example of the shape. Replace it with a real quote,
    // then copy the whole { ... } block to add more.
    {
      a: 'A',                                  // the letter shown in the circle
      n: 'Full Name',                          // the person's name
      r: 'Their business, city',               // small grey line under the name
      q: 'What they actually said about Dawnova Commerce.',
    },
  ]

  const roadmap = [
    { q: 'Q3 2026', t: 'Foundation', d: 'Dawnova Technologies announced following the rebrand from Swiftex Technologies. Brand, website and waitlist live. Internal governance documents established; CAC registration under the Dawnova name in progress.', done: true },
    { q: 'Q4 2026', t: 'Commerce Beta', d: 'Dawnova Commerce opens to its first 500 merchants. Storefront, orders, and Nigerian payments live.', done: false, active: true },
    { q: 'Early 2027', t: 'Commerce, Refined', d: 'WhatsApp-native ordering and unified inbox added, based on real merchant feedback from the beta.', done: false },
    { q: 'Beyond', t: 'The Connected Arms', d: 'Capital, AI, Mobility, and Pay are introduced one at a time, each only once it can strengthen the merchants already on Dawnova Commerce. No fixed dates yet; we\u2019d rather be honest than early.', done: false },
  ];

  const faqs = [
    { q: 'What is Dawnova Technologies?', a: 'A Nigerian technology company. Today that means one real product: Dawnova Commerce, a WhatsApp-first commerce platform for Nigerian business owners. Around it sits a long-term vision of connected tools such as funding, delivery and smarter automation, each built only once it can strengthen the merchants already using Commerce.' },
    { q: 'Is Dawnova live right now?', a: 'We are in our pre-launch phase. Dawnova Commerce enters beta in Q4 2026. Join the waitlist to be among the first 500 merchants.' },
    { q: 'What is Dawnova Commerce?', a: 'A complete commerce operating system for Nigerian SMEs: WhatsApp-first, with storefront, inventory, payments, order management, and customer tools in one dashboard.' },
    { q: 'How is Dawnova different from Bumpa or Shopify?', a: 'Every other platform treats WhatsApp as an add-on. We built WhatsApp as the foundation, because that is where Nigerian businesses operate.' },
    // CAPEM appears exactly once on the site now — here, where someone who has
    // seen the name in a document can look it up. It is an internal framework,
    // so it is described as one rather than offered as a reason to trust us.
    { q: 'Is Dawnova a registered company?', a: 'Dawnova Technologies began as Swiftex Technologies and holds a registered business name under that original name. Following the rebrand, full CAC registration under the Dawnova name is in progress. Internal governance records, including the formal rebranding resolution, have been maintained since founding.' },
    { q: 'What is CAPEM?', a: 'CAPEM stands for Critical Approach to Project Execution Management. It is our internal execution framework: the process that decides how each product gets built and to what standard. It is an internal discipline rather than an external certification, and it governs our own work only.' },
    // This answer is built from the SETTINGS block above, so it can never
    // promise a way of reaching you that isn't actually switched on.
    { q: 'How can I partner with Dawnova?', a: `Message us on WhatsApp${SETTINGS.emailIsLive && SETTINGS.partnershipEmail ? ` or email ${SETTINGS.partnershipEmail}` : ''}. Every partnership, press and investor enquiry is read and answered personally, usually within 48 hours.` },
  ]

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#0A0E1F;color:#F5F3ED;font-family:'Inter',sans-serif;overflow-x:hidden}
        :root{--navy:#0A0E1F;--navy2:#12172E;--amber:#FDBA74;--coral:#FB7185;--violet:#C084FC;--white:#F5F3ED;--muted:#8A90B5;--border:#232A4A}
        .gt{background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);-webkit-background-clip:text;background-clip:text;color:transparent}
        /* Invisible until a keyboard user presses Tab, then it appears as the
           first thing focused — letting them jump past the navigation instead
           of tabbing through it on every page load. */
        .skip-link{position:absolute;left:-9999px;top:0;z-index:300;background:#FB7185;color:#0A0E1F;padding:12px 20px;border-radius:0 0 8px 0;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.85rem;text-decoration:none}
        .skip-link:focus{left:0}
        .rev{transition:opacity .65s ease,transform .65s ease;opacity:0;transform:translateY(26px)}
        .rev.on{opacity:1;transform:none}
        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:18px 48px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
        nav.up{background:rgba(10,14,31,.97);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);padding:12px 48px}
        .nav-logo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.15rem;letter-spacing:.06em;color:#F5F3ED;text-decoration:none}
        /* Button text is deep navy, not white. White on this gradient measures
           2.69:1 contrast — below the 4.5:1 accessibility standard, and it is
           the most-clicked element on the site. Navy measures far above it and
           reads as more considered. */
        .nav-cta{background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);border:none;color:#0A0E1F;padding:10px 20px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.82rem;cursor:pointer;animation:pulse 3s infinite}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,113,133,0)}50%{box-shadow:0 0 14px 3px rgba(251,113,133,.2)}}
        /* Menu button. 'flex' = visible on every screen size (phone + desktop). */
        /* 44x44 is the minimum comfortable touch size on a phone. The bars stay
           the same size — the padding grows the tappable area around them. */
        .hamburger{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;cursor:pointer;background:none;border:none;padding:11px;min-width:44px;min-height:44px}
        .hamburger span{display:block;width:22px;height:2px;background:#F5F3ED;border-radius:2px;transition:all .3s}
        .mob-nav{position:fixed;inset:0;background:rgba(10,14,31,.98);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;opacity:0;pointer-events:none;transition:opacity .3s}
        .mob-nav.open{opacity:1;pointer-events:all}
        .mob-nav a{color:#F5F3ED;text-decoration:none;font-family:'Space Grotesk',sans-serif;font-size:1.4rem;font-weight:600}
        .mob-close{position:absolute;top:24px;right:28px;background:none;border:none;color:#8A90B5;font-size:2.4rem;line-height:1;cursor:pointer;padding:4px 12px}
        .mob-close:hover{color:#F5F3ED}
        .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:120px 24px 80px;text-align:center}
        canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
        .hc{position:relative;z-index:2;max-width:820px}
        .pill{display:inline-flex;align-items:center;gap:8px;background:rgba(251,113,133,.1);border:1px solid rgba(251,113,133,.25);border-radius:100px;padding:6px 16px;font-size:.72rem;font-family:'Space Grotesk',sans-serif;letter-spacing:.14em;color:#FB7185;text-transform:uppercase;margin-bottom:28px}
        .blink{width:6px;height:6px;border-radius:50%;background:#FB7185;display:inline-block;animation:blink 2s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(2.2rem,5.5vw,4rem);line-height:1.06;letter-spacing:-.025em;margin-bottom:10px}
        .hero-rotate{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:clamp(1.1rem,2.5vw,1.4rem);color:#F5F3ED;margin-bottom:18px}
        .hw{display:inline-block;transition:opacity .35s ease,transform .35s ease}
        .hw.fade{opacity:0;transform:translateY(-10px)}
        .hsub{font-size:clamp(.95rem,1.8vw,1.08rem);color:#8A90B5;line-height:1.65;max-width:540px;margin:0 auto 36px}
        .hero-cta-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;margin-bottom:52px}
        .btn-p{background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);border:none;color:#0A0E1F;padding:15px 36px;border-radius:10px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.95rem;cursor:pointer;transition:opacity .2s,transform .2s}
        .btn-p:hover{opacity:.9;transform:translateY(-2px)}
        .btn-s{background:transparent;border:1px solid var(--border);color:#F5F3ED;padding:11px 22px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:500;font-size:.84rem;cursor:pointer;transition:border-color .2s}
        .btn-s:hover{border-color:#8A90B5}
        .hero-link{color:#8A90B5;font-size:.84rem;text-decoration:none;font-family:'Space Grotesk',sans-serif;transition:color .2s;display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer}
        .hero-link:hover{color:#F5F3ED}
        .htag{font-family:'Space Grotesk',sans-serif;font-size:.72rem;letter-spacing:.3em;color:#8A90B5;text-transform:uppercase}
        .htag .hl{color:#FB7185}
        @keyframes din{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .hc>*{animation:din .65s ease both}
        .hc>*:nth-child(1){animation-delay:.08s}.hc>*:nth-child(2){animation-delay:.2s}.hc>*:nth-child(3){animation-delay:.32s}.hc>*:nth-child(4){animation-delay:.44s}.hc>*:nth-child(5){animation-delay:.56s}.hc>*:nth-child(6){animation-delay:.68s}
        .ticker{padding:14px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--navy2);overflow:hidden;white-space:nowrap}
        .ticker-i{display:inline-flex;animation:tick 32s linear infinite}
        @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .ti{font-family:'Space Grotesk',sans-serif;font-size:.72rem;letter-spacing:.22em;color:#8A90B5;text-transform:uppercase;padding:0 32px}
        .ti.a{color:#FB7185}
        .sec{padding:92px 24px;max-width:1100px;margin:0 auto}
        .sec-alt{background:var(--navy2)}
        .ey{font-family:'Space Grotesk',sans-serif;font-size:.67rem;letter-spacing:.3em;text-transform:uppercase;color:#FB7185;margin-bottom:14px}
        h2{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(1.65rem,3.8vw,2.6rem);line-height:1.12;letter-spacing:-.02em;margin-bottom:14px}
        .sub{color:#8A90B5;font-size:.95rem;line-height:1.65;max-width:560px}
        .pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:40px;margin-top:52px}
        .ps{font-family:'Space Grotesk',sans-serif;font-size:clamp(2.6rem,7vw,5rem);font-weight:700;line-height:1;margin-bottom:8px}
        /* Word headlines instead of numbers — smaller, so they don't overflow
           their column the way a 5rem "Spreadsheets" would. */
        .ps-word{font-size:clamp(1.6rem,3.6vw,2.5rem);line-height:1.1;letter-spacing:-.015em}
        .pg p{color:#8A90B5;font-size:.88rem;line-height:1.6;margin-top:8px}
        .mockup-wrap{display:flex;align-items:center;justify-content:center;gap:48px;flex-wrap:wrap;margin-top:56px}
        .phone-frame{width:240px;background:#0d1127;border:2px solid var(--border);border-radius:32px;padding:16px 12px;box-shadow:0 0 60px rgba(251,113,133,.12);flex-shrink:0}
        .phone-notch{width:60px;height:6px;background:#1a2140;border-radius:3px;margin:0 auto 14px}
        .phone-screen{border-radius:14px;overflow:hidden;background:#0A0E1F}
        .phone-bar{padding:10px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}
        .phone-bar-name{font-family:'Space Grotesk',sans-serif;font-size:.62rem;font-weight:600}
        .phone-stat-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px}
        .phone-stat{background:var(--navy2);border-radius:8px;padding:8px;border:1px solid var(--border)}
        .phone-stat-val{font-family:'Space Grotesk',sans-serif;font-size:.72rem;font-weight:700;background:linear-gradient(135deg,#FDBA74,#FB7185);-webkit-background-clip:text;background-clip:text;color:transparent}
        .phone-stat-label{font-size:.52rem;color:#8A90B5;margin-top:1px}
        .phone-order{margin:0 8px 6px;background:var(--navy2);border-radius:8px;padding:8px 10px;border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .phone-order-name{font-size:.6rem;font-family:'Space Grotesk',sans-serif;font-weight:500}
        .phone-order-status{font-size:.52rem;background:rgba(251,113,133,.12);color:#FB7185;padding:2px 6px;border-radius:4px}
        .phone-wa{margin:0 8px 10px;background:rgba(37,211,102,.08);border:1px solid rgba(37,211,102,.2);border-radius:8px;padding:7px 10px;display:flex;align-items:center;gap:6px}
        .phone-wa-text{font-size:.58rem;color:#25d366;font-family:'Space Grotesk',sans-serif}
        /* ════════════════════════════════════════════════════════════════
           DAWNOVA COMMERCE INTERFACE PREVIEW
           A mock of the merchant dashboard, with a phone showing the
           WhatsApp order beside it. Nothing here is a real screenshot —
           it is built from HTML so it stays sharp on every screen.
           To change the numbers shown, edit the JSX further down the file.
           ════════════════════════════════════════════════════════════════ */
        .uip{position:relative;margin-top:56px;max-width:1000px}
        .uip-win{background:#0B1024;border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.75),0 0 70px -30px rgba(251,113,133,.35)}
        .uip-chrome{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#12172E;border-bottom:1px solid var(--border)}
        .uip-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .uip-url{flex:1;background:#0A0E1F;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:.63rem;color:#8A90B5;font-family:'Inter',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .uip-grid{display:grid;grid-template-columns:150px 1fr}
        .uip-side{background:#0A0E1F;border-right:1px solid var(--border);padding:14px 10px}
        .uip-brand{display:flex;align-items:center;gap:7px;padding:0 6px 14px;margin-bottom:8px;border-bottom:1px solid var(--border)}
        .uip-brand-mark{width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);flex-shrink:0}
        .uip-brand-txt{font-family:'Space Grotesk',sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.04em}
        .uip-nav{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:7px;font-size:.66rem;color:#8A90B5;margin-bottom:2px}
        .uip-nav.on{background:rgba(251,113,133,.12);color:#FB7185;font-weight:600}
        .uip-nav-badge{margin-left:auto;background:#FB7185;color:#0A0E1F;font-size:.54rem;font-weight:700;border-radius:20px;padding:1px 6px}
        .uip-main{padding:16px 18px;min-width:0}
        .uip-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap}
        .uip-hi{font-family:'Space Grotesk',sans-serif;font-size:.86rem;font-weight:700}
        .uip-hi span{background:linear-gradient(135deg,#FDBA74,#FB7185);-webkit-background-clip:text;background-clip:text;color:transparent}
        .uip-live{display:inline-flex;align-items:center;gap:5px;font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:#22C55E;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:20px;padding:3px 9px}
        .uip-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .uip-stat{background:#12172E;border:1px solid var(--border);border-radius:10px;padding:9px 10px;min-width:0}
        .uip-stat-l{font-size:.53rem;color:#8A90B5;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .uip-stat-v{font-family:'Space Grotesk',sans-serif;font-size:.86rem;font-weight:700;margin-top:3px}
        .uip-stat-d{font-size:.52rem;color:#22C55E;margin-top:2px}
        .uip-cols{display:grid;grid-template-columns:1.25fr 1fr;gap:8px}
        .uip-card{background:#12172E;border:1px solid var(--border);border-radius:10px;padding:11px 12px;min-width:0}
        .uip-card-t{font-size:.58rem;color:#8A90B5;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
        .uip-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(35,42,74,.6)}
        .uip-row:last-child{border-bottom:none}
        .uip-av{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.52rem;font-weight:700;color:#0A0E1F;font-family:'Space Grotesk',sans-serif}
        .uip-row-n{font-size:.62rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .uip-row-s{font-size:.5rem;color:#8A90B5;margin-top:1px}
        .uip-amt{margin-left:auto;text-align:right;flex-shrink:0}
        .uip-amt-v{font-family:'Space Grotesk',sans-serif;font-size:.62rem;font-weight:700;color:#22C55E}
        .uip-pill{display:inline-block;font-size:.48rem;padding:1px 6px;border-radius:20px;margin-top:2px;text-transform:capitalize}

        /* The phone, overlapping the dashboard at the bottom-right */
        .uip-phone{position:absolute;right:-8px;bottom:-34px;width:186px;background:#0A0E1F;border:6px solid #1A2140;border-radius:24px;box-shadow:0 24px 60px -12px rgba(0,0,0,.85);overflow:hidden}
        .uip-wa-top{background:#075E54;padding:8px 10px;display:flex;align-items:center;gap:7px}
        .uip-wa-av{width:20px;height:20px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;font-size:.55rem}
        .uip-wa-name{font-size:.6rem;font-weight:600;color:#fff}
        .uip-wa-sub{font-size:.46rem;color:rgba(255,255,255,.7)}
        .uip-wa-body{background:#0d1424;padding:9px 8px;display:flex;flex-direction:column;gap:6px}
        .uip-msg{max-width:83%;padding:6px 8px;border-radius:9px;font-size:.56rem;line-height:1.4}
        .uip-msg.them{background:#1A2140;color:#E6E9F5;border-top-left-radius:2px}
        .uip-msg.me{background:#065E52;color:#EAFBF3;align-self:flex-end;border-top-right-radius:2px}
        .uip-msg-time{display:block;font-size:.44rem;opacity:.6;margin-top:2px;text-align:right}

        /* Floating "payment received" notification */
        .uip-toast{position:absolute;left:-14px;bottom:44px;background:#12172E;border:1px solid rgba(34,197,94,.35);border-left:3px solid #22C55E;border-radius:10px;padding:9px 13px;box-shadow:0 18px 44px -10px rgba(0,0,0,.8);display:flex;align-items:center;gap:9px}
        .uip-toast-i{width:24px;height:24px;border-radius:50%;background:rgba(34,197,94,.14);display:flex;align-items:center;justify-content:center;font-size:.7rem;flex-shrink:0}
        .uip-toast-t{font-family:'Space Grotesk',sans-serif;font-size:.66rem;font-weight:700;color:#22C55E}
        .uip-toast-s{font-size:.53rem;color:#8A90B5;margin-top:1px}

        /* ── Smaller screens: simplify rather than shrink into mush ── */
        @media(max-width:900px){
          .uip-phone{position:static;width:100%;max-width:280px;margin:20px auto 0;display:block}
          .uip-toast{position:static;margin:14px auto 0;max-width:260px}
          .uip{margin-bottom:0}
        }
        @media(max-width:700px){
          .uip-grid{grid-template-columns:1fr}
          .uip-side{display:none}
          .uip-stats{grid-template-columns:1fr 1fr}
          .uip-cols{grid-template-columns:1fr}
        }
        .mockup-text{max-width:380px}
        .mockup-text h3{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.2;margin-bottom:12px}
        .mockup-text p{color:#8A90B5;font-size:.9rem;line-height:1.65;margin-bottom:20px}
        .feature-list{display:flex;flex-direction:column;gap:10px}
        .feature-item{display:flex;align-items:center;gap:10px;font-size:.85rem;color:#8A90B5}
        .feature-dot{width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#FDBA74,#FB7185);flex-shrink:0}
        .eco-box{margin-top:24px;background:rgba(253,186,116,.06);border:1px solid rgba(253,186,116,.18);border-radius:12px;padding:16px 18px}
        .eco-label{font-family:'Space Grotesk',sans-serif;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#FDBA74;margin-bottom:10px}
        .eco-item{display:flex;align-items:center;gap:10px;font-size:.8rem;color:#8A90B5;margin-bottom:7px}
        .ag{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:13px;margin-top:44px}
        .ac{background:rgba(255,255,255,.03);backdrop-filter:blur(10px);border:1px solid var(--border);border-radius:16px;padding:22px;transition:border-color .2s,transform .25s}
        .ac:hover{border-color:rgba(251,113,133,.4);transform:translateY(-5px)}
        .badge{display:inline-block;margin-top:9px;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;padding:3px 8px;border-radius:4px;font-family:'Space Grotesk',sans-serif}
        .bl{background:rgba(251,113,133,.12);color:#FB7185}
        .bs{background:rgba(138,144,181,.1);color:#8A90B5}
        .hg{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;margin-top:44px}
        .hcard{padding:30px 22px;border-radius:16px;background:var(--navy2);border:1px solid var(--border);text-align:center}
        .wg{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:44px}
        .wc{padding:24px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,.02);transition:border-color .2s}
        .wc:hover{border-color:rgba(253,186,116,.3)}
        .rl{margin-top:44px;position:relative}
        .rline{position:absolute;left:66px;top:8px;bottom:8px;width:1px;background:var(--border)}
        .ri{display:flex;gap:22px;margin-bottom:26px;align-items:flex-start}
        .rq{font-family:'Space Grotesk',sans-serif;font-size:.66rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;width:50px;min-width:50px;padding-top:5px;color:#8A90B5}
        .rdot{width:14px;height:14px;border-radius:50%;border:2px solid var(--border);background:var(--navy);margin-top:4px;min-width:14px;position:relative;z-index:1}
        .rb{flex:1;background:var(--navy2);border:1px solid var(--border);border-radius:12px;padding:17px 20px}
        /* ── Team roster. Filled roles look solid; open roles are dimmer and
              dashed, so an empty seat reads as "we're hiring", not as a gap. ── */
        .team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px;margin-top:38px}
        .team-card{display:flex;align-items:center;gap:16px;background:var(--navy2);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
        .team-card.open{background:transparent;border-style:dashed}
        .team-avatar-empty{width:58px;height:58px;border-radius:50%;border:1px dashed var(--border);color:#8A90B5;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
        .team-name{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.95rem}
        .team-card.open .team-name{color:#8A90B5;font-weight:500;font-size:.85rem;font-style:italic}
        .team-role{color:#FB7185;font-size:.74rem;font-family:'Space Grotesk',sans-serif;margin-top:3px}
        .team-card.open .team-role{color:#8A90B5}
        .team-bio{color:#8A90B5;font-size:.79rem;margin-top:6px;line-height:1.55}
        .sp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:44px}
        .sp-card{background:var(--navy2);border:1px solid var(--border);border-radius:14px;padding:22px}
        .sp-quote::before{content:'"';color:#FB7185;font-size:1.4rem;font-family:'Space Grotesk',sans-serif;display:block;margin-bottom:6px}
        .trg{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:16px;margin-top:44px}
        .trc{padding:22px;border-radius:12px;border:1px solid var(--border);text-align:center}
        .fl{margin-top:40px;display:flex;flex-direction:column;gap:9px}
        .fi{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--navy2);transition:border-color .2s}
        .fi.open{border-color:rgba(251,113,133,.28)}
        .fiq{width:100%;background:none;border:none;color:#F5F3ED;padding:17px 20px;text-align:left;font-family:'Space Grotesk',sans-serif;font-size:.89rem;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px}
        .fiq:hover{color:#FB7185}
        .fch{color:#8A90B5;transition:transform .22s,color .22s;flex-shrink:0}
        .fi.open .fch{transform:rotate(180deg);color:#FB7185}
        /* The old limit here was 200px, which cut off the first answer on
           phones — it needs 221px once the text wraps. 1200px is far beyond
           any answer you would reasonably write, so nothing clips, and because
           the real content is much shorter the open/close still feels instant.
           If you ever write an answer longer than about 1200px tall, raise
           this number. */
        /* The open/closed height is set directly on the element in the JSX
           below, not here. The previous CSS-only version capped answers at
           200px and cut off the first one on phones, which needs 221px. */
        .fb{overflow:hidden;transition:max-height .35s ease}
        .fbi{padding:0 20px 17px;color:#8A90B5;font-size:.86rem;line-height:1.65}
        .ww{background:var(--navy2);border:1px solid var(--border);border-radius:20px;padding:60px 40px;text-align:center;position:relative;overflow:hidden}
        .wglow{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(251,113,133,.1) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
        .wi{flex:1;min-width:200px;background:var(--navy);border:1px solid var(--border);color:#F5F3ED;padding:13px 18px;border-radius:10px;font-family:'Inter',sans-serif;font-size:.87rem;outline:none;transition:border-color .2s}
        .wi:focus{border-color:#FB7185}
        .sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:90;background:rgba(10,14,31,.97);backdrop-filter:blur(14px);border-top:1px solid var(--border);padding:12px 20px;align-items:center;justify-content:center}
        footer{border-top:1px solid var(--border);padding:52px 24px 30px}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:var(--navy2);border:1px solid var(--border);border-radius:16px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;padding:32px}
        .modal p,.modal li{color:#8A90B5;font-size:.84rem;line-height:1.65;margin-bottom:10px}
        .modal ul{padding-left:20px;margin-bottom:10px}
        @media(max-width:768px){
          nav{padding:16px 20px}.nav.up{padding:12px 20px}
          .sec{padding:64px 16px}
          .rline{left:52px}
          .ww{padding:40px 18px}
          .sticky-cta{display:flex}
          body{padding-bottom:70px}
          .mockup-wrap{flex-direction:column;align-items:center}
          .phone-frame{width:200px}
          .sp-grid{grid-template-columns:1fr 1fr}
          .sp-grid .sp-card:last-child:nth-child(odd){grid-column:1/-1;max-width:380px;margin:0 auto;width:100%}
          .ag{grid-template-columns:1fr 1fr}
          .ag .ac:last-child:nth-child(odd){grid-column:1/-1;max-width:280px;margin:0 auto;width:100%}
          .pg>div:last-child:nth-child(odd),.hg .hcard:last-child:nth-child(odd),.wg .wc:last-child:nth-child(odd){grid-column:1/-1;max-width:340px;margin:0 auto;width:100%}
        }
        @media(max-width:400px){.sp-grid,.ag{grid-template-columns:1fr}}

        /* ── Touch targets ──────────────────────────────────────────────────
           On phones, every link and button needs roughly 44px of tappable
           height or people miss it. These were 12–17px: the footer links, the
           Privacy/Terms buttons, the hero link and the WhatsApp line. The text
           stays the same size; only the hit area grows. */
        @media(max-width:768px){
          footer a,
          footer button,
          .hero-link,
          .wl-wa,
          .modal .btn-s{min-height:44px;display:flex;align-items:center}
          footer a,footer button{margin-bottom:2px}
          .wl-legal button{min-height:44px;padding:0 2px}
        }
      `}</style>

      <a href="#hero" className="skip-link">Skip to content</a>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          {/* role/aria-modal tell assistive tech this is a dialog and that the
              page behind it is inert. aria-labelledby points at the heading so
              the dialog announces itself by name when it opens. */}
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}>
            <h3 id="modal-title" style={{fontFamily:"'Space Grotesk',sans-serif",marginBottom:16}}>{modal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h3>
            {/* Expanded from three bullets. Nigeria's Data Protection Act expects
                a stated controller, a lawful basis, a retention position and a
                route for data requests — none of which were here before. This is
                plain-language, not legal advice; have it reviewed before launch. */}
            {modal === 'privacy' ? <>
              <p><strong>Dawnova Technologies</strong>. Last updated July 2026.</p>
              <p><strong>Who controls your data.</strong> Dawnova Technologies, a Nigerian technology company founded by Habeeb Ayodeji Sina-Omigbule, is the data controller for information collected through this website.</p>
              <p><strong>What we collect.</strong> Only the email address you type into the waitlist form, plus the date you submitted it. We do not use analytics or advertising cookies, and we do not track you across other websites.</p>
              <p><strong>Why we may hold it.</strong> You give us your email so we can tell you when Dawnova Commerce opens. That consent is the only basis on which we hold it, and you can withdraw it at any time.</p>
              <p><strong>Where it is stored.</strong> In our waitlist database, hosted by Supabase on servers in the European Union. It is not sold, rented, or shared with third parties for their own marketing.</p>
              <p><strong>How long we keep it.</strong> Until Dawnova Commerce launches and you have had the chance to take up your place, or until you ask us to delete it, whichever comes first.</p>
              <p><strong>Your rights.</strong> You may ask us to show you, correct, or permanently delete the data we hold about you. {SETTINGS.emailIsLive && SETTINGS.contactEmail ? <>Email <strong>{SETTINGS.contactEmail}</strong> and we will action it.</> : <>Message us on WhatsApp and we will action it.</>} We do not charge for this.</p>
            </> : <>
              <p><strong>Dawnova Technologies</strong>. Last updated July 2026.</p>
              <p><strong>What this site is.</strong> An informational pre-launch website for Dawnova Commerce. It is not a binding commercial offer, and nothing here forms a contract.</p>
              <ul>
                <li>Joining the waitlist places you in a queue. It does not guarantee access to any product, on any date, at any price.</li>
                <li>Dates shown on the roadmap are current intentions, not commitments. They may move.</li>
                <li>The dashboard and chat images on this page are illustrations of software in development, not screenshots of a live product. Names and figures shown in them are invented for illustration.</li>
                <li>You must be 18 or older to join the waitlist.</li>
                <li>Dawnova Commerce is in development. Pricing, features and availability may all change before launch.</li>
              </ul>
            </>}
            <button className="btn-s" onClick={() => setModal(null)} style={{marginTop:16}}>Close</button>
          </div>
        </div>
      )}

      {/* Slide-out menu. `inert` when closed so keyboard users don't tab
          through invisible links. */}
      <div className="mob-nav" inert={!mobileOpen} style={{opacity:mobileOpen?1:0,pointerEvents:mobileOpen?'all':'none'}}>
        <button className="mob-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">&times;</button>
        <a href="#what" onClick={() => setMobileOpen(false)}>What We Build</a>
        <a href="#roadmap" onClick={() => setMobileOpen(false)}>Roadmap</a>
        <a href="#team" onClick={() => setMobileOpen(false)}>Team</a>
        <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
        <button className="btn-p" onClick={() => { setMobileOpen(false); scrollTo('waitlist') }} style={{marginTop:8}}>Claim My Free Spot</button>
      </div>

      <nav className={scrolled ? 'up' : ''}>
        <a href="#hero" className="nav-logo" aria-label="Dawnova Technologies, back to top">
          {/* 162 x 39 matches the logo file's real shape (1298 x 315). If you
              ever swap logo.png for a differently-proportioned image, update
              these two numbers to match it, or it will sit in dead space. */}
          <Image src="/logo.png" alt="Dawnova Technologies" width={162} height={39} style={{objectFit:'contain'}} priority />
        </a>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          {/* One CTA wording everywhere. The site previously used four
              different labels for this same action, which reads as four
              different offers. */}
          <button className="nav-cta" onClick={() => scrollTo('waitlist')}>Claim My Free Spot</button>
          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" aria-expanded={mobileOpen}>
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      <section className="hero" id="hero">
        {/* Decorative starfield — hidden from screen readers, which would
            otherwise announce an unlabelled graphic. */}
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="hc">
          <div className="pill"><span className="blink"/>&nbsp;Waitlist now open</div>
          <h1>Africa&apos;s digital era<br/>starts at <span className="gt">dawn.</span></h1>
          <p className="hero-rotate">Built for every <span className={`hw gt${wordFade ? ' fade' : ''}`}>{words[wordIdx]}</span> in Africa.</p>
          <p className="hsub">Dawnova Commerce is a WhatsApp-first commerce platform built for Nigerian entrepreneurs. It is the first product from Dawnova Technologies, with a long-term vision of connected tools built around it.</p>
          <div className="hero-cta-wrap">
            <button className="btn-p" onClick={() => scrollTo('waitlist')}>Claim My Free Spot</button>
            {/* Live signup count under the hero button — the three overlapping
                avatars plus the real number from your Supabase waitlist table. */}
            {count !== null && count >= SETTINGS.showCounterAfter && (
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                <div style={{display:'flex'}}>
                  {['A','T','C'].map((l,i) => (
                    <div key={i} style={{width:24,height:24,borderRadius:'50%',background:`linear-gradient(135deg,${['#FDBA74,#FB7185','#FB7185,#C084FC','#C084FC,#FDBA74'][i]})`,border:'2px solid #0A0E1F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.6rem',fontWeight:700,color:'#fff',marginLeft:i?-8:-4}}>{l}</div>
                  ))}
                </div>
                <span style={{fontSize:'.78rem',color:'#8A90B5'}}><strong style={{color:'#F5F3ED'}}>{count} early members</strong> already waiting</span>
              </div>
            )}
            <button className="hero-link" onClick={() => scrollTo('what')}>See what we&apos;re building →</button>
          </div>
          <p className="htag">Rising from <span className="hl">dawn</span>. Reaching for <span className="hl">nova</span>.</p>
        </div>
      </section>

      {/* The strapline repeats 8 times to make the scroll seamless. Hidden
          from screen readers, which would otherwise read all 8 copies aloud. */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-i">
          {[...Array(8)].map((_,i) => (
            <span key={i} style={{display:'inline-flex'}}>
              <span className="ti">Born in Nigeria</span><span className="ti a">·</span>
              <span className="ti">WhatsApp-First Commerce</span><span className="ti a">·</span>
              <span className="ti">Built for the World</span><span className="ti a">·</span>
              <span className="ti">Rising from Dawn</span><span className="ti a">·</span>
              <span className="ti">Reaching for Nova</span><span className="ti a">·</span>
            </span>
          ))}
        </div>
      </div>

      <div data-rev="problem" className={r('problem')}>
        <div className="sec">
          <p className="ey">The Problem</p>
          <h2>Nigerian businesses deserve better tools.</h2>
          <p className="sub">The tools built for the world were not built for how business works here. Nigerian businesses run on WhatsApp voice notes and Excel sheets, and no software was ever built for that.</p>
          {/* ── These were statistics we could not stand behind ──────────────
              Previously this read "80% of Nigerian SMEs..." with no source,
              and "₦0 worth of purpose-built African commerce infrastructure",
              which our own FAQ contradicts by naming Bumpa — and which anyone
              who knows Paystack, Flutterwave or Moniepoint would reject.

              It now describes the problem as it is actually lived. No number
              is claimed, so no number can be challenged. If you later obtain
              a citable statistic, it can be added with its source. */}
          <div className="pg">
            {[
              {s:'WhatsApp', t:'Where the selling happens. Enquiries, haggling, order details and payment confirmations, all inside one chat.'},
              {s:'Spreadsheets', t:'Where the records end up. Stock in one file, orders in another, customer names in a notebook.'},
              {s:'Nothing connects', t:'No system joins the two. Orders get missed, stock counts drift, and the whole business runs on memory.'},
            ].map((item,i) => (
              <div key={i}><div className="ps ps-word gt">{item.s}</div><p>{item.t}</p></div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-alt" id="what">
        <div data-rev="what" className={r('what')}>
          <div className="sec">
            <p className="ey">The Business Today</p>
            <h2>Dawnova Commerce.<br/>Everything else builds around it.</h2>
            <p className="sub">Dawnova is, in practice, one real product today: a WhatsApp-first commerce platform for Nigerian entrepreneurs. Every future arm exists to make Commerce merchants&apos; lives better, not to chase a separate market.</p>

            {/* PRIMARY — Commerce, large and detailed */}
            <div style={{marginTop:44, background:'rgba(251,113,133,.05)', border:'1px solid rgba(251,113,133,.25)', borderRadius:20, padding:'32px 28px'}}>
              <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:16, flexWrap:'wrap'}}>
                <div style={{fontSize:'2rem'}}>🛒</div>
                <div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.2rem'}}>Dawnova Commerce</div>
                  <div style={{color:'#8A90B5', fontSize:'.85rem'}}>In active development, targeting Q4 2026 beta</div>
                </div>
                <span className="badge bl" style={{marginLeft:'auto'}}>Our Current Focus</span>
              </div>
              <p style={{color:'#8A90B5', fontSize:'.92rem', lineHeight:1.65}}>
                A complete commerce operating system for Nigerian SMEs: storefront, inventory, orders, payments, and customer communication in one WhatsApp-first dashboard. This is what the company is building right now.
              </p>
            </div>

            {/* SECONDARY — Future connected arms, smaller and clearly labeled */}
            <div style={{marginTop:32}}>
              <p style={{fontFamily:"'Space Grotesk',sans-serif", fontSize:'.72rem', letterSpacing:'.2em', textTransform:'uppercase', color:'#8A90B5', marginBottom:16}}>
                Future connected arms, built around Commerce one at a time
              </p>
              <div className="ag">
                {[
                  {icon:'📈', name:'Dawnova Capital', desc:'Funding for merchants, using their own sales history'},
                  {icon:'🤖', name:'Dawnova AI', desc:'Smart forecasting inside your Commerce dashboard'},
                  {icon:'🚗', name:'Dawnova Mobility', desc:'Delivery built into your storefront checkout'},
                  {icon:'💳', name:'Dawnova Pay', desc:'Deeper payment tools as your store grows'},
                ].map((arm,i) => (
                  <div className="ac" key={i}>
                    <div style={{fontSize:'1.4rem', marginBottom:9, opacity:.85}}>{arm.icon}</div>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:'.86rem', marginBottom:4}}>{arm.name}</div>
                    <div style={{color:'#8A90B5', fontSize:'.74rem', lineHeight:1.5}}>{arm.desc}</div>
                    <span className="badge bs">Connects to Commerce</span>
                  </div>
                ))}
              </div>

              {/* The four cards above are the arms a MERCHANT directly benefits
                  from, so they earn the visual space. The remaining four are
                  named here rather than given cards — disclosed in full, without
                  turning this page into nine promises. Your own overview document
                  makes exactly this argument: be judged on one working product,
                  while staying transparent about the fuller vision. */}
              <p style={{color:'#8A90B5',fontSize:'.78rem',lineHeight:1.65,marginTop:18,maxWidth:620}}>
                Four more are named in our internal records and will follow the same rule:
                <strong style={{color:'#F5F3ED'}}> Studios</strong> (helping merchants tell their brand story),
                <strong style={{color:'#F5F3ED'}}> Academy</strong> (business and digital skills),
                <strong style={{color:'#F5F3ED'}}> Exchange</strong>, and
                <strong style={{color:'#F5F3ED'}}> Labs</strong> (our own research and development).
                Nine arms in total, one of them real today. None of the other eight gets built
                until it can strengthen the merchants already on Commerce.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRODUCT PREVIEW — the phone mockup showing what Commerce looks like.
          The numbers inside the phone (₦847K, 34 orders) are an ILLUSTRATION,
          not real merchant data. The caption underneath says so plainly —
          please keep that caption there so nobody can call it misleading.
          ───────────────────────────────────────────────────────────── */}
      <div data-rev="arms" className={r('arms')}>
        <div className="sec">
          <p className="ey">The Product</p>
          <h2>Built for how Nigerians<br/>already sell.</h2>
          <p className="sub">Every existing platform treats WhatsApp as an add-on. We built it as the foundation.</p>
          {/* ── THE INTERFACE PREVIEW ───────────────────────────────────
              To change any number or name shown in the mock dashboard,
              edit the values in this block. It is ordinary HTML, so it
              stays crisp on phones, laptops and 4K screens alike.
              ─────────────────────────────────────────────────────────── */}
          <div className="uip">
            <div className="uip-win">

              {/* Fake browser bar */}
              <div className="uip-chrome">
                <span className="uip-dot" style={{background:'#FB7185'}}/>
                <span className="uip-dot" style={{background:'#FDBA74'}}/>
                <span className="uip-dot" style={{background:'#22C55E'}}/>
                <div className="uip-url">🔒 dawnova.shop/amaka-fashion</div>
              </div>

              <div className="uip-grid">

                {/* Left sidebar */}
                <aside className="uip-side">
                  <div className="uip-brand">
                    <div className="uip-brand-mark"/>
                    <div className="uip-brand-txt">Commerce</div>
                  </div>
                  {[
                    {i:'▦', l:'Dashboard',  on:true},
                    {i:'🧾', l:'Orders',     badge:'6'},
                    {i:'🛍️', l:'Products'},
                    {i:'👥', l:'Customers'},
                    {i:'💳', l:'Payments'},
                    {i:'💬', l:'WhatsApp',   badge:'12'},
                  ].map((n,i) => (
                    <div className={`uip-nav${n.on?' on':''}`} key={i}>
                      <span style={{fontSize:'.6rem'}}>{n.i}</span>{n.l}
                      {n.badge && <span className="uip-nav-badge">{n.badge}</span>}
                    </div>
                  ))}
                </aside>

                {/* Main dashboard area */}
                <main className="uip-main">
                  <div className="uip-head">
                    <div className="uip-hi">Good morning, <span>Amaka Fashion</span></div>
                    <div className="uip-live"><span className="blink"/>Store live</div>
                  </div>

                  {/* Four headline numbers */}
                  <div className="uip-stats">
                    {[
                      {l:'Revenue today', v:'₦184,500', d:'▲ 23%'},
                      {l:'Orders',        v:'34',       d:'▲ 8 new'},
                      {l:'Products',      v:'127',      d:'12 low stock'},
                      {l:'Customers',     v:'892',      d:'▲ 41 this week'},
                    ].map((s,i) => (
                      <div className="uip-stat" key={i}>
                        <div className="uip-stat-l">{s.l}</div>
                        <div className="uip-stat-v">{s.v}</div>
                        <div className="uip-stat-d">{s.d}</div>
                      </div>
                    ))}
                  </div>

                  <div className="uip-cols">

                    {/* Revenue chart — one colour, one line, no clutter */}
                    <div className="uip-card">
                      <div className="uip-card-t">Revenue · last 7 days</div>
                      <svg viewBox="0 0 300 86" width="100%" height="86" role="img" aria-label="Revenue trending upward over the last seven days">
                        <defs>
                          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.34"/>
                            <stop offset="100%" stopColor="#FB7185" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {/* recessive gridlines */}
                        <line x1="0" y1="30" x2="300" y2="30" stroke="#232A4A" strokeWidth="1"/>
                        <line x1="0" y1="52" x2="300" y2="52" stroke="#232A4A" strokeWidth="1"/>
                        {/* area under the line */}
                        <path d="M12,54 L58,46 L104,50 L150,37 L196,41 L242,28 L288,20 L288,72 L12,72 Z" fill="url(#revFill)"/>
                        {/* the line itself */}
                        <path d="M12,54 L58,46 L104,50 L150,37 L196,41 L242,28 L288,20" fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        {/* today's point, ringed so it reads against the fill */}
                        <circle cx="288" cy="20" r="4" fill="#FB7185" stroke="#12172E" strokeWidth="2"/>
                        <text x="284" y="12" textAnchor="end" fill="#8A90B5" fontSize="9" fontFamily="Inter, sans-serif">₦184k</text>
                        {['M','T','W','T','F','S','S'].map((d,i) => (
                          <text key={i} x={12 + i*46} y="83" textAnchor="middle" fill="#5C628A" fontSize="8" fontFamily="Inter, sans-serif">{d}</text>
                        ))}
                      </svg>
                    </div>

                    {/* Recent orders */}
                    <div className="uip-card">
                      <div className="uip-card-t">Recent orders</div>
                      {[
                        {n:'Adaeze N.',  s:'via WhatsApp',   a:'₦24,500', st:'paid',    c:'#22C55E', g:'#FDBA74,#FB7185'},
                        {n:'Chidi O.',   s:'via storefront', a:'₦12,000', st:'packed',  c:'#C084FC', g:'#FB7185,#C084FC'},
                        {n:'Funke A.',   s:'via WhatsApp',   a:'₦38,200', st:'shipped', c:'#FDBA74', g:'#C084FC,#FDBA74'},
                      ].map((o,i) => (
                        <div className="uip-row" key={i}>
                          <div className="uip-av" style={{background:`linear-gradient(135deg,${o.g})`}}>{o.n[0]}</div>
                          <div style={{minWidth:0}}>
                            <div className="uip-row-n">{o.n}</div>
                            <div className="uip-row-s">{o.s}</div>
                          </div>
                          <div className="uip-amt">
                            <div className="uip-amt-v">{o.a}</div>
                            <span className="uip-pill" style={{background:`${o.c}22`,color:o.c}}>{o.st}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </main>
              </div>
            </div>

            {/* Payment notification floating over the dashboard */}
            <div className="uip-toast">
              <div className="uip-toast-i">✓</div>
              <div>
                <div className="uip-toast-t">₦24,500 received</div>
                <div className="uip-toast-s">Adaeze N. · Paystack</div>
              </div>
            </div>

            {/* The phone: the same order, as the customer sent it */}
            <div className="uip-phone">
              <div className="uip-wa-top">
                <div className="uip-wa-av">🛍️</div>
                <div>
                  <div className="uip-wa-name">Amaka Fashion</div>
                  <div className="uip-wa-sub">online</div>
                </div>
              </div>
              <div className="uip-wa-body">
                <div className="uip-msg them">Hi! Is the ankara set still available in size 14?</div>
                <div className="uip-msg me">Yes it is 🎉 ₦24,500. Tap to pay and I&apos;ll ship today.<span className="uip-msg-time">09:41 ✓✓</span></div>
                <div className="uip-msg them">Just paid ✅</div>
                <div className="uip-msg me">Received! Order #204 confirmed.<span className="uip-msg-time">09:43 ✓✓</span></div>
              </div>
            </div>
          </div>

          <p style={{marginTop:56,color:'#8A90B5',fontSize:'.74rem',fontStyle:'italic'}}>
            Interface preview. Dawnova Commerce is in active development, and the names and figures shown are illustrative.
          </p>

          <div className="feature-list" style={{marginTop:28,maxWidth:560}}>
            {['One link customers can buy from, shareable straight into WhatsApp','Orders from chat and storefront land in the same inbox','Nigerian payments built in: Paystack, transfer, on delivery','Inventory that updates itself as orders come in'].map((f,i) => (
              <div className="feature-item" key={i}><span className="feature-dot"/>{f}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-alt">
        <div data-rev="how" className={r('how')}>
          <div className="sec">
            <p className="ey">How It Works</p>
            <h2>What happens after you join.</h2>
            <div className="hg">
              {[{n:'01',t:'Claim Your Spot',d:'Join the waitlist with your email. No card and no commitment. You are simply first in line for the beta.'},{n:'02',t:'Run Your Business',d:'Storefront, payments, inventory, customer communication — all in one WhatsApp-first dashboard.'},{n:'03',t:'Grow With Dawnova',d:'As Commerce proves itself, connected tools follow — funding, delivery and smarter automation, built around your store.'}].map((item,i) => (
                <div className="hcard" key={i}>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'2.6rem',fontWeight:700,marginBottom:13,background:'linear-gradient(135deg,#FDBA74,#FB7185,#C084FC)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>{item.n}</div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.93rem',marginBottom:7}}>{item.t}</div>
                  <div style={{color:'#8A90B5',fontSize:'.83rem',lineHeight:1.6}}>{item.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div data-rev="why" className={r('why')}>
        <div className="sec">
          <p className="ey">Why Dawnova</p>
          <h2>Why we built it this way.</h2>
          <div className="wg">
            {/* "CAPEM-Executed — global-grade quality" was removed here. Your own
                CAPEM record states it "was never intended as a public-facing
                brand", and an internal acronym is not a reason for a stranger to
                trust you. Replaced with something a visitor can actually check. */}
            {[{t:'WhatsApp-Native',d:'WhatsApp is the foundation the product is built on, the way Nigerian businesses already sell. Other platforms add it on afterwards.'},{t:'One Product, Done Right',d:'We are not launching nine things at once. Commerce has to be good before anything else earns its place.'},{t:'Nigerian-Built',d:'Designed by people who live the problems being solved, in the market where they happen.'},{t:'Dated Commitments',d:'Every promise on this page carries a quarter. Where we cannot honestly give a date, the roadmap says so.'}].map((w,i) => (
              <div className="wc" key={i}>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.93rem',marginBottom:7}}>{w.t}</div>
                <div style={{color:'#8A90B5',fontSize:'.83rem',lineHeight:1.6}}>{w.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-alt" id="roadmap">
        <div data-rev="roadmap" className={r('roadmap')}>
          <div className="sec">
            <p className="ey">Roadmap</p>
            <h2>Where we&apos;re going.</h2>
            <p className="sub">A phased rollout, with a date attached to everything we can honestly date, and no date at all where we cannot.</p>
            <div className="rl">
              <div className="rline"/>
              {roadmap.map((item,i) => (
                <div className={`ri${item.done?' done':item.active?' active':''}`} key={i}>
                  <div className="rq">{item.q}</div>
                  <div className="rdot" style={item.done?{borderColor:'#FB7185',background:'#FB7185'}:item.active?{borderColor:'#FB7185',boxShadow:'0 0 0 4px rgba(251,113,133,.15)'}:{}}/>
                  <div className="rb" style={(item.done||item.active)?{borderColor:'rgba(251,113,133,.22)'}:{}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.9rem',marginBottom:4}}>{item.t}{item.done?' ✓':item.active?' · In Progress':''}</div>
                    <div style={{color:'#8A90B5',fontSize:'.8rem',lineHeight:1.55}}>{item.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div data-rev="team" className={r('team')} id="team">
        <div className="sec">
          <p className="ey">The Team</p>
          <h2>The people building this.</h2>
          <p className="sub">Every name here is a real person with real accountability. The roles we have not filled yet are listed as open rather than quietly left out.</p>

          {/* Built from the TEAM list near the top of this file. Filled roles
              render as people; empty ones render as open positions. Nobody is
              invented, so this stays honest at every stage of hiring. */}
          <div className="team-grid">
            {TEAM.map((m,i) => (
              <div className={`team-card${m.name ? '' : ' open'}`} key={i}>
                {m.name && m.photo ? (
                  <Image src={m.photo} alt={m.name} width={58} height={58}
                         style={{borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
                ) : (
                  <div className="team-avatar-empty" aria-hidden="true">+</div>
                )}
                <div style={{minWidth:0}}>
                  <div className="team-name">{m.name || 'Appointment in progress'}</div>
                  <div className="team-role">{m.role}</div>
                  {m.bio && <div className="team-bio">{m.bio}</div>}
                </div>
              </div>
            ))}
          </div>

          <p style={{marginTop:22,color:'#8A90B5',fontSize:'.8rem',maxWidth:580,lineHeight:1.6}}>
            Dawnova is pre-launch and building out its executive team. Each name appears here
            once the appointment is formally recorded in the company&apos;s business register.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TESTIMONIALS — currently switched OFF.

          The three quotes that used to be here were invented, not real
          people. Publishing invented customer reviews on a site that
          collects emails is a genuine legal risk, so they are gone.

          TO TURN THIS SECTION BACK ON once you have real quotes:
            1. Change  const showTestimonials = false   to   = true
            2. Replace the example below with the real names and quotes.
               Get the person's permission in writing first.
          ───────────────────────────────────────────────────────────── */}
      {showTestimonials && (
      <div className="sec-alt">
        <div data-rev="social" className={r('social')}>
          <div className="sec">
            <p className="ey">Early Community</p>
            <h2>What people are saying.</h2>
            <div className="sp-grid">
              {testimonials.map((item,i) => (
                <div className="sp-card" key={i}>
                  <div className="sp-quote" style={{fontSize:'.88rem',lineHeight:1.65,marginBottom:16,fontStyle:'italic'}}><span style={{color:'#FB7185',fontSize:'1.4rem',fontFamily:"'Space Grotesk',sans-serif",display:'block',marginBottom:6}}>&ldquo;</span>{item.q}</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:'50%',background:'#1A2140',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:'.8rem',fontWeight:600,flexShrink:0,border:'1px solid var(--border)'}}>{item.a}</div>
                    <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.78rem',fontWeight:600}}>{item.n}</div><div style={{fontSize:'.7rem',color:'#8A90B5'}}>{item.r}</div></div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{marginTop:16,color:'#8A90B5',fontSize:'.74rem',fontStyle:'italic',textAlign:'center'}}> Welcome to the Dawnova Community </p>
          </div>
        </div>
      </div>
      )}

      <div data-rev="trust" className={r('trust')}>
        <div className="sec">
          <p className="ey">Why Trust Us</p>
          <h2>What we can prove today.</h2>
          <div className="trg">
            {/* Corrected to match reality. The roadmap previously said company
                documents were "established" while this section said registration
                was "being put in place" — a contradiction a careful reader would
                catch. Dawnova holds a business name registered under its former
                name, Swiftex Technologies; CAC incorporation under the Dawnova
                name is in progress. That is what these cards now say. */}
            {[{i:'📋',t:'Documented From Day One',d:'An internal execution record and business register have been maintained since founding, including the formal resolution renaming Swiftex Technologies to Dawnova.'},{i:'🏛️',t:'Incorporation In Progress',d:'Dawnova trades under a business name originally registered as Swiftex Technologies. Full CAC registration under the Dawnova name is underway.'},{i:'👤',t:'Founder On Record',d:'The founder\'s name, face and role are all published on this page. No stock photos, no anonymous team.'},{i:'✅',t:'Nothing Invented Here',d:'No invented customer reviews, and every dashboard image on this page is labelled an illustration, because that is what it is.'}].map((item,i) => (
              <div className="trc" key={i}>
                <div style={{fontSize:'1.4rem',marginBottom:9}}>{item.i}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.86rem',marginBottom:5}}>{item.t}</div>
                <div style={{color:'#8A90B5',fontSize:'.76rem',lineHeight:1.5}}>{item.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-alt">
        <div data-rev="founder" className={r('founder')}>
          <div className="sec" style={{maxWidth:780}}>
            <p className="ey">From the Founder</p>
            <div style={{borderLeft:'3px solid #FB7185',paddingLeft:24,marginTop:40}}>
              {/* ⚠️ THESE ARE YOUR WORDS, ON YOUR PAGE.
                  Read them aloud. If any phrase is not how you would say it,
                  change it — it only has to sound like you.

                  The previous version leaned on press-release habits: "isn't a
                  startup story, it's a mission", three clipped sentences in a
                  row, and a promise to change things "permanently". This one
                  says something specific enough that a merchant reading it
                  will recognise their own week. */}
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'clamp(1rem,2.2vw,1.15rem)',lineHeight:1.68,fontStyle:'italic',marginBottom:14}}>&ldquo;Most of the businesses I know run entirely from a phone. The order arrives as a voice note, the price is agreed in the chat, a payment screenshot comes through an hour later, and by evening the only accurate stock count is in somebody&apos;s head. People manage all of that brilliantly, using tools that were never designed for any of it.</p>
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'clamp(1rem,2.2vw,1.15rem)',lineHeight:1.68,fontStyle:'italic',marginBottom:16}}>I started Dawnova because I got tired of waiting for someone else to build the obvious thing. Commerce is still in development, and I will not put a launch date in front of you that I am not sure of. When it opens, it will work the way you already sell.&rdquo;</p>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.86rem'}}>Habeeb Ayodeji Sina-Omigbule</div>
              <div style={{color:'#8A90B5',fontSize:'.76rem',marginTop:2}}>Founder & CEO, Dawnova Technologies</div>
            </div>
          </div>
        </div>
      </div>

      <div data-rev="faq" className={r('faq')} id="faq">
        <div className="sec">
          <p className="ey">FAQ</p>
          <h2>Questions, answered.</h2>
          <div className="fl">
            {faqs.map((item,i) => (
              <div className={`fi${faqOpen===i?' open':''}`} key={i}>
                {/* aria-expanded/aria-controls tell a screen reader whether the
                    answer is open and which panel the button belongs to. */}
                <button className="fiq"
                        aria-expanded={faqOpen===i}
                        aria-controls={`faq-answer-${i}`}
                        onClick={() => setFaqOpen(faqOpen===i?null:i)}>
                  {item.q}<span className="fch" aria-hidden="true">▾</span>
                </button>
                {/* maxHeight is set here rather than in CSS so the open height
                    is never capped by a stylesheet rule. 1200px is far taller
                    than any answer, so nothing can be cut off. */}
                <div className="fb" id={`faq-answer-${i}`} role="region" aria-label={item.q}
                     style={{maxHeight: faqOpen===i ? 1200 : 0}}>
                  <div className="fbi">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="waitlist" style={{padding:'0 20px 96px'}}>
        <div style={{maxWidth:640,margin:'0 auto'}}>
          <div data-rev="waitlist" className={r('waitlist')}>
            <div className="ww">
              <div className="wglow"/>
              <p className="ey" style={{position:'relative'}}>Early Access</p>
              <h2 style={{position:'relative'}}>Get early access to<br/><span className="gt">Dawnova Commerce.</span></h2>
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.78rem',color:'#8A90B5',margin:'8px 0 28px',position:'relative',maxWidth:440,marginLeft:'auto',marginRight:'auto',lineHeight:1.5}}>Be among the first 500 merchants to use the <strong style={{color:'#F5F3ED'}}>WhatsApp-first commerce platform</strong> built for Nigerian businesses.</p>
              {count !== null && count >= SETTINGS.showCounterAfter && (
                <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.78rem',color:'#8A90B5',marginBottom:28,position:'relative'}}>Already joined: <strong style={{color:'#FB7185'}}>{count} early members</strong></p>
              )}
              {formState==='success' ? (
                <div style={{position:'relative'}}>
                  <div style={{color:'#FB7185',fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'1rem',margin:'12px 0'}}>🎉 You&apos;re in! We&apos;ll be in touch before launch.</div>
                </div>
              ) : (
                <div style={{position:'relative'}}>
                  {/* A real <form> so that pressing Enter in the email box works. */}
                  <form onSubmit={e => { e.preventDefault(); handleJoin() }} style={{display:'flex',gap:10,maxWidth:460,margin:'0 auto 8px',flexWrap:'wrap',justifyContent:'center'}}>
                    <input className="wi" type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email address"/>
                    {/* Honeypot. Invisible to people, irresistible to bots — if
                        anything arrives in it, the server discards the signup.
                        Do not remove, and do not give it a visible label. */}
                    <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true"
                           value={honeypot} onChange={e => setHoneypot(e.target.value)}
                           style={{position:'absolute',left:'-9999px',width:1,height:1,opacity:0}}/>
                    <button className="btn-p" type="submit" disabled={formState==='loading'}>{formState==='loading'?'Joining...':'Claim My Free Spot'}</button>
                  </form>

                  {/* Error text. Only appears when something actually went wrong. */}
                  {formError && (
                    <p role="alert" style={{color:'#FB7185',fontSize:'.78rem',marginTop:10,position:'relative'}}>{formError}</p>
                  )}

                  <p style={{fontSize:'.72rem',color:'#8A90B5',marginTop:8,position:'relative'}}>🔒 No credit card, no spam, and it takes about 30 seconds.</p>

                  {/* WhatsApp link — only shows once you fill in the real number
                      at the top of this file. Until then it stays hidden. */}
                  {SETTINGS.whatsappNumber && (
                    <a className="wl-wa" href={`https://wa.me/${SETTINGS.whatsappNumber}`} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#8A90B5',fontSize:'.8rem',textDecoration:'none',marginTop:8}}>💬 Or chat directly on WhatsApp</a>
                  )}
                  <p className="wl-legal" style={{fontSize:'.7rem',color:'#8A90B5',marginTop:10}}>By joining you agree to our <button style={{background:'none',border:'none',color:'#8A90B5',textDecoration:'underline',cursor:'pointer',fontSize:'.7rem'}} onClick={() => setModal('privacy')}>Privacy Policy</button> and <button style={{background:'none',border:'none',color:'#8A90B5',textDecoration:'underline',cursor:'pointer',fontSize:'.7rem'}} onClick={() => setModal('terms')}>Terms of Service</button>.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'0 24px 80px',maxWidth:1100,margin:'0 auto'}}>
        <p className="ey">Partners & Press</p>
        <div style={{border:'1px dashed var(--border)',borderRadius:16,padding:40,textAlign:'center',marginTop:40}}>
          <p style={{color:'#8A90B5',fontSize:'.83rem'}}>Partner logos and press mentions will appear here as Dawnova grows.</p>

          {/* A partner is NOT a merchant. This used to scroll to the waitlist,
              which told banks, logistics firms and investors to "join the
              first 500 merchants" — the wrong audience entirely.

              WhatsApp is listed first because it works today. The email
              button only appears when SETTINGS.emailIsLive is true, so a
              bouncing address can never ship by accident. */}
          <p style={{color:'#F5F3ED',fontSize:'.95rem',fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,margin:'22px 0 6px'}}>Partnership, press or investor enquiry?</p>
          {/* Accurate wording: this is the official business line, not a
              personal number. The founder answers it at this stage, which is
              worth saying — and "right now" means it stays true, and only
              needs a small edit, on the day someone else takes it over. */}
          <p style={{color:'#8A90B5',fontSize:'.8rem',marginBottom:22}}>This is our official business line. Right now, the founder answers it himself.</p>

          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            {SETTINGS.whatsappNumber && (
              <a className="btn-p"
                 href={`https://wa.me/${SETTINGS.whatsappNumber}?text=${encodeURIComponent('Hello Dawnova, I would like to discuss a partnership.')}`}
                 target="_blank" rel="noopener noreferrer"
                 style={{textDecoration:'none',display:'inline-block'}}>💬 Message us on WhatsApp</a>
            )}
            {SETTINGS.emailIsLive && SETTINGS.partnershipEmail && (
              <a className="btn-s"
                 href={`mailto:${SETTINGS.partnershipEmail}?subject=${encodeURIComponent('Partnership enquiry')}`}
                 style={{textDecoration:'none',display:'inline-block'}}>✉️ {SETTINGS.partnershipEmail}</a>
            )}
          </div>
        </div>
      </div>

      <div className="sticky-cta" id="stickyCta">
        <button className="btn-p" onClick={() => scrollTo('waitlist')} style={{width:'100%',maxWidth:400,padding:14}}>Claim My Free Spot</button>
      </div>

      <footer>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:40,marginBottom:40}}>
            <div>
              {/* Footer logo. To swap the image, replace the file at
                  public/logo.png — keep the same filename and it just works. */}
              <Image src="/logo.png" alt="Dawnova Technologies" width={168} height={41} style={{objectFit:'contain',marginBottom:10}} />
              <div style={{color:'#8A90B5',fontSize:'.76rem',fontStyle:'italic'}}>Rising from dawn. Reaching for nova.</div>
            </div>
            <div style={{display:'flex',gap:44,flexWrap:'wrap'}}>
              {/* Footer link columns.
                  "Connect" is built from the SETTINGS block at the top of this
                  file — any social link you haven't filled in is left out
                  automatically, so no dead links can ship. */}
              {[
                {h:'Company', links:[['What We Build','#what'],['Roadmap','#roadmap'],['Team','#team'],['FAQ','#faq']]},
                {h:'Connect', links:[
                  ...(SETTINGS.socials.twitter   ? [['Twitter / X', SETTINGS.socials.twitter]]   : []),
                  ...(SETTINGS.socials.instagram ? [['Instagram',   SETTINGS.socials.instagram]] : []),
                  ...(SETTINGS.socials.linkedin  ? [['LinkedIn',    SETTINGS.socials.linkedin]]  : []),
                  ...(SETTINGS.whatsappNumber    ? [['WhatsApp',    `https://wa.me/${SETTINGS.whatsappNumber}`]] : []),
                  ...(SETTINGS.emailIsLive && SETTINGS.contactEmail    ? [['Email us',     `mailto:${SETTINGS.contactEmail}`]]     : []),
                  ...(SETTINGS.emailIsLive && SETTINGS.partnershipEmail ? [['Partnerships', `mailto:${SETTINGS.partnershipEmail}`]] : []),
                ]},
              ].filter(col => col.links.length > 0).map((col,i) => (
                <div key={i}>
                  <h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.64rem',letterSpacing:'.22em',textTransform:'uppercase',color:'#8A90B5',marginBottom:13}}>{col.h}</h3>
                  {/* Links that leave the site (social, WhatsApp) open in a new
                      tab so the visitor doesn't lose the page. Internal jump
                      links like #roadmap stay in the same tab. */}
                  {col.links.map(([label,href],j) => {
                    const leavesSite = href.startsWith('http')
                    return (
                      <a key={j} href={href}
                         {...(leavesSite ? {target:'_blank', rel:'noopener noreferrer'} : {})}
                         style={{display:'block',color:'#8A90B5',textDecoration:'none',fontSize:'.82rem',marginBottom:9}}>{label}</a>
                    )
                  })}
                </div>
              ))}
              <div>
                <h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.64rem',letterSpacing:'.22em',textTransform:'uppercase',color:'#8A90B5',marginBottom:13}}>Legal</h3>
                <button onClick={() => setModal('privacy')} style={{display:'block',color:'#8A90B5',background:'none',border:'none',cursor:'pointer',fontSize:'.82rem',marginBottom:9,padding:0}}>Privacy Policy</button>
                <button onClick={() => setModal('terms')} style={{display:'block',color:'#8A90B5',background:'none',border:'none',cursor:'pointer',fontSize:'.82rem',padding:0}}>Terms of Service</button>
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,paddingTop:22,borderTop:'1px solid var(--border)'}}>
            <div style={{color:'#8A90B5',fontSize:'.74rem'}}>© 2026 Dawnova Technologies. All rights reserved.</div>
            <div style={{display:'flex',alignItems:'center',gap:6,color:'#8A90B5',fontSize:'.74rem'}}>🇳🇬 <span style={{color:'#FB7185'}}>Made in Nigeria.</span> Built for the world.</div>
          </div>
        </div>
      </footer>
    </>
  )
}