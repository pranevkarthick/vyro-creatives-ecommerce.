import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import multer from 'multer';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, 'vyro.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_paise INTEGER NOT NULL CHECK(price_paise >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK(discount_percent BETWEEN 1 AND 80),
  active INTEGER NOT NULL DEFAULT 1,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_instagram TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL,
  subtotal_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL,
  referral_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT '',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  design_brief TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const seedProducts = [
  ['Cinematic Creator Poster','cinematic-creator-poster','Posters','Bold cinematic poster for creators, launches and personal brands.',39900,'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85'],
  ['Birthday Celebration Poster','birthday-celebration-poster','Event Designs','A personalised birthday design with your photos and message.',29900,'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=85'],
  ['Valakappu Invitation Poster','valakappu-invitation-poster','Traditional','Elegant traditional styling for a memorable family celebration.',39900,'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85'],
  ['Business Promo Creative','business-promo-creative','Business','A polished promotional visual for products, offers and services.',49900,'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=900&q=85'],
  ['Logo Starter Concept','logo-starter-concept','Logo Designs','A distinctive starter logo concept for a new brand or project.',79900,'https://images.unsplash.com/photo-1634942536790-2534db7a4f38?auto=format&fit=crop&w=900&q=85'],
  ['Social Media Banner Set','social-media-banner-set','Banners','Consistent visual assets for your social media presence.',59900,'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=900&q=85']
];
const insertProduct = db.prepare(`INSERT OR IGNORE INTO products(name,slug,category,description,price_paise,image_url) VALUES(?,?,?,?,?,?)`);
for (const p of seedProducts) insertProduct.run(...p);

const setting = (key, fallback = '') => db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value ?? fallback;
const setSetting = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
if (!setting('brand_name')) setSetting.run('brand_name','VYRO CREATIVES');
if (!setting('tagline')) setSetting.run('tagline','Unleash the Visual.');
if (!setting('upi_qr_url')) setSetting.run('upi_qr_url','');

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (!exists) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
    db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
      .run(process.env.ADMIN_NAME || 'Vyro Admin', email, hash, 'admin');
    console.log(`Created admin user: ${email}`);
  }
}

const SQLiteStore = SQLiteStoreFactory(session);
app.set('trust proxy', isProduction ? 1 : 0);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir, concurrentDB: true }),
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));
app.use(express.static(path.join(__dirname, 'public')));

const safeUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const currentUser = req => req.session.user || null;
function requireAuth(req,res,next) {
  if (!currentUser(req)) return res.status(401).json({ error: 'Please sign in first.' });
  next();
}
function requireAdmin(req,res,next) {
  if (currentUser(req)?.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
}
function moneyNumber(n) { return Number(n) / 100; }
function publicProduct(p) {
  return { id:p.id, name:p.name, slug:p.slug, category:p.category, description:p.description, price:moneyNumber(p.price_paise), imageUrl:p.image_url, active:Boolean(p.active) };
}
function uniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'VYRO-';
  for (let i=0;i<6;i++) code += chars[crypto.randomInt(chars.length)];
  return code;
}
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70) || 'design';

app.get('/api/config', (req,res) => res.json({
  brandName: setting('brand_name','VYRO CREATIVES'),
  tagline: setting('tagline','Unleash the Visual.'),
  upiQrUrl: setting('upi_qr_url',''),
  razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  user: currentUser(req)
}));

app.get('/api/products', (req,res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all();
  res.json(rows.map(publicProduct));
});
app.get('/api/products/:slug', (req,res) => {
  const p = db.prepare('SELECT * FROM products WHERE slug=? AND active=1').get(req.params.slug);
  if (!p) return res.status(404).json({error:'Product not found'});
  res.json(publicProduct(p));
});

app.post('/api/auth/register', async (req,res) => {
  if (process.env.ALLOW_REGISTRATION === 'false') return res.status(403).json({error:'Registration is disabled.'});
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 10)
    return res.status(400).json({error:'Enter your name, valid email and a password of at least 10 characters.'});
  const normalized = email.toLowerCase().trim();
  try {
    const hash = await bcrypt.hash(password,12);
    const result = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name.trim().slice(0,100), normalized, hash);
    req.session.user = safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid));
    res.json({user:req.session.user});
  } catch (e) {
    if (String(e.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({error:'An account with this email already exists.'});
    console.error(e); res.status(500).json({error:'Could not create account.'});
  }
});
app.post('/api/auth/login', async (req,res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({error:'Email and password are required.'});
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email).toLowerCase().trim());
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) return res.status(401).json({error:'Invalid email or password.'});
  req.session.regenerate(err => {
    if (err) return res.status(500).json({error:'Could not start session.'});
    req.session.user = safeUser(user);
    res.json({user:req.session.user});
  });
});
app.post('/api/auth/logout', (req,res) => req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ok:true}); }));
app.get('/api/auth/me', (req,res) => res.json({user:currentUser(req)}));

app.get('/api/referrals/validate/:code', (req,res) => {
  const r = db.prepare('SELECT * FROM referrals WHERE code=? COLLATE NOCASE AND active=1').get(req.params.code.trim());
  if (!r || (r.max_uses !== null && r.uses >= r.max_uses)) return res.status(404).json({error:'Referral code is not valid.'});
  res.json({code:r.code, discountPercent:r.discount_percent});
});

app.post('/api/orders', async (req,res) => {
  const { customerName, customerEmail, instagram, items, referralCode, brief, paymentMethod } = req.body || {};
  if (!customerName?.trim() || !customerEmail?.trim() || !Array.isArray(items) || items.length < 1 || items.length > 30)
    return res.status(400).json({error:'Name, email and at least one item are required.'});
  const ids = [...new Set(items.map(i => Number(i.productId)).filter(Number.isInteger))];
  if (!ids.length) return res.status(400).json({error:'Invalid products.'});
  const products = db.prepare(`SELECT * FROM products WHERE active=1 AND id IN (${ids.map(()=>'?').join(',')})`).all(...ids);
  const quantityMap = new Map();
  for (const item of items) {
    const id = Number(item.productId), qty = Math.max(1, Math.min(10, Math.floor(Number(item.quantity)||1)));
    if (ids.includes(id)) quantityMap.set(id, Math.min(10, (quantityMap.get(id)||0) + qty));
  }
  const normalizedItems = products.map(p => ({productId:p.id,name:p.name,pricePaise:p.price_paise,quantity:quantityMap.get(p.id)||1}));
  if (!normalizedItems.length) return res.status(400).json({error:'Products are unavailable.'});
  const subtotal = normalizedItems.reduce((sum,i)=>sum+i.pricePaise*i.quantity,0);
  let discount = 0, code = '';
  if (referralCode?.trim()) {
    const r = db.prepare('SELECT * FROM referrals WHERE code=? COLLATE NOCASE AND active=1').get(referralCode.trim());
    if (!r || (r.max_uses !== null && r.uses >= r.max_uses)) return res.status(400).json({error:'Referral code is invalid or has reached its usage limit.'});
    discount = Math.floor(subtotal * r.discount_percent / 100);
    code = r.code;
  }
  const total = Math.max(0, subtotal - discount);
  const publicId = 'VY-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const user = currentUser(req);
  const result = db.prepare(`INSERT INTO orders(public_id,user_id,customer_name,customer_email,customer_instagram,items_json,subtotal_paise,discount_paise,total_paise,referral_code,payment_method,design_brief)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(publicId,user?.id||null,customerName.trim().slice(0,100),customerEmail.trim().toLowerCase().slice(0,180),String(instagram||'').slice(0,100),JSON.stringify(normalizedItems),subtotal,discount,total,code,String(paymentMethod||'razorpay').slice(0,30),String(brief||'').slice(0,5000));
  const order = { id:result.lastInsertRowid, publicId, subtotal:moneyNumber(subtotal), discount:moneyNumber(discount), total:moneyNumber(total), referralCode:code, items:normalizedItems.map(i=>({...i,price:moneyNumber(i.pricePaise)})) };
  if (code) db.prepare('UPDATE referrals SET uses=uses+1 WHERE code=? COLLATE NOCASE').run(code);
  res.status(201).json({order});
});

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id:process.env.RAZORPAY_KEY_ID, key_secret:process.env.RAZORPAY_KEY_SECRET }) : null;

app.post('/api/payments/razorpay/create-order', requireAuthOrGuest, async (req,res) => {
  if (!razorpay) return res.status(503).json({error:'Online payment is not configured yet. Add Razorpay test keys to .env.'});
  const { orderId } = req.body || {};
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(Number(orderId));
  if (!order) return res.status(404).json({error:'Order not found.'});
  if (currentUser(req) && currentUser(req).role !== 'admin' && order.user_id && order.user_id !== currentUser(req).id) return res.status(403).json({error:'Not allowed.'});
  try {
    const rp = await razorpay.orders.create({ amount:order.total_paise, currency:'INR', receipt:order.public_id, notes:{ order_public_id:order.public_id } });
    db.prepare('UPDATE orders SET razorpay_order_id=?,payment_method=? WHERE id=?').run(rp.id,'razorpay',order.id);
    res.json({ id:rp.id, amount:rp.amount, currency:rp.currency, keyId:process.env.RAZORPAY_KEY_ID, publicOrderId:order.public_id });
  } catch(e) { console.error('Razorpay create order:',e); res.status(502).json({error:'Could not start payment. Please try again.'}); }
});
function requireAuthOrGuest(req,res,next) { next(); }

app.post('/api/payments/razorpay/verify', (req,res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({error:'Payment verification details are missing.'});
  const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id=?').get(razorpay_order_id);
  if (!order) return res.status(404).json({error:'Order not found.'});
  const expected = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(razorpay_signature));
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return res.status(400).json({error:'Payment signature verification failed.'});
  db.prepare(`UPDATE orders SET razorpay_payment_id=?,payment_status='signature_verified',status='processing' WHERE id=?`).run(razorpay_payment_id,order.id);
  res.json({ok:true, message:'Payment signature verified. Final capture status will be confirmed by webhook.'});
});

// Razorpay webhook needs the raw request body for signature validation.
app.post('/api/webhooks/razorpay', express.raw({type:'application/json'}), (req,res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('Webhook secret not configured');
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body;
  if (!signature || !Buffer.isBuffer(body)) return res.status(400).send('Missing signature/body');
  const expected = crypto.createHmac('sha256',secret).update(body).digest('hex');
  const a=Buffer.from(expected), b=Buffer.from(String(signature));
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return res.status(400).send('Invalid signature');
  let event;
  try { event=JSON.parse(body.toString('utf8')); } catch { return res.status(400).send('Invalid JSON'); }
  const payment = event.payload?.payment?.entity;
  if (payment?.order_id) {
    const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id=?').get(payment.order_id);
    if (order) {
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        db.prepare(`UPDATE orders SET payment_status='paid',status='confirmed',razorpay_payment_id=COALESCE(?,razorpay_payment_id) WHERE id=?`).run(payment.id||null,order.id);
      } else if (event.event === 'payment.failed') {
        db.prepare(`UPDATE orders SET payment_status='failed' WHERE id=? AND payment_status!='paid'`).run(order.id);
      }
    }
  }
  res.json({received:true});
});

app.post('/api/payments/manual', (req,res) => {
  const { orderId } = req.body || {};
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(Number(orderId));
  if (!order) return res.status(404).json({error:'Order not found.'});
  db.prepare(`UPDATE orders SET payment_method='upi_qr',payment_status='pending_review',status='awaiting_payment_review' WHERE id=?`).run(order.id);
  res.json({ok:true,message:'Order is awaiting manual payment review. It is not marked as paid.'});
});

const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null,uploadsDir),
  filename: (req,file,cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase())
});
const upload = multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{
  if (!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) return cb(new Error('Only JPG, PNG or WebP images are allowed.'));
  cb(null,true);
}});

app.get('/api/admin/summary', requireAuth, requireAdmin, (req,res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(publicProduct);
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 300').all().map(o=>({...o,items:JSON.parse(o.items_json),subtotal:moneyNumber(o.subtotal_paise),discount:moneyNumber(o.discount_paise),total:moneyNumber(o.total_paise)}));
  const referrals = db.prepare('SELECT * FROM referrals ORDER BY id DESC').all();
  res.json({products,orders,referrals,settings:{brandName:setting('brand_name'),tagline:setting('tagline'),upiQrUrl:setting('upi_qr_url')}});
});
app.post('/api/admin/products', requireAuth, requireAdmin, upload.single('image'), (req,res) => {
  const {name,category,description,price} = req.body;
  if (!name?.trim() || !category?.trim() || !Number.isFinite(Number(price)) || Number(price)<0) return res.status(400).json({error:'Name, category and valid price are required.'});
  const slug = `${slugify(name)}-${crypto.randomBytes(3).toString('hex')}`;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.imageUrl||'').slice(0,1000);
  const result = db.prepare('INSERT INTO products(name,slug,category,description,price_paise,image_url) VALUES(?,?,?,?,?,?)').run(name.trim().slice(0,150),slug,category.trim().slice(0,80),String(description||'').slice(0,2000),Math.round(Number(price)*100),imageUrl);
  res.status(201).json(publicProduct(db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid)));
});
app.patch('/api/admin/products/:id', requireAuth, requireAdmin, (req,res) => {
  const p=db.prepare('SELECT * FROM products WHERE id=?').get(Number(req.params.id));
  if(!p) return res.status(404).json({error:'Product not found.'});
  const body=req.body||{};
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || String(body.price).trim()==='' || Number(body.price)<0 || Number(body.price)>10000000)) {
    return res.status(400).json({error:'Price must be a valid amount between ₹0 and ₹1,00,00,000.'});
  }
  db.prepare('UPDATE products SET name=?,category=?,description=?,price_paise=?,active=? WHERE id=?').run(
    String(body.name??p.name).slice(0,150),String(body.category??p.category).slice(0,80),String(body.description??p.description).slice(0,2000),
    body.price===undefined?p.price_paise:Math.round(Number(body.price)*100),body.active===undefined?p.active:(body.active?1:0),p.id
  );
  res.json(publicProduct(db.prepare('SELECT * FROM products WHERE id=?').get(p.id)));
});
app.delete('/api/admin/products/:id', requireAuth, requireAdmin, (req,res) => {
  const p=db.prepare('SELECT * FROM products WHERE id=?').get(Number(req.params.id));
  if(!p) return res.status(404).json({error:'Product not found.'});
  db.prepare('UPDATE products SET active=0 WHERE id=?').run(p.id);
  res.json({ok:true});
});
app.post('/api/admin/referrals', requireAuth, requireAdmin, (req,res) => {
  const discount = Math.floor(Number(req.body.discountPercent));
  if(!Number.isInteger(discount)||discount<1||discount>80) return res.status(400).json({error:'Discount must be between 1 and 80 percent.'});
  let code=String(req.body.code||'').trim().toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,30);
  if(!code) { do { code=uniqueCode(); } while(db.prepare('SELECT id FROM referrals WHERE code=?').get(code)); }
  try {
    db.prepare('INSERT INTO referrals(code,discount_percent,max_uses) VALUES(?,?,?)').run(code,discount,req.body.maxUses?Math.max(1,Math.floor(Number(req.body.maxUses))):null);
    res.status(201).json({code,discountPercent:discount});
  } catch { res.status(409).json({error:'Referral code already exists.'}); }
});
app.patch('/api/admin/referrals/:id', requireAuth, requireAdmin, (req,res) => {
  const active=req.body.active?1:0;
  db.prepare('UPDATE referrals SET active=? WHERE id=?').run(active,Number(req.params.id));
  res.json({ok:true});
});
app.patch('/api/admin/orders/:id', requireAuth, requireAdmin, (req,res) => {
  const allowed = ['new','quoted','in_progress','completed','cancelled','awaiting_payment_review'];
  const status=String(req.body.status||'').toLowerCase();
  const paymentStatus=String(req.body.paymentStatus||'').toLowerCase();
  const order=db.prepare('SELECT * FROM orders WHERE id=?').get(Number(req.params.id));
  if(!order) return res.status(404).json({error:'Order not found.'});
  if(req.body.status && !allowed.includes(status)) return res.status(400).json({error:'Invalid order status.'});
  if(req.body.paymentStatus && !['pending','pending_review','paid','failed','refunded'].includes(paymentStatus)) return res.status(400).json({error:'Invalid payment status.'});
  // Only admin can mark offline/manual payment as paid after independently confirming receipt.
  db.prepare('UPDATE orders SET status=COALESCE(?,status),payment_status=COALESCE(?,payment_status) WHERE id=?').run(req.body.status?status:null,req.body.paymentStatus?paymentStatus:null,order.id);
  res.json({ok:true});
});
app.patch('/api/admin/settings', requireAuth, requireAdmin, upload.single('qr'), (req,res) => {
  const body=req.body||{};
  if(body.brandName) setSetting.run('brand_name',String(body.brandName).slice(0,100));
  if(body.tagline) setSetting.run('tagline',String(body.tagline).slice(0,160));
  if(req.file) setSetting.run('upi_qr_url',`/uploads/${req.file.filename}`);
  else if(body.upiQrUrl!==undefined) setSetting.run('upi_qr_url',String(body.upiQrUrl).slice(0,1000));
  res.json({ok:true,settings:{brandName:setting('brand_name'),tagline:setting('tagline'),upiQrUrl:setting('upi_qr_url')}});
});

app.get('/api/orders/mine', requireAuth, (req,res) => {
  const rows=db.prepare('SELECT public_id,status,payment_status,total_paise,created_at FROM orders WHERE user_id=? ORDER BY id DESC').all(req.session.user.id);
  res.json(rows.map(o=>({...o,total:moneyNumber(o.total_paise)})));
});

// API fallback and SPA fallback
app.use('/api', (req,res) => res.status(404).json({error:'API route not found.'}));
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return res.status(400).json({error:err.message});
  if (err.message?.includes('Only JPG')) return res.status(400).json({error:err.message});
  res.status(500).json({error:'Unexpected server error.'});
});

app.listen(PORT, () => {
  console.log(`Vyro Creatives running at http://localhost:${PORT}`);
  if (!razorpay) console.log('Razorpay checkout disabled until API keys are configured in .env');
});
