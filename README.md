# Jolie Stylish - Professional Clothing Store

A modern, secure, and scalable e-commerce website for a clothing business with WhatsApp integration.

## 🚀 Features

- **Modern UI**: Responsive Bootstrap 5 design with smooth animations
- **WhatsApp Integration**: Direct order messaging to admin
- **Admin Panel**: Complete order and image management system
- **Image Upload**: Secure file upload with validation
- **Security**: Rate limiting, input validation, security headers
- **Logging**: Comprehensive error and access logging
- **SEO Ready**: Meta tags, sitemap, robots.txt
- **Docker Support**: Containerized deployment
- **Testing**: Unit tests and API testing setup

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- WhatsApp Business API credentials (optional for testing)

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd clothing-store
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Development:**
   ```bash
   # Start API server
   npm run dev

   # Start frontend (separate terminal)
   python -m http.server 8000
   ```

4. **Production:**
   ```bash
   # Using Docker
   docker-compose up -d

   # Or manual
   npm run build
   npm start
   ```

## ⚙️ Configuration

### Environment Variables (.env)

```env
# WhatsApp API
PHONE_NUMBER_ID=your_phone_number_id
ACCESS_TOKEN=your_access_token
ADMIN_NUMBER=250785734363

# Security
ORDER_SECRET=your_secure_secret_here
ALLOWED_ORIGIN=http://localhost:8000

# Application
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

## 📖 API Documentation

### Orders
- `POST /api/order` - Submit new order
- `GET /admin/orders` - List all orders (admin)
- `POST /admin/orders/:id/process` - Mark order as processed
- `DELETE /admin/orders/:id` - Delete order

### Images
- `GET /admin/images` - List uploaded images
- `POST /admin/images/upload` - Upload new image
- `DELETE /admin/images/:filename` - Delete image

### System
- `GET /health` - Health check endpoint

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive validation for all inputs
- **Security Headers**: XSS protection, CSRF prevention
- **Authentication**: Secret-based admin access
- **File Upload Security**: Type and size validation
- **CORS**: Configurable cross-origin policies

## 📊 Monitoring

- **Winston Logging**: Structured logging to files
- **Health Checks**: Application health monitoring
- **Error Tracking**: Comprehensive error logging

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Manual Deployment
```bash
npm install --production
npm start
```

## 🔍 SEO & Performance

- **Meta Tags**: Open Graph and Twitter Card support
- **Sitemap**: XML sitemap for search engines
- **Robots.txt**: Search engine crawling instructions
- **Image Optimization**: Automatic image processing
- **Caching**: Static asset caching headers

## 📝 Development

### Code Quality
- **ESLint**: Code linting and style enforcement
- **Prettier**: Automatic code formatting
- **Jest**: Unit testing framework

### Project Structure
```
├── admin.html          # Admin management interface
├── clothing_website_index.html  # Main storefront
├── server.js           # Express API server
├── package.json        # Dependencies and scripts
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Multi-container setup
├── nginx.conf          # Web server configuration
├── .env.example        # Environment template
├── .eslintrc.json      # Linting configuration
├── .prettierrc.json    # Code formatting
├── robots.txt          # SEO configuration
├── sitemap.xml         # Search engine sitemap
├── logs/               # Application logs
├── images/             # Uploaded product images
└── tests/              # Test files
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Format code: `npm run format`
6. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🆘 Support

For support, please check the logs in the `logs/` directory or contact the development team.

Notes about the WhatsApp Cloud API

- You need a Meta developer app and WhatsApp Business Account for Cloud API access. See the Meta docs for creating an app, setting up a WhatsApp Business Account, and generating an access token.
- The Cloud API requires valid `PHONE_NUMBER_ID` and an `ACCESS_TOKEN`. Sending media by URL is supported, and messages will appear in the admin WhatsApp as normal media messages.
- For production, use a secure server (HTTPS), protect the access token, and restrict origins in CORS.

Detailed step-by-step: obtain `PHONE_NUMBER_ID` and `ACCESS_TOKEN` from Meta (WhatsApp Cloud API)

1. Create a Meta Developer account and app
	- Go to https://developers.facebook.com/ and sign in with your Meta account.
	- From the dashboard, click "Create App" → choose "Business" app type → enter an app name and contact email.

2. Add the WhatsApp product to your app
	- In your app's dashboard, click "Add Product" and select "WhatsApp".
	- Follow the setup guide; you will be prompted to create/associate a WhatsApp Business Account.

3. Get test credentials from the WhatsApp Cloud API setup
	- In the WhatsApp product settings, Meta shows a "Getting Started" card with a sample phone number (or instructions to register your number), a `PHONE_NUMBER_ID`, and a temporary `ACCESS_TOKEN` for testing.
	- Copy the `PHONE_NUMBER_ID` and `ACCESS_TOKEN` into a safe place (do not commit them).

4. Test sending a text message using curl (quick test)
	- Replace placeholders and run (PowerShell example):

```powershell
 $PHONE_NUMBER_ID = 'YOUR_PHONE_NUMBER_ID'
 $ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'
 Invoke-RestMethod -Uri "https://graph.facebook.com/v17.0/$PHONE_NUMBER_ID/messages" -Method POST -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" } -Body (@{
	 messaging_product='whatsapp';
	 to='250785734363';
	 type='text';
	 text=@{ body='Test message from API' }
 } | ConvertTo-Json)
```

If successful, the admin `ADMIN_NUMBER` should receive the text via WhatsApp. When this works, you can test media sending (image) similarly by changing `type` to `image` and using `image:{link:'https://your-site/path/to/image.png'}` in the body.

5. Move credentials into env vars on your server
	- Set `PHONE_NUMBER_ID` and `ACCESS_TOKEN` as environment variables (PowerShell example shown earlier). Keep `ACCESS_TOKEN` secret.

6. Common troubleshooting
	- `401 Unauthorized` → check `ACCESS_TOKEN` validity, or if the token expired regenerate via the dashboard.
	- No preview for image link → ensure the image URL is public (https) and reachable by Meta servers.
	- For production sending (non-test numbers), follow Meta's business verification steps.

Recommended next steps

- Configure real `PHONE_NUMBER_ID` and `ACCESS_TOKEN` (see Meta docs). After that, test a real order and confirm the admin receives the image.
- Use `ngrok` or deploy the server to a secure host (HTTPS) for public testing.

Testing via ngrok (secure public endpoint)

- Install `ngrok` and run `ngrok http 3000`. ngrok will give you a public https URL (eg `https://abcd1234.ngrok.io`).
- Set `ALLOWED_ORIGIN` to your website origin (or `*` for local testing) and use the ngrok URL for callbacks if needed. You can keep the server running locally and let ngrok proxy to it.

Example usage of `ORDER_SECRET` on the client-side:

```javascript
// include this header when posting orders from the site to the server
fetch('https://your-ngrok-url/api/order', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json', 'x-order-secret': 'SOME_SECRET' },
	body: JSON.stringify(orderPayload)
});
```

Admin page

An `admin.html` page is provided for quick local viewing of stored orders. It fetches `GET /admin/orders` and will prompt for the `ORDER_SECRET` (or you can paste it into the input) before loading. To use it:

1. Start the server (`npm start` or `node server.js`).
2. Open `http://localhost:8000/admin.html` (if serving static files on port 8000) or open the file directly in your browser.
3. Enter the `ORDER_SECRET` you configured (if any) and click "Load orders".

Notes

- Do not expose `ORDER_SECRET` or `ACCESS_TOKEN` in public client-side code or repositories. The meta `order-secret` in `clothing_website_index.html` is only for local testing; remove it for production.
- Package scripts: use `npm start` to run `server.js`.

Admin endpoints (new)

- `GET /admin/orders` — returns stored orders (requires `x-order-secret` header if `ORDER_SECRET` set).
- `POST /admin/orders/:id/process` — toggles processed state for the order with `id`.
- `DELETE /admin/orders/:id` — deletes the order with `id`.

The `admin.html` UI uses these endpoints and sends the `x-order-secret` header when you input the secret in the UI. Use the `admin.html` page to mark orders processed/unprocessed and to delete orders.

- Add server-side validation, authentication, and persistent order storage (database) if you want a record of orders.
- Optimize images (`srcset`, `loading="lazy"`) and run an accessibility audit.

Security and privacy

- Keep `ACCESS_TOKEN` private and only on the server.
- If storing customer info, follow local privacy laws and store minimal data necessary.

If you want, I can:
- Walk through configuring the WhatsApp Cloud API step-by-step.
- Wire the client to a deployed HTTPS endpoint and add order persistence.
- Create a small admin dashboard that lists orders.

