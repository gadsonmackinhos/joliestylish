// Minimal Node.js Express server example to forward orders to WhatsApp Cloud API
// Requirements:
// - Node.js 18+ (has global fetch) or install `node-fetch`/`axios` and adjust accordingly
// - `npm install express` (and `npm install axios` if you prefer)
// Replace PHONE_NUMBER_ID, ACCESS_TOKEN and ADMIN_NUMBER with your values.

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Load environment variables
require('dotenv').config();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'clothing-store-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const app = express();
app.use(express.json({ limit: '10mb' })); // Increase limit for image uploads

// Input validation middleware
const validateOrderInput = (req, res, next) => {
  const { productTitle, price, size, imageUrl, customerPhone } = req.body;

  if (!productTitle || typeof productTitle !== 'string' || productTitle.length > 200) {
    return res.status(400).json({ error: 'Invalid product title' });
  }

  if (!price || typeof price !== 'string' || price.length > 50) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  if (size && (typeof size !== 'string' || size.length > 20)) {
    return res.status(400).json({ error: 'Invalid size' });
  }

  if (imageUrl && (typeof imageUrl !== 'string' || !imageUrl.match(/^https?:\/\/.+/))) {
    return res.status(400).json({ error: 'Invalid image URL' });
  }

  if (customerPhone && (typeof customerPhone !== 'string' || customerPhone.length > 20)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  next();
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'images'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Configuration from env
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '250785734363';
const ORDER_SECRET = process.env.ORDER_SECRET || ''; // optional shared secret for simple auth
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // set to your site in production

// CORS middleware (restrictable via ALLOWED_ORIGIN)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-order-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute for sensitive operations
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/admin/', strictLimiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Simple auth middleware: if ORDER_SECRET is set, require header `x-order-secret` to match
function requireOrderSecret(req, res, next){
  if(!ORDER_SECRET) return next();
  const h = req.headers['x-order-secret'];
  if(h && h === ORDER_SECRET) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

const ORDERS_FILE = path.join(__dirname, 'orders.json');
function appendOrder(order){
  let arr = [];
  try{
    if(fs.existsSync(ORDERS_FILE)) arr = JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')||'[]');
  }catch(e){ arr = []; }
  order.receivedAt = new Date().toISOString();
  // ensure each order has a stable id for later operations
  if(!order.id) order.id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  // processed flag
  if(typeof order.processed === 'undefined') order.processed = false;
  arr.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(arr, null, 2));
}

// POST /api/order - receive an order from the website and forward to admin via WhatsApp Cloud API
app.post('/api/order', requireOrderSecret, validateOrderInput, async (req, res) => {
  const { productTitle, price, size, imageUrl, customerPhone } = req.body;

  logger.info('New order received', {
    productTitle,
    price,
    size,
    customerPhone,
    hasImage: !!imageUrl,
    ip: req.ip
  });

  try {

    const text = `New order:\n${productTitle} - ${price || ''}\nSize: ${size || ''}\nFrom: ${customerPhone || 'web buyer'}`;

    // store locally
    appendOrder({ productTitle, price, size, imageUrl, customerPhone });

    // send text message
    await axios.post(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: ADMIN_NUMBER,
      type: 'text',
      text: { body: text }
    }, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
    });

    // send image as media message by link (WhatsApp will fetch the link)
    if (imageUrl) {
      await axios.post(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
        messaging_product: 'whatsapp',
        to: ADMIN_NUMBER,
        type: 'image',
        image: { link: imageUrl, caption: `${productTitle} — ${price || ''}` }
      }, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
      });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error('Order forward error', {
      error: err.message,
      stack: err.stack,
      order: { productTitle, price, size, customerPhone }
    });
    console.error('Order forward error:', err.response?.data || err.message || err);
    res.status(500).json({ error: String(err) });
  }
});

// Admin: list orders (protected by ORDER_SECRET if set)
app.get('/admin/orders', requireOrderSecret, (req, res) => {
  try{
    const data = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')||'[]') : [];
    res.json({ orders: data });
  }catch(e){ res.status(500).json({ error: String(e) }); }
});

// Mark order as processed/unprocessed
app.post('/admin/orders/:id/process', requireOrderSecret, (req, res) => {
  try{
    const id = req.params.id;
    const arr = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')||'[]') : [];
    const idx = arr.findIndex(o => o.id === id);
    if(idx === -1) return res.status(404).json({ error: 'not found' });
    arr[idx].processed = !arr[idx].processed;
    arr[idx].processedAt = arr[idx].processed ? new Date().toISOString() : null;
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(arr, null, 2));
    res.json({ ok: true, order: arr[idx] });
  }catch(e){ res.status(500).json({ error: String(e) }); }
});

// Delete order by id
app.delete('/admin/orders/:id', requireOrderSecret, (req, res) => {
  try{
    const id = req.params.id;
    let arr = fs.existsSync(ORDERS_FILE) ? JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')||'[]') : [];
    const idx = arr.findIndex(o => o.id === id);
    if(idx === -1) return res.status(404).json({ error: 'not found' });
    const removed = arr.splice(idx,1)[0];
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(arr, null, 2));
    res.json({ ok: true, removed });
  }catch(e){ res.status(500).json({ error: String(e) }); }
});

// Image management endpoints
const IMAGES_DIR = path.join(__dirname, 'images');

// List images
app.get('/admin/images', requireOrderSecret, (req, res) => {
  try {
    if (!fs.existsSync(IMAGES_DIR)) {
      return res.json({ images: [] });
    }
    
    const files = fs.readdirSync(IMAGES_DIR)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        name: file,
        url: `/images/${file}`,
        size: fs.statSync(path.join(IMAGES_DIR, file)).size,
        modified: fs.statSync(path.join(IMAGES_DIR, file)).mtime.toISOString()
      }))
      .sort((a, b) => new Date(b.modified) - new Date(a.modified)); // newest first
    
    res.json({ images: files });
  } catch(e) {
    res.status(500).json({ error: String(e) });
  }
});

// Upload image
app.post('/admin/images/upload', requireOrderSecret, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    res.json({
      ok: true,
      image: {
        name: req.file.filename,
        url: `/images/${req.file.filename}`,
        size: req.file.size,
        originalName: req.file.originalname
      }
    });
  } catch(e) {
    res.status(500).json({ error: String(e) });
  }
});

// Delete image
app.delete('/admin/images/:filename', requireOrderSecret, (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(IMAGES_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    fs.unlinkSync(filepath);
    res.json({ ok: true, deleted: filename });
  } catch(e) {
    res.status(500).json({ error: String(e) });
  }
});

// Serve static images
app.use('/images', express.static(IMAGES_DIR));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Order server listening on http://localhost:${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    hasOrderSecret: !!ORDER_SECRET,
    hasWhatsAppCredentials: !!(PHONE_NUMBER_ID && ACCESS_TOKEN && ADMIN_NUMBER)
  });
  console.log(`Order server listening on http://localhost:${PORT}`);
});
