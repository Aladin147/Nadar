# Nadar Deployment Guide

## Overview

This guide covers deploying Nadar in various environments, from local development to production containers and cloud platforms.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB free space
- **Network**: Internet access for AI provider APIs

### API Keys Required
- **Google Gemini API Key**: Required for vision and TTS
  - Get from: https://aistudio.google.com/app/apikey
- **ElevenLabs API Key**: Optional for enhanced TTS
  - Get from: https://elevenlabs.io/app/settings/api-keys

## Local Development

### Server Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-org/nadar.git
   cd nadar/server
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   # Server runs on http://localhost:4000
   ```

### App Setup

1. **Install Dependencies**
   ```bash
   cd ../app
   npm install
   ```

2. **Start Development**
   ```bash
   # Web development
   npm run web
   
   # Mobile development (requires Expo CLI)
   npm start
   ```

## Production Deployment

### Docker Deployment

#### Server Container

1. **Build Image**
   ```bash
   cd server
   docker build -t nadar-server .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name nadar-server \
     -p 4000:4000 \
     -e GEMINI_API_KEY=your_api_key \
     -e ELEVENLABS_API_KEY=your_api_key \
     -e PORT=4000 \
     nadar-server
   ```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  nadar-server:
    build: ./server
    ports:
      - "4000:4000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      - PORT=4000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Deploy:**
```bash
docker-compose up -d
```

### Cloud Platform Deployment

#### Railway

1. **Connect Repository**
   - Link your GitHub repository to Railway
   - Select the `server` directory as root

2. **Environment Variables**
   ```
   GEMINI_API_KEY=your_api_key
   ELEVENLABS_API_KEY=your_api_key
   PORT=4000
   ```

3. **Deploy**
   - Railway auto-deploys on git push
   - Custom domain available in Railway dashboard

#### Render

1. **Create Web Service**
   - Connect GitHub repository
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

2. **Environment Variables**
   ```
   GEMINI_API_KEY=your_api_key
   ELEVENLABS_API_KEY=your_api_key
   ```

#### Heroku

1. **Create App**
   ```bash
   heroku create nadar-server
   heroku config:set GEMINI_API_KEY=your_api_key
   heroku config:set ELEVENLABS_API_KEY=your_api_key
   ```

2. **Deploy**
   ```bash
   git subtree push --prefix server heroku main
   ```

### VPS/Dedicated Server

#### Using PM2 (Recommended)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create Ecosystem File**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'nadar-server',
       script: 'dist/index.js',
       cwd: '/path/to/nadar/server',
       env: {
         NODE_ENV: 'production',
         PORT: 4000,
         GEMINI_API_KEY: 'your_api_key',
         ELEVENLABS_API_KEY: 'your_api_key'
       },
       instances: 1,
       exec_mode: 'fork',
       watch: false,
       max_memory_restart: '1G',
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   ```

3. **Deploy and Start**
   ```bash
   cd server
   npm install --production
   npm run build
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

#### Using systemd

1. **Create Service File**
   ```ini
   # /etc/systemd/system/nadar-server.service
   [Unit]
   Description=Nadar Server
   After=network.target
   
   [Service]
   Type=simple
   User=nadar
   WorkingDirectory=/opt/nadar/server
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production
   Environment=PORT=4000
   Environment=GEMINI_API_KEY=your_api_key
   Environment=ELEVENLABS_API_KEY=your_api_key
   
   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and Start**
   ```bash
   sudo systemctl enable nadar-server
   sudo systemctl start nadar-server
   sudo systemctl status nadar-server
   ```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/nadar
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for AI processing
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        
        # Increase body size for image uploads
        client_max_body_size 10M;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

## Mobile App Deployment

### Expo Build Service

1. **Configure App**
   ```json
   // app.json
   {
     "expo": {
       "name": "Nadar",
       "slug": "nadar",
       "version": "1.0.0",
       "platforms": ["ios", "android"],
       "extra": {
         "apiBase": "https://your-server-domain.com"
       }
     }
   }
   ```

2. **Build for Stores**
   ```bash
   cd app
   eas build --platform all
   ```

### Self-Hosted Build

1. **Android APK**
   ```bash
   cd app
   expo build:android
   ```

2. **iOS IPA** (requires Apple Developer account)
   ```bash
   expo build:ios
   ```

## Monitoring and Maintenance

### Health Checks

```bash
# Basic health check
curl -f http://your-domain.com/health

# Detailed status
curl http://your-domain.com/version
curl http://your-domain.com/debug/cache
```

### Log Monitoring

```bash
# PM2 logs
pm2 logs nadar-server

# systemd logs
journalctl -u nadar-server -f

# Docker logs
docker logs nadar-server -f
```

### Performance Monitoring

Key metrics to monitor:
- **Response Times**: Vision endpoints should respond within 5-10s
- **Memory Usage**: Should stay under 1GB under normal load
- **Cache Hit Rate**: Monitor `/debug/cache` for efficiency
- **Rate Limit Hits**: Check for 429 responses in logs

### Backup and Recovery

**Environment Variables Backup:**
```bash
# Export current environment
env | grep -E "(GEMINI|ELEVENLABS)" > .env.backup
```

**Application Backup:**
```bash
# Backup application code and config
tar -czf nadar-backup-$(date +%Y%m%d).tar.gz \
  server/ app/ docs/ .env* docker-compose.yml
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -ti:4000 | xargs kill -9
   ```

2. **API Key Issues**
   ```bash
   # Test Gemini API key
   curl -H "Authorization: Bearer $GEMINI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   free -h
   # Restart service if needed
   pm2 restart nadar-server
   ```

4. **Network Discovery Issues**
   - Ensure server binds to `0.0.0.0:4000`, not `localhost:4000`
   - Check firewall rules allow port 4000
   - Verify devices are on same network

### Performance Optimization

1. **Enable Compression**
   ```javascript
   // In server code
   app.use(compression());
   ```

2. **Optimize Image Cache**
   - Monitor cache hit rates
   - Adjust cache size based on usage patterns
   - Consider Redis for distributed deployments

3. **Load Balancing**
   ```nginx
   upstream nadar_backend {
       server localhost:4000;
       server localhost:4001;
   }
   ```

This guide covers the most common deployment scenarios. For specific platform requirements or advanced configurations, consult the platform-specific documentation.
