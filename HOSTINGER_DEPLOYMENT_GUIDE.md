# VastuVision AI — Complete Hostinger Production Deployment Guide

This guide provides step-by-step instructions for deploying the production-ready **VastuVision AI** full-stack SaaS platform on **Hostinger**.

---

## 1. Hosting Architecture & Requirements

### Suitable Hostinger Plans
VastuVision AI is a modern full-stack web application with a high-performance Node.js/Express backend that handles:
- **Server-Side Gemini AI Streaming & Vision Analysis** (multi-part image processing)
- **Authoritative Session Management & Secure HttpOnly Cookies**
- **Razorpay Webhooks & Cryptographic HMAC Verification**
- **Rate-Limiting & Cost Protection Kill-Switch**

| Hosting Plan | Compatibility | Recommendation |
| :--- | :--- | :--- |
| **Hostinger KVM VPS (VPS 1, 2, or 4)** | **100% Fully Compatible** | **Recommended** (Ubuntu 22.04 / 24.04 LTS, full root access, Nginx reverse proxy, PM2 process management). |
| **Hostinger Cloud Hosting** | **Compatible** (if Node.js application manager is enabled) | Good for managed cPanel/hPanel Node.js application setups. |
| **Standard Shared Web Hosting** | **Not Suitable** | Standard shared web hosting cannot keep background Node.js processes or streaming connections alive reliably. |

---

## 2. Server Prerequisites (Ubuntu VPS)

Ensure your Hostinger VPS has **Node.js 18+ or 20+ LTS** and **Nginx** installed:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential nginx git

# Verify versions
node -v   # Should output v20.x.x
npm -v    # Should output 10.x.x

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

---

## 3. Clone Repository & Install Dependencies

```bash
# Navigate to web root
cd /var/www

# Clone your repository (or upload project ZIP via SFTP)
git clone https://github.com/your-username/vastuvision-ai.git
cd vastuvision-ai

# Install production and build dependencies
npm install
```

---

## 4. Production Environment Variables (`.env`)

Create the `.env` file in the project root:

```bash
cp .env.example .env
nano .env
```

Configure your production secrets:

```env
# Server Runtime
PORT=3000
NODE_ENV=production
APP_BASE_URL=https://yourdomain.com

# Google Gemini AI Key (Mandatory for AI Advice & Photo Analysis)
GEMINI_API_KEY=your_production_gemini_api_key_here

# Session Security (Generate a long random 64-char string)
SESSION_SECRET=your_super_secret_session_encryption_key_min_32_chars

# Razorpay Production Payment Gateway
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_live_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Authentication Configuration
# Firebase Authentication (Primary Google Sign-In Provider)
# Note: GOOGLE_CLIENT_ID is NOT required for Firebase Google Sign-In!
FIREBASE_PROJECT_ID=ghar-ghar-6a8f4

# Mobile OTP via APITxT (Real SMS Gateway)
APITXT_API_KEY=8yEVxc9dGUkWJrc2Ado3N48XSGdZqIKDRw8Je-0IS50
APITXT_AUTHKEY=8yEVxc9dGUkWJrc2Ado3N48XSGdZqIKDRw8Je-0IS50
APITXT_CHANNEL=sms

# Optional: Google OAuth 2.0 Web Client ID (Only needed if direct Google OAuth is used without Firebase)
GOOGLE_CLIENT_ID=
```

> **Important Note on Google Sign-In for ghargharvastu.com:**
> The website uses Firebase Authentication Google Provider (Project `ghar-ghar-6a8f4`).
> - The client-side code interacts directly with Firebase (`signInWithPopup` and `signInWithRedirect`).
> - It **does NOT require** `GOOGLE_CLIENT_ID` or `VITE_GOOGLE_CLIENT_ID`.
> - The backend validates the Firebase ID token using `FIREBASE_PROJECT_ID=ghar-ghar-6a8f4`.
> - Make sure that `ghargharvastu.com` and `www.ghargharvastu.com` remain listed in **Firebase Console > Authentication > Settings > Authorized Domains**.

---

## 5. Build the Production Bundle

Run the combined Vite client and esbuild server compilation:

```bash
npm run build
```

This generates:
- `dist/` — Optimized production frontend assets (HTML, CSS, JS, SVG).
- `dist/server.cjs` — Self-contained bundled CommonJS production server.

---

## 6. Process Management with PM2

Start and register VastuVision AI with PM2 so it automatically boots on server restarts:

```bash
# Start the application using the included ecosystem configuration
pm2 start ecosystem.config.cjs --env production

# Check process status
pm2 status

# Monitor live server logs
pm2 logs vastuvision-ai

# Save PM2 process list to auto-start on server reboot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

---

## 7. Nginx Reverse Proxy & Domain Setup

Create an Nginx server block for your domain (e.g. `yourdomain.com`):

```bash
sudo nano /etc/nginx/sites-available/vastuvision
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Maximum upload file size for high-resolution floor plans & room photos
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Disable buffering for real-time Gemini AI response streaming
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
}
```

Enable the configuration and test Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/vastuvision /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. Free SSL Certificate with Let's Encrypt (Certbot)

```bash
# Install Certbot for Nginx
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install SSL certificate automatically
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot installs an automatic cron job for SSL renewal. Test it:
sudo certbot renew --dry-run
```

---

## 9. Data Storage & Persistence

1. **Default Resilient Atomic Storage (`AtomicFileStorageProvider`)**:
   - VastuVision AI includes a zero-dependency atomic storage provider located at `server/data/admin_store.json`.
   - Uses POSIX atomic renames (`.tmp` to `.json`) and creates automated timestamped `.backup` snapshots on every write.
   - Ideal for low-to-medium traffic VPS setups without requiring additional database setup.

2. **Scaling to Relational Database (MySQL / PostgreSQL)**:
   - If your traffic grows to multi-server VPS clusters or you require SQL backups, Hostinger provides managed MySQL/PostgreSQL databases.
   - Use the database abstraction in `server/storage/storageProvider.ts` to route queries directly to your SQL instance.

---

## 10. Production Checklist & Verification

- [x] **AdMob Removed**: Confirmed no Android AdMob dependencies or ad-blocking console warnings.
- [x] **SSL Active**: HTTPS redirect working seamlessly.
- [x] **Razorpay Webhooks**: Configured webhook URL in Razorpay Dashboard (`https://yourdomain.com/api/payment/webhook`).
- [x] **SEO Meta & Sitemap**: Verified accessible at `https://yourdomain.com/sitemap.xml` and `https://yourdomain.com/robots.txt`.
- [x] **Security Rules**: `.env` and `server/data/` files protected from public HTTP access.
- [x] **Backup Routine**: Add a daily cron job to back up `/var/www/vastuvision-ai/server/data/` to Hostinger cloud backups.

---

## 11. Troubleshooting Common VPS Issues

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **502 Bad Gateway** | Node.js process is stopped or failed to bind to port 3000. | Check PM2 logs: `pm2 logs vastuvision-ai`. Ensure port 3000 is free: `netstat -tlpn \| grep 3000`. |
| **Streaming AI pauses or freezes** | Nginx proxy buffering is intercepting chunks. | Ensure `proxy_buffering off;` is set in your Nginx configuration. |
| **Image Upload Fails (413 Payload Too Large)** | Nginx default client upload limit is 1MB. | Set `client_max_body_size 25M;` in Nginx server block and reload. |
| **Permission Denied on server/data** | PM2 user cannot write to data directory. | Run `sudo chown -R $USER:$USER /var/www/vastuvision-ai/server/data`. |
