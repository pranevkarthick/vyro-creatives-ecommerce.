import React, { useMemo, useState } from 'react'
import {
  ArrowRight, Menu, X, Instagram, Sparkles, Palette, Image, Layers,
  Megaphone, BadgeCheck, Clock3, ShieldCheck, ChevronDown, Send,
  ShoppingBag, UserRound, LayoutDashboard, Plus, Trash2, LogOut,
  MessageCircle, CheckCircle2, WandSparkles
} from 'lucide-react'

const starterProducts = [
  { id: 'VC-001', name: 'Cinematic Creator Poster', category: 'Posters', price: 399, description: 'Bold cinematic poster for creators, launches and personal brands.', tag: 'Popular', image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85' },
  { id: 'VC-002', name: 'Birthday Celebration Poster', category: 'Event Designs', price: 299, description: 'A personalised birthday design with your photos and message.', tag: 'Best for gifts', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=85' },
  { id: 'VC-003', name: 'Valakappu Invitation Poster', category: 'Traditional', price: 399, description: 'Elegant traditional styling for a memorable family celebration.', tag: 'Traditional', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85' },
  { id: 'VC-004', name: 'Business Promo Creative', category: 'Business', price: 499, description: 'A polished promotional visual for products, offers and services.', tag: 'For brands', image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=85' },
  { id: 'VC-005', name: 'Logo Starter Concept', category: 'Logo Designs', price: 799, description: 'A distinctive starter logo concept for a new brand or project.', tag: 'Branding', image: 'https://images.unsplash.com/photo-1634942536790-2534db7a4f38?auto=format&fit=crop&w=900&q=85' },
  { id: 'VC-006', name: 'Social Media Banner Set', category: 'Banners', price: 599, description: 'Consistent visual assets for your social media presence.', tag: 'Bundle', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=85' },
]

const categories = ['All', 'Posters', 'Event Designs', 'Traditional', 'Business', 'Logo Designs', 'Banners']

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)
}

function Brand({ onClick }) {
  return <button className="brand" onClick={onClick} aria-label="Vyro Creatives home">
    <span className="brand-mark">V<span>.</span></span>
    <span className="brand-name">VYRO <small>CREATIVES</small></span>
  </button>
}

function Header({ page, setPage, cartCount }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = [['Home', 'home'], ['Services', 'services'], ['Portfolio', 'portfolio'], ['Shop', 'shop'], ['Contact', 'contact']]
  return <header className="header">
    <div className="container nav-wrap">
      <Brand onClick={() => setPage('home')} />
      <nav className={mobileOpen ? 'nav nav-open' : 'nav'}>
        {links.map(([label, target]) => <button key={target} className={page === target ? 'nav-link active' : 'nav-link'} onClick={() => { setPage(target); setMobileOpen(false) }}>{label}</button>)}
        <button className="nav-link" onClick={() => { setPage('login'); setMobileOpen(false) }}>Admin</button>
      </nav>
      <div className="nav-actions">
        <button className="icon-button cart-button" onClick={() => setPage('shop')} aria-label="Open shop"><ShoppingBag size={18}/><span>{cartCount}</span></button>
        <button className="button button-small" onClick={() => setPage('order')}>Start a project <ArrowRight size={16}/></button>
        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X/> : <Menu/>}</button>
      </div>
    </div>
  </header>
}

function Hero({ setPage }) {
  return <section className="hero">
    <div className="hero-grid"></div>
    <div className="container hero-inner">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse"></span> INDEPENDENT CREATIVE STUDIO</div>
        <h1>Your vision.<br/><span>Unleashed.</span></h1>
        <p className="hero-description">We turn ideas into scroll-stopping visuals. Premium posters, brand identities and digital creatives made to make your brand impossible to ignore.</p>
        <div className="hero-actions">
          <button className="button" onClick={() => setPage('shop')}>Explore designs <ArrowRight size={17}/></button>
          <button className="button button-ghost" onClick={() => setPage('order')}>Request a custom design</button>
        </div>
        <div className="hero-proof"><div className="proof-avatars"><span>V</span><span>✦</span><span>✳</span></div><div><strong>Made for your next big idea</strong><small>Custom design · Personalised service</small></div></div>
      </div>
      <div className="hero-art">
        <div className="orb orb-one"></div><div className="orb orb-two"></div>
        <div className="art-label label-top"><Sparkles size={14}/> VISUAL CULTURE / 001</div>
        <div className="poster-stack">
          <div className="poster poster-back"><div className="poster-back-shape"></div><span>MAKE<br/>IT<br/><b>MATTER.</b></span><small>CREATIVE DIRECTION / 2026</small></div>
          <div className="poster poster-front"><div className="poster-sun"></div><div className="poster-lines"></div><div className="poster-number">VC—026</div><div className="poster-title">CREATE<br/><em>WITHOUT</em><br/>LIMITS.</div><div className="poster-bottom"><span>VYRO CREATIVES</span><span>UNLEASH THE VISUAL</span></div></div>
        </div>
        <div className="art-label label-bottom"><span className="label-dot"></span> DESIGN THAT GETS NOTICED</div>
        <div className="floating-card"><WandSparkles size={18}/><div><strong>Made for you</strong><small>Never one-size-fits-all</small></div></div>
      </div>
    </div>
    <div className="hero-footer"><span>DESIGN / IDENTITY / STORY</span><span>SCROLL TO EXPLORE ↓</span></div>
  </section>
}

function SectionHeading({ kicker, title, description }) {
  return <div className="section-heading"><div className="eyebrow">{kicker}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>
}

function Services({ setPage }) {
  const items = [
    { icon: <Image/>, n: '01', title: 'Posters & Campaigns', text: 'Cinematic posters, event announcements and launches built to stop the scroll.' },
    { icon: <Layers/>, n: '02', title: 'Brand Identity', text: 'Logo concepts and visual systems that give your brand a memorable signature.' },
    { icon: <Megaphone/>, n: '03', title: 'Digital Creatives', text: 'Banners, social media graphics and promotional assets with a clear message.' },
  ]
  return <section className="section container" id="services">
    <SectionHeading kicker="WHAT WE CREATE" title={<>Small brief.<br/><span>Big visual energy.</span></>} description="Creative design for people, events and brands with something to say."/>
    <div className="service-grid">{items.map(item => <article className="service-card" key={item.n}><div className="service-top"><div className="service-icon">{item.icon}</div><span>{item.n}</span></div><h3>{item.title}</h3><p>{item.text}</p><button className="text-link" onClick={() => setPage('shop')}>Explore service <ArrowRight size={15}/></button></article>)}</div>
  </section>
}

function ProductCard({ product, onOrder }) {
  return <article className="product-card">
    <div className="product-image-wrap"><img src={product.image} alt={product.name} loading="lazy"/><span className="product-tag">{product.tag}</span><button className="quick-order" onClick={() => onOrder(product)}>Order this design <ArrowRight size={15}/></button></div>
    <div className="product-info"><div className="product-category">{product.category}</div><h3>{product.name}</h3><p>{product.description}</p><div className="product-bottom"><strong>{formatPrice(product.price)}<small> starting at</small></strong><button className="round-arrow" onClick={() => onOrder(product)} aria-label={`Order ${product.name}`}><ArrowRight size={17}/></button></div></div>
  </article>
}

function Shop({ products, onOrder }) {
  const [category, setCategory] = useState('All')
  const filtered = products.filter(p => category === 'All' || p.category === category)
  return <section className="section container" id="shop">
    <SectionHeading kicker="THE DESIGN SHELF" title={<>Find your next<br/><span>signature visual.</span></>} description="Choose a starting point, then tell us how to make it yours."/>
    <div className="category-list">{categories.map(c => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'category-chip selected' : 'category-chip'}>{c}</button>)}</div>
    <div className="product-grid">{filtered.map(p => <ProductCard key={p.id} product={p} onOrder={onOrder}/>)}</div>
  </section>
}

function Portfolio() {
  const images = [
    ['01 / CAMPAIGN', 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85', 'Make an entrance'],
    ['02 / IDENTITY', 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=85', 'Built to be remembered'],
    ['03 / DIGITAL', 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=85', 'Color outside the lines'],
  ]
  return <section className="section container" id="portfolio"><SectionHeading kicker="SELECTED VISUALS" title={<>Ideas in a different<br/><span>light.</span></>} description="A glimpse of the bold, modern visual language we love."/><div className="portfolio-grid">{images.map(([tag, src, title]) => <article className="portfolio-card" key={tag}><img src={src} alt={title} loading="lazy"/><div className="portfolio-overlay"><small>{tag}</small><h3>{title}</h3></div></article>)}</div></section>
}

function OrderModal({ product, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', instagram: '', type: product?.name || '', style: 'Cinematic', format: 'Instagram Post', budget: product?.price ? String(product.price) : '', deadline: '', brief: '' })
  const [submitted, setSubmitted] = useState(false)
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const submit = e => { e.preventDefault(); const orders = JSON.parse(localStorage.getItem('vyro-orders') || '[]'); orders.unshift({ ...form, id: 'VY-' + Date.now().toString().slice(-6), createdAt: new Date().toISOString(), status: 'New' }); localStorage.setItem('vyro-orders', JSON.stringify(orders)); setSubmitted(true) }
  if (submitted) return <div className="modal-backdrop" onClick={onClose}><div className="modal success-modal" onClick={e => e.stopPropagation()}><div className="success-icon"><CheckCircle2 size={30}/></div><h2>Brief received!</h2><p>This demo saved your request in this browser. To receive real customer orders, connect a backend before publishing.</p><button className="button" onClick={onClose}>Done <ArrowRight size={16}/></button></div></div>
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><div className="eyebrow">LET'S MAKE SOMETHING</div><h2>Start a project<span>.</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X/></button></div><p className="modal-intro">Tell us a little about your idea. We'll confirm the quote and timeline before starting.</p><form onSubmit={submit} className="order-form">
    <div className="form-row"><label>Your name<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Name"/></label><label>Email<input type="email" required value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com"/></label></div>
    <div className="form-row"><label>Instagram username<input value={form.instagram} onChange={e => update('instagram', e.target.value)} placeholder="@yourhandle"/></label><label>Design type<input required value={form.type} onChange={e => update('type', e.target.value)} placeholder="Poster, logo, banner..."/></label></div>
    <div className="form-row"><label>Style<select value={form.style} onChange={e => update('style', e.target.value)}><option>Cinematic</option><option>Luxury</option><option>Minimal</option><option>Traditional</option><option>Neon</option><option>Surprise me</option></select></label><label>Output format<select value={form.format} onChange={e => update('format', e.target.value)}><option>Instagram Post</option><option>Instagram Story</option><option>WhatsApp</option><option>Print</option><option>Other</option></select></label></div>
    <div className="form-row"><label>Budget (INR)<input value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="e.g. 399"/></label><label>Deadline<input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)}/></label></div>
    <label>Design brief<textarea required value={form.brief} onChange={e => update('brief', e.target.value)} placeholder="Names, text to include, colours, event date and reference ideas..." rows="4"/></label>
    <button className="button button-full" type="submit">Send design brief <Send size={16}/></button><small className="form-note">Demo only: this form stores requests in this browser, not in a shared database.</small>
  </form></div></div>
}

function Contact({ setPage }) {
  return <section className="contact-section" id="contact"><div className="container contact-inner"><div><div className="eyebrow">HAVE AN IDEA?</div><h2>Let's make it<br/><span>impossible to ignore.</span></h2><p>Tell us what you're imagining. We'll help turn it into a visual.</p></div><div className="contact-actions"><button className="button" onClick={() => setPage('order')}>Start your brief <ArrowRight size={17}/></button><a className="button button-ghost" href="https://www.instagram.com/" target="_blank" rel="noreferrer"><Instagram size={17}/> Message on Instagram</a><small>Replace the Instagram link with your profile URL before launch.</small></div></div></section>
}

function Footer({ setPage }) {
  return <footer className="footer"><div className="container footer-top"><div><Brand onClick={() => setPage('home')}/><p>Independent creative studio for bold ideas and memorable visuals.</p></div><div className="footer-links"><span>EXPLORE</span><button onClick={() => setPage('shop')}>Shop designs</button><button onClick={() => setPage('portfolio')}>Portfolio</button><button onClick={() => setPage('order')}>Start a project</button></div><div className="footer-links"><span>CONNECT</span><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram <ArrowRight size={13}/></a><a href="mailto:hello@vyrocreatives.example">Email us <ArrowRight size={13}/></a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Vyro Creatives</span><span>MADE WITH INTENTION <span className="purple">✦</span></span></div></footer>
}

function Admin({ products, setProducts, setPage }) {
  const [tab, setTab] = useState('orders')
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Posters', price: '', description: '' })
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem('vyro-orders') || '[]'))
  const refreshOrders = () => setOrders(JSON.parse(localStorage.getItem('vyro-orders') || '[]'))
  const addProduct = e => { e.preventDefault(); setProducts(prev => [...prev, { ...newProduct, id: 'VC-' + Date.now(), price: Number(newProduct.price), tag: 'New', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=85' }]); setNewProduct({ name: '', category: 'Posters', price: '', description: '' }) }
  const deleteProduct = id => setProducts(prev => prev.filter(p => p.id !== id))
  const updateStatus = (id, status) => { const next = orders.map(o => o.id === id ? { ...o, status } : o); setOrders(next); localStorage.setItem('vyro-orders', JSON.stringify(next)) }
  return <main className="admin-page container"><div className="admin-heading"><div><div className="eyebrow">VYRO CONTROL ROOM</div><h1>Studio dashboard<span>.</span></h1><p>Manage your demo products and locally saved order requests.</p></div><button className="button button-ghost" onClick={() => setPage('home')}><LogOut size={16}/> Exit dashboard</button></div>
    <div className="admin-tabs"><button className={tab==='orders'?'selected':''} onClick={() => {setTab('orders'); refreshOrders()}}>Orders <span>{orders.length}</span></button><button className={tab==='products'?'selected':''} onClick={() => setTab('products')}>Products <span>{products.length}</span></button></div>
    {tab === 'orders' ? <div className="admin-panel"><div className="panel-head"><h2>Order requests</h2><button className="button button-small button-ghost" onClick={refreshOrders}>Refresh</button></div>{orders.length ? <div className="order-list">{orders.map(o => <article className="order-row" key={o.id}><div><strong>{o.type || 'Custom design'}</strong><small>{o.name} · {o.email} · {o.instagram || 'No Instagram handle'}</small><small>{o.id} · {new Date(o.createdAt).toLocaleString()}</small><p>{o.brief}</p></div><div className="order-status"><select value={o.status} onChange={e => updateStatus(o.id,e.target.value)}><option>New</option><option>Quoted</option><option>In progress</option><option>Completed</option><option>Cancelled</option></select><strong>{o.budget ? formatPrice(Number(o.budget)||0) : 'Budget not set'}</strong></div></article>)}</div> : <div className="empty-state"><ShoppingBag size={26}/><h3>No orders yet</h3><p>New demo requests will appear here in this browser.</p></div>}</div> : <div className="admin-panel"><div className="panel-head"><h2>Products</h2></div><form className="add-product-form" onSubmit={addProduct}><label>Product name<input required value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/></label><label>Category<select value={newProduct.category} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}>{categories.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select></label><label>Price (INR)<input required type="number" min="1" value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})}/></label><label>Description<input required value={newProduct.description} onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/></label><button className="button" type="submit"><Plus size={16}/> Add product</button></form><div className="admin-product-list">{products.map(p=><div className="admin-product" key={p.id}><div><strong>{p.name}</strong><small>{p.category} · {formatPrice(p.price)}</small></div><button className="icon-button danger" onClick={()=>deleteProduct(p.id)} aria-label={`Delete ${p.name}`}><Trash2 size={16}/></button></div>)}</div></div>}
    <div className="demo-warning"><ShieldCheck size={18}/><p><strong>Prototype dashboard.</strong> This is not secure admin authentication. Product and order data are stored in the current browser only. Connect a real database and role-based authentication before using with customers.</p></div>
  </main>
}

function Login({ setPage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  return <main className="login-page container"><form className="login-card" onSubmit={e=>{e.preventDefault();setNotice('Demo sign-in only. Secure authentication is not connected.');}}><div className="login-icon"><UserRound size={25}/></div><div className="eyebrow">WELCOME BACK</div><h1>Studio access<span>.</span></h1><p>This sign-in screen is a UI prototype. It does not authenticate users yet.</p><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label><button className="button button-full">Continue <ArrowRight size={16}/></button>{notice && <div className="inline-notice">{notice}</div>}<button type="button" className="text-link center-link" onClick={()=>setPage('home')}>Back to website</button></form></main>
}

function App() {
  const [page, setPage] = useState('home')
  const [products, setProducts] = useState(starterProducts)
  const [orderProduct, setOrderProduct] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const openOrder = product => { setOrderProduct(product); setModalOpen(true); setCartCount(count => count + 1) }
  const navigate = target => { setPage(target); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const showHomeSections = page === 'home'
  return <div className="app-shell">
    <Header page={page} setPage={navigate} cartCount={cartCount}/>
    {page === 'login' || page === 'admin' ? <Login setPage={navigate}/> : <>
      {showHomeSections && <><Hero setPage={navigate}/><Services setPage={navigate}/><Portfolio/><Shop products={products.slice(0,3)} onOrder={openOrder}/><Contact setPage={navigate}/></>}
      {page === 'services' && <Services setPage={navigate}/>}
      {page === 'portfolio' && <Portfolio/>}
      {page === 'shop' && <Shop products={products} onOrder={openOrder}/>}
      {page === 'contact' && <Contact setPage={navigate}/>}
      {page === 'order' && <section className="section container order-page"><SectionHeading kicker="YOUR NEXT IDEA STARTS HERE" title={<>Let's make it<br/><span>real.</span></>}/><button className="button" onClick={()=>openOrder(null)}>Open design brief <ArrowRight size={17}/></button></section>}
      <Footer setPage={navigate}/>
    </>}
    {modalOpen && <OrderModal product={orderProduct} onClose={()=>setModalOpen(false)}/>}
  </div>
}

export default App
