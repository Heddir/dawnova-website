'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

export default function Home() {
  const [wordIdx, setWordIdx] = useState(0)
  const [wordFade, setWordFade] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [formState, setFormState] = useState('idle')
  const [count, setCount] = useState(0)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal, setModal] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const words = ['builder', 'merchant', 'dreamer', 'innovator', 'entrepreneur']

  useEffect(() => {
    const t = setInterval(() => {
      setWordFade(true)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % words.length)
        setWordFade(false)
      }, 350)
    }, 2200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
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
          p.x = (p.x + p.vx + canvas.width) % canvas.width
          p.y = (p.y + p.vy + canvas.height) % canvas.height
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245,243,237,${p.a})`; ctx.fill()
        })
        const g = ctx.createLinearGradient(0, canvas.height - 90, 0, canvas.height)
        g.addColorStop(0, 'rgba(253,186,116,0)')
        g.addColorStop(0.5, 'rgba(251,113,133,0.06)')
        g.addColorStop(1, 'rgba(253,186,116,0.16)')
        ctx.fillStyle = g; ctx.fillRect(0, canvas.height - 90, canvas.width, 90)
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); obs.disconnect() }
  }, [])

useEffect(() => {
  const fetchCount = async () => {
    try {
      const res = await fetch('/api/waitlist')
      const data = await res.json()
      setCount(data.count ?? 0)
    } catch {
      setCount(0)
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
  const handleJoin = async () => {
  if (!email || formState !== 'idle') return
  setFormState('loading')
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setFormState('success')
      setCount(c => c + 1)
    } else {
      setFormState('idle')
      alert('Something went wrong. Please try again.')
    }
  } catch {
    setFormState('idle')
    alert('Something went wrong. Please try again.')
  }
}

  const arms = [
    { icon: '🛒', name: 'Dawnova Commerce', desc: 'WhatsApp-first commerce OS for entrepreneurs', live: true },
    { icon: '📈', name: 'Dawnova Capital', desc: 'Investment — forex, crypto, stocks, indices', live: false },
    { icon: '🤖', name: 'Dawnova AI', desc: 'Intelligent automation across every arm', live: false },
    { icon: '🚗', name: 'Dawnova Mobility', desc: 'Ride-hailing and logistics', live: false },
    { icon: '💳', name: 'Dawnova Pay', desc: 'Digital payments and financial services', live: false },
  ]

  const roadmap = [
    { q: 'Q3 2026', t: 'Brand Launch', d: 'Dawnova Technologies officially announced. Website live. Waitlist open.', done: true },
    { q: 'Q4 2026', t: 'Commerce Beta', d: 'First 500 merchants onboarded on Dawnova Commerce. WhatsApp integration live.', done: false, active: true },
    { q: 'Q1 2027', t: 'Capital Launch', d: 'Dawnova Capital soft launch — investment platform for early users.', done: false },
    { q: 'Q2 2027', t: 'AI + Mobility', d: 'Dawnova AI beta and Dawnova Mobility entering major Nigerian cities.', done: false },
    { q: 'Q3 2027', t: 'Full Ecosystem', d: 'All nine arms fully operational. Expansion into East and West Africa.', done: false },
  ]

  const faqs = [
    { q: 'What is Dawnova Technologies?', a: 'A Nigerian-founded multi-arm digital ecosystem spanning commerce, investment, AI, mobility, media, education, fintech, blockchain, and research. One name. Nine arms. One vision.' },
    { q: 'Is Dawnova live right now?', a: 'We are in our pre-launch phase. Dawnova Commerce enters beta in Q4 2026. Join the waitlist to be among the first 500 merchants.' },
    { q: 'What is Dawnova Commerce?', a: 'A complete commerce operating system for Nigerian SMEs — WhatsApp-first, with storefront, inventory, payments, order management, and customer tools in one dashboard.' },
    { q: 'How is Dawnova different from Bumpa or Shopify?', a: 'Every other platform treats WhatsApp as an add-on. We built WhatsApp as the foundation — because that\'s where Nigerian businesses actually operate.' },
    { q: 'What is CAPEM?', a: 'CAPEM — Critical Approach to Project Execution Management — is our internal execution framework. It ensures every product meets rigorous standards before reaching users.' },
    { q: 'How can I partner with Dawnova?', a: 'Chat with us on WhatsApp or email us directly. Partnership inquiries are reviewed by our executive team within 48 hours.' },
  ]

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#0A0E1F;color:#F5F3ED;font-family:'Inter',sans-serif;overflow-x:hidden}
        :root{--navy:#0A0E1F;--navy2:#12172E;--amber:#FDBA74;--coral:#FB7185;--violet:#C084FC;--white:#F5F3ED;--muted:#8A90B5;--border:#232A4A}
        .gt{background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);-webkit-background-clip:text;background-clip:text;color:transparent}
        .rev{transition:opacity .65s ease,transform .65s ease;opacity:0;transform:translateY(26px)}
        .rev.on{opacity:1;transform:none}
        nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:18px 48px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
        nav.up{background:rgba(10,14,31,.97);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);padding:12px 48px}
        .nav-logo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.15rem;letter-spacing:.06em;color:#F5F3ED;text-decoration:none}
        .nav-cta{background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);border:none;color:#fff;padding:9px 20px;border-radius:8px;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;animation:pulse 3s infinite}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,113,133,0)}50%{box-shadow:0 0 14px 3px rgba(251,113,133,.2)}}
        .hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
        .hamburger span{display:block;width:22px;height:2px;background:#F5F3ED;border-radius:2px;transition:all .3s}
        .mob-nav{position:fixed;inset:0;background:rgba(10,14,31,.98);z-index:99;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;opacity:0;pointer-events:none;transition:opacity .3s}
        .mob-nav.open{opacity:1;pointer-events:all}
        .mob-nav a{color:#F5F3ED;text-decoration:none;font-family:'Space Grotesk',sans-serif;font-size:1.4rem;font-weight:600}
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
        .btn-p{background:linear-gradient(135deg,#FDBA74,#FB7185,#C084FC);border:none;color:#fff;padding:15px 36px;border-radius:10px;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.95rem;cursor:pointer;transition:opacity .2s,transform .2s}
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
        .fb{max-height:0;overflow:hidden;transition:max-height .3s ease}
        .fi.open .fb{max-height:200px}
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
          .hamburger{display:flex}
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
      `}</style>

      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{fontFamily:"'Space Grotesk',sans-serif",marginBottom:16}}>{modal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h3>
            {modal === 'privacy' ? <>
              <p><strong>Dawnova Technologies</strong> — Effective June 2026</p>
              <p>We collect only the information you provide (such as your email) to keep you informed about Dawnova's launch and updates.</p>
              <ul><li>We do not sell your data to third parties.</li><li>We do not send spam. Only relevant Dawnova updates.</li><li>You may unsubscribe at any time.</li></ul>
            </> : <>
              <p><strong>Dawnova Technologies</strong> — Effective June 2026</p>
              <ul><li>Waitlist membership does not guarantee access to any specific product.</li><li>You must be 18 or older to use Dawnova services.</li><li>This website is informational and does not constitute a binding commercial offer.</li></ul>
            </>}
            <button className="btn-s" onClick={() => setModal(null)} style={{marginTop:16}}>Close</button>
          </div>
        </div>
      )}

      <div className="mob-nav" style={{opacity:mobileOpen?1:0,pointerEvents:mobileOpen?'all':'none'}}>
        <a href="#what" onClick={() => setMobileOpen(false)}>What We Build</a>
        <a href="#roadmap" onClick={() => setMobileOpen(false)}>Roadmap</a>
        <a href="#team" onClick={() => setMobileOpen(false)}>Team</a>
        <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
        <button className="btn-p" onClick={() => { setMobileOpen(false); scrollTo('waitlist') }} style={{marginTop:8}}>Claim My Early Access</button>
      </div>

      <nav className={scrolled ? 'up' : ''}>
        <a href="#" className="nav-logo">
          <Image src="/logo.png" alt="Dawnova Technologies" width={180} height={40} style={{objectFit:'contain'}} priority />
        </a>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button className="nav-cta" onClick={() => scrollTo('waitlist')}>Claim My Spot</button>
          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" style={{display:'none'}}>
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      <section className="hero" id="hero">
        <canvas ref={canvasRef} />
        <div className="hc">
          <div className="pill"><span className="blink"/>&nbsp;Waitlist now open</div>
          <h1>Africa&apos;s digital era<br/>starts at <span className="gt">dawn.</span></h1>
          <p className="hero-rotate">Built for every <span className={`hw gt${wordFade ? ' fade' : ''}`}>{words[wordIdx]}</span> in Africa.</p>
          <p className="hsub">Dawnova Technologies is building Africa&apos;s most comprehensive digital ecosystem: commerce, investment, AI, mobility, media and beyond. One name. Nine arms. Born in Nigeria.</p>
          <div className="hero-cta-wrap">
            <button className="btn-p" onClick={() => scrollTo('waitlist')}>Claim My Early Access — Free</button>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
              <div style={{display:'flex'}}>
                {['A','T','C'].map((l,i) => (
                  <div key={i} style={{width:24,height:24,borderRadius:'50%',background:`linear-gradient(135deg,${['#FDBA74,#FB7185','#FB7185,#C084FC','#C084FC,#FDBA74'][i]})`,border:'2px solid #0A0E1F',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.6rem',fontWeight:700,color:'#fff',marginLeft:i?-8:-4}}>{l}</div>
                ))}
              </div>
              <span style={{fontSize:'.78rem',color:'#8A90B5'}}><strong style={{color:'#F5F3ED'}}>{count} early members</strong> already waiting</span>
            </div>
            <button className="hero-link" onClick={() => scrollTo('what')}>See what we&apos;re building →</button>
          </div>
          <p className="htag">Rising from <span className="hl">dawn</span>. Reaching for <span className="hl">nova</span>.</p>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-i">
          {[...Array(8)].map((_,i) => (
            <span key={i} style={{display:'inline-flex'}}>
              <span className="ti">Born in Nigeria</span><span className="ti a">·</span>
              <span className="ti">9 Business Arms</span><span className="ti a">·</span>
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
          <p className="sub">The tools built for the world weren&apos;t built for how Africa actually works. Our businesses run on WhatsApp voice notes and Excel sheets. That ends here.</p>
          <div className="pg">
            {[{s:'80%',t:'of Nigerian SMEs manage their entire business on WhatsApp'},{s:'₦0',t:'worth of purpose-built African commerce infrastructure at true scale'},{s:'9',t:'digital sectors that deserve African-built, African-first tools'}].map((item,i) => (
              <div key={i}><div className="ps gt">{item.s}</div><p>{item.t}</p></div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-alt" id="what">
        <div data-rev="what" className={r('what')}>
          <div className="sec">
            <p className="ey">First to Launch — Dawnova Commerce</p>
            <h2>Your entire business.<br/>One WhatsApp-first dashboard.</h2>
            <div className="mockup-wrap">
              <div className="phone-frame">
                <div className="phone-notch"/>
                <div className="phone-screen">
                  <div className="phone-bar"><div className="phone-bar-name">Dawnova Commerce</div><span style={{fontSize:'.7rem'}}>🟢</span></div>
                  <div className="phone-stat-row">
                    <div className="phone-stat"><div className="phone-stat-val">₦847K</div><div className="phone-stat-label">Revenue today</div></div>
                    <div className="phone-stat"><div className="phone-stat-val">34</div><div className="phone-stat-label">Orders pending</div></div>
                  </div>
                  {[['Order #204 — Adaeze N.','New'],['Order #203 — Chidi O.','Packed'],['Order #202 — Funke A.','Shipped']].map(([n,s],i) => (
                    <div className="phone-order" key={i}><div className="phone-order-name">{n}</div><div className="phone-order-status">{s}</div></div>
                  ))}
                  <div className="phone-wa"><span style={{fontSize:'.7rem'}}>💬</span><div className="phone-wa-text">WhatsApp — 12 active chats</div></div>
                </div>
              </div>
              <div className="mockup-text">
                <h3>Built for how Nigerians actually sell.</h3>
                <p>Every existing platform treats WhatsApp as an add-on. We built it as the foundation.</p>
                <div className="feature-list">
                  {['WhatsApp-native storefront & order flow','Nigerian payment stack (Paystack, Flutterwave, bank transfer)','Inventory, orders & customer management','Multi-staff accounts with role permissions','Works offline, syncs when connected'].map((f,i) => (
                    <div className="feature-item" key={i}><span className="feature-dot"/>{f}</div>
                  ))}
                </div>
                <div className="eco-box">
                  <p className="eco-label">Powered by the full ecosystem</p>
                  {[['🤖','Dawnova AI','smart replies, demand forecasting, customer insights'],['🚗','Dawnova Mobility','book delivery directly from your dashboard'],['📈','Dawnova Capital','access merchant funding based on your sales data'],['💳','Dawnova Pay','payment links, split pay, escrow built in']].map(([icon,name,desc],i) => (
                    <div className="eco-item" key={i}><span style={{fontSize:'.9rem'}}>{icon}</span><span><strong style={{color:'#F5F3ED'}}>{name}</strong> — {desc}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div data-rev="arms" className={r('arms')}>
        <div className="sec">
          <p className="ey">The Full Ecosystem</p>
          <h2>Nine arms. All connected.</h2>
          <p className="sub">Commerce is just where we start. Every arm serves a different need — all connected under one account.</p>
          <div className="ag">
            {arms.map((arm,i) => (
              <div className="ac" key={i}>
                <div style={{fontSize:'1.6rem',marginBottom:11}}>{arm.icon}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.9rem',marginBottom:5}}>{arm.name}</div>
                <div style={{color:'#8A90B5',fontSize:'.78rem',lineHeight:1.5}}>{arm.desc}</div>
                <span className={`badge ${arm.live?'bl':'bs'}`}>{arm.live?'Launching Q4 2026':'Coming Soon'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec-alt">
        <div data-rev="how" className={r('how')}>
          <div className="sec">
            <p className="ey">How It Works</p>
            <h2>Simple. Powerful. Yours.</h2>
            <div className="hg">
              {[{n:'01',t:'Join the Ecosystem',d:'Sign up once. Access every Dawnova arm from a single account as they launch.'},{n:'02',t:'Run Your Business',d:'Storefront, payments, inventory, customer communication — all in one WhatsApp-first dashboard.'},{n:'03',t:'Grow With Dawnova',d:'Capital for funding, Academy for skills, Exchange for crypto — all connected.'}].map((item,i) => (
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
          <h2>Built different.<br/>On purpose.</h2>
          <div className="wg">
            {[{t:'WhatsApp-Native',d:'The only commerce platform built for how Nigerians actually sell — not adapted, built from the ground up.'},{t:'Nine Arms, One Roof',d:'From investment to AI to logistics — every tool your business needs in one connected ecosystem.'},{t:'Nigerian-Built',d:'Designed by people who live the problems. No assumptions. No adapting foreign solutions.'},{t:'CAPEM-Executed',d:'Every product ships under our Critical Approach to Project Execution Management — global-grade quality.'}].map((w,i) => (
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
            <p className="sub">A structured, phased rollout — because CAPEM demands it and our community deserves it.</p>
            <div className="rl">
              <div className="rline"/>
              {roadmap.map((item,i) => (
                <div className={`ri${item.done?' done':item.active?' active':''}`} key={i}>
                  <div className="rq">{item.q}</div>
                  <div className="rdot" style={item.done?{borderColor:'#FB7185',background:'#FB7185'}:item.active?{borderColor:'#FB7185',boxShadow:'0 0 0 4px rgba(251,113,133,.15)'}:{}}/>
                  <div className="rb" style={(item.done||item.active)?{borderColor:'rgba(251,113,133,.22)'}:{}}>
                    <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'.9rem',marginBottom:4}}>{item.t}{item.done?' ✓':item.active?' — In Progress':''}</div>
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
          <p className="sub">Real people. Real names. Real accountability.</p>
          <div style={{display:'inline-flex',alignItems:'center',gap:20,background:'var(--navy2)',border:'1px solid var(--border)',borderRadius:16,padding:'22px 28px',marginTop:38}}>
            <div style={{width:58,height:58,borderRadius:'50%',background:'linear-gradient(135deg,#FDBA74,#FB7185,#C084FC)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:'1.3rem',fontWeight:700,color:'#fff',flexShrink:0}}>H</div>
            <div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'1rem'}}>Habeeb Ayodeji Sina-Omigbule</div>
              <div style={{color:'#FB7185',fontSize:'.74rem',fontFamily:"'Space Grotesk',sans-serif",marginTop:2}}>Founder & CEO</div>
              <div style={{color:'#8A90B5',fontSize:'.8rem',marginTop:5,maxWidth:320,lineHeight:1.55}}>Computer Engineering graduate. Teacher. Builder. Founded Dawnova Technologies to be the digital backbone of African business.</div>
            </div>
          </div>
          <p style={{marginTop:18,color:'#8A90B5',fontSize:'.8rem'}}>+ Executive team and CAPEM execution members — published as each arm goes live.</p>
        </div>
      </div>

      <div className="sec-alt">
        <div data-rev="social" className={r('social')}>
          <div className="sec">
            <p className="ey">Early Community</p>
            <h2>What people are saying.</h2>
            <div className="sp-grid">
              {[{a:'A',n:'Amaka O.',r:'Fashion business owner, Lagos',q:'Finally, someone building the tools Nigerian businesses actually need. WhatsApp is where we live — it should be where we sell from too.'},{a:'T',n:'Tunde B.',r:'Electronics retailer, Ibadan',q:"I've been waiting for something like Dawnova Commerce my whole business life. One place for everything — I'm already on the waitlist."},{a:'C',n:'Chika N.',r:'Early waitlist member',q:"The structure behind this is unlike any Nigerian startup I've seen. CAPEM, formal documents, a real roadmap. These people are serious."}].map((item,i) => (
                <div className="sp-card" key={i}>
                  <div className="sp-quote" style={{fontSize:'.88rem',lineHeight:1.65,marginBottom:16,fontStyle:'italic'}}><span style={{color:'#FB7185',fontSize:'1.4rem',fontFamily:"'Space Grotesk',sans-serif",display:'block',marginBottom:6}}>&ldquo;</span>{item.q}</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:'50%',background:'#1A2140',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:'.8rem',fontWeight:600,flexShrink:0,border:'1px solid var(--border)'}}>{item.a}</div>
                    <div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.78rem',fontWeight:600}}>{item.n}</div><div style={{fontSize:'.7rem',color:'#8A90B5'}}>{item.r}</div></div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{marginTop:16,color:'#8A90B5',fontSize:'.74rem',fontStyle:'italic',textAlign:'center'}}>* Replace with real verified quotes before launch.</p>
          </div>
        </div>
      </div>

      <div data-rev="trust" className={r('trust')}>
        <div className="sec">
          <p className="ey">Why Trust Us</p>
          <h2>Formally structured.<br/>Seriously built.</h2>
          <div className="trg">
            {[{i:'📋',t:'Formally Documented',d:'Official CAPEM Execution Record and Business Register maintained from day one.'},{i:'⚙️',t:'CAPEM Framework',d:'Every product ships under the Critical Approach to Project Execution Management.'},{i:'🏛️',t:'Legal Compliance',d:'CAC registration and IPAN trademark filings underway.'},{i:'🌍',t:'Nigerian-Built',d:'Designed by Nigerians who live the problems. No assumptions, no adaptations.'}].map((item,i) => (
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
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'clamp(1rem,2.2vw,1.15rem)',lineHeight:1.68,fontStyle:'italic',marginBottom:16}}>&ldquo;I&apos;ve watched Nigerian businesses — brilliant, resilient people — run their entire operation on WhatsApp voice notes and Excel sheets because nobody built the tools they actually need. Dawnova isn&apos;t a startup story. It&apos;s a mission to change that permanently. We didn&apos;t rush to launch. We built the foundation right first. Now we build everything else on top of it.&rdquo;</p>
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
                <button className="fiq" onClick={() => setFaqOpen(faqOpen===i?null:i)}>{item.q}<span className="fch">▾</span></button>
                <div className="fb"><div className="fbi">{item.a}</div></div>
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
              <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.78rem',color:'#8A90B5',marginBottom:28,position:'relative'}}>Already joined: <strong style={{color:'#FB7185'}}>{count} early members</strong></p>
              {formState==='success' ? (
                <div style={{position:'relative'}}>
                  <div style={{color:'#FB7185',fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:'1rem',margin:'12px 0'}}>🎉 You&apos;re in! We&apos;ll be in touch before launch.</div>
                </div>
              ) : (
                <div style={{position:'relative'}}>
                  <div style={{display:'flex',gap:10,maxWidth:460,margin:'0 auto 8px',flexWrap:'wrap',justifyContent:'center'}}>
                    <input className="wi" type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)}/>
                    <button className="btn-p" onClick={handleJoin} disabled={formState==='loading'}>{formState==='loading'?'Joining...':'Claim My Free Spot'}</button>
                  </div>
                  <p style={{fontSize:'.72rem',color:'#8A90B5',marginTop:8,position:'relative'}}>🔒 No credit card. No spam. Takes 30 seconds.</p>
                  <a href="https://wa.me/2340000000000" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#8A90B5',fontSize:'.8rem',textDecoration:'none',marginTop:8}}>💬 Or chat directly on WhatsApp</a>
                  <p style={{fontSize:'.7rem',color:'#8A90B5',marginTop:10}}>By joining you agree to our <button style={{background:'none',border:'none',color:'#8A90B5',textDecoration:'underline',cursor:'pointer',fontSize:'.7rem'}} onClick={() => setModal('privacy')}>Privacy Policy</button> and <button style={{background:'none',border:'none',color:'#8A90B5',textDecoration:'underline',cursor:'pointer',fontSize:'.7rem'}} onClick={() => setModal('terms')}>Terms of Service</button>.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'0 24px 80px',maxWidth:1100,margin:'0 auto'}}>
        <p className="ey">Partners & Press</p>
        <div style={{border:'1px dashed var(--border)',borderRadius:16,padding:40,textAlign:'center',marginTop:40}}>
          <p style={{color:'#8A90B5',fontSize:'.83rem',marginBottom:16}}>Partner logos and press mentions will appear here as Dawnova grows.</p>
          <button className="btn-s" onClick={() => scrollTo('waitlist')}>Become a Partner</button>
        </div>
      </div>

      <div className="sticky-cta" id="stickyCta">
        <button className="btn-p" onClick={() => scrollTo('waitlist')} style={{width:'100%',maxWidth:400,padding:14}}>Claim My Early Access — Free</button>
      </div>

      <footer>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:40,marginBottom:40}}>
            <div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'1.1rem',letterSpacing:'.06em',marginBottom:4}}>DAW<span className="gt">N</span>OVA</div>
              <div style={{color:'#8A90B5',fontSize:'.66rem',letterSpacing:'.2em',textTransform:'uppercase',marginBottom:6}}>Technologies</div>
              <div style={{color:'#8A90B5',fontSize:'.76rem',fontStyle:'italic'}}>Rising from dawn. Reaching for nova.</div>
            </div>
            <div style={{display:'flex',gap:44,flexWrap:'wrap'}}>
              {[{h:'Company',links:[['What We Build','#what'],['Roadmap','#roadmap'],['Team','#team'],['FAQ','#faq']]},{h:'Products',links:[['Dawnova Commerce','#'],['Dawnova Capital','#'],['Dawnova AI','#'],['Dawnova Pay','#']]},{h:'Connect',links:[['Twitter / X','#'],['Instagram','#'],['LinkedIn','#'],['WhatsApp','#']]}].map((col,i) => (
                <div key={i}>
                  <h4 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.64rem',letterSpacing:'.22em',textTransform:'uppercase',color:'#8A90B5',marginBottom:13}}>{col.h}</h4>
                  {col.links.map(([label,href],j) => <a key={j} href={href} style={{display:'block',color:'#8A90B5',textDecoration:'none',fontSize:'.82rem',marginBottom:9}}>{label}</a>)}
                </div>
              ))}
              <div>
                <h4 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'.64rem',letterSpacing:'.22em',textTransform:'uppercase',color:'#8A90B5',marginBottom:13}}>Legal</h4>
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