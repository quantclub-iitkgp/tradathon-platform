#!/bin/bash

# AWS EC2 Deployment Script for Tradathon Platform
# Run this script on your EC2 instance after connecting via SSH

set -e

echo "🚀 Starting Tradathon Platform deployment on AWS EC2..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Use a regular user with sudo access."
    exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "npm version: $NPM_VERSION"

# Install Nginx
print_status "Installing Nginx..."
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Git
print_status "Installing Git..."
sudo apt install git -y

# Install Certbot
print_status "Installing Certbot for SSL..."
sudo apt install certbot python3-certbot-nginx -y

# Setup firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Create application directory
print_status "Setting up application directory..."
mkdir -p /home/$USER/tradathon-platform
cd /home/$USER/tradathon-platform

# Check if repository exists
if [ ! -d "web" ]; then
    print_warning "Repository not found. Please clone your repository first:"
    echo "git clone https://github.com/your-username/tradathon-platform.git"
    echo "cd tradathon-platform"
    exit 1
fi

cd web

# Install dependencies
print_status "Installing application dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
# Database Configuration (AWS RDS)
DATABASE_URL="postgresql://username:password@your-rds-endpoint:5432/tradathon_db?schema=public"
DIRECT_URL="postgresql://username:password@your-rds-endpoint:5432/tradathon_db?schema=public"

# Application Configuration
NODE_ENV="production"
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://65.0.80.171"

# WebSocket Configuration
NEXT_PUBLIC_APP_URL="http://65.0.80.171"
HOSTNAME="0.0.0.0"
PORT="3000"

# Firebase Configuration (if using)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# AWS Configuration (for RDS)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
EOF
    print_warning "Please edit .env file with your actual configuration:"
    echo "nano .env"
    echo "Press Enter to continue after editing .env file..."
    read
fi

# Build application
print_status "Building application..."
npm run build

# Generate Prisma client
print_status "Generating Prisma client..."
npm run prisma:generate

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'tradathon-platform',
    script: 'server.js',
    cwd: '/home/$USER/tradathon-platform/web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/$USER/logs/err.log',
    out_file: '/home/$USER/logs/out.log',
    log_file: '/home/$USER/logs/combined.log',
    time: true
  }]
};
EOF

# Create log directory
print_status "Creating log directory..."
mkdir -p /home/$USER/logs

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
print_status "Setting up PM2 startup..."
pm2 startup

# Create Nginx configuration template
print_status "Creating Nginx configuration template..."
sudo tee /etc/nginx/sites-available/tradathon-platform > /dev/null << 'EOF'
server {
    listen 80;
    server_name 65.0.80.171;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Files
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
print_status "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/tradathon-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
print_status "Restarting Nginx..."
sudo systemctl restart nginx

# Create monitoring script
print_status "Creating monitoring script..."
cat > /home/$USER/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "Memory: $(free -h | grep Mem)"
echo "Disk: $(df -h / | tail -1)"
echo "PM2 Status:"
pm2 status
echo "Nginx Status:"
sudo systemctl status nginx --no-pager
EOF

chmod +x /home/$USER/monitor.sh

# Create logrotate configuration
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/tradathon-platform > /dev/null << EOF
/home/$USER/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

print_status "Deployment completed successfully! 🎉"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual values:"
echo "   nano .env"
echo ""
echo "2. Update Nginx configuration with your domain:"
echo "   sudo nano /etc/nginx/sites-available/tradathon-platform"
echo "   Replace 'your-domain.com' with your actual domain"
echo ""
echo "3. Get SSL certificate:"
echo "   sudo certbot --nginx -d your-domain.com -d www.your-domain.com"
echo ""
echo "4. Run database migrations:"
echo "   npm run prisma:migrate"
echo ""
echo "5. Restart the application:"
echo "   pm2 restart all"
echo ""
echo "Your application is accessible at:"
echo "  HTTP: http://$PUBLIC_IP"
echo "  HTTPS: https://your-domain.com (after SSL setup)"
echo ""
echo "Check application status:"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
echo "Monitor system:"
echo "  ./monitor.sh"
echo ""
print_status "Deployment script completed! 🚀"
