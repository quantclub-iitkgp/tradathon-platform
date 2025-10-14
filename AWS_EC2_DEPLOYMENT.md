# AWS EC2 Deployment Guide

This guide will help you deploy the Tradathon Platform on AWS EC2 with Nginx for public access.

## Prerequisites

- AWS Account with EC2 access
- Domain name (optional but recommended)
- Basic knowledge of Linux commands
- SSH client

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance

1. **Login to AWS Console**
   - Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
   - Click "Launch Instance"

2. **Choose AMI**
   ```
   Name: Ubuntu Server 22.04 LTS
   Architecture: 64-bit (x86)
   ```

3. **Instance Type**
   ```
   For development: t3.micro (free tier eligible)
   For production: t3.small or t3.medium
   ```

4. **Key Pair**
   - Create new key pair or use existing
   - Download the `.pem` file
   - **Important**: Keep this file secure!

5. **Network Settings**
   ```
   VPC: Default VPC
   Subnet: Any public subnet
   Auto-assign public IP: Enable
   Security Group: Create new
   ```

6. **Security Group Configuration**
   ```
   SSH (22): Your IP address
   HTTP (80): 0.0.0.0/0
   HTTPS (443): 0.0.0.0/0
   Custom TCP (3000): 0.0.0.0/0 (for direct access during setup)
   ```

7. **Storage**
   ```
   Root volume: 20 GB (gp3)
   ```

8. **Launch Instance**

### 1.2 Get Instance Details

1. Note the **Public IPv4 address**
2. Note the **Instance ID**

## Step 2: Connect to EC2 Instance

### 2.1 SSH Connection

```bash
# Make key file secure
chmod 400 your-key.pem

# Connect to instance
ssh -i your-key.pem ubuntu@YOUR_PUBLIC_IP
```

### 2.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Required Software

### 3.1 Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.2 Install Nginx

```bash
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 3.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 3.4 Install Git

```bash
sudo apt install git -y
```

## Step 4: Deploy Application

### 4.1 Clone Repository

```bash
# Clone your repository
git clone https://github.com/your-username/tradathon-platform.git
cd tradathon-platform/web

# Install dependencies
npm install
```

### 4.2 Environment Configuration

```bash
# Create environment file
nano .env
```

Add the following content:

```env
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
```

### 4.3 Build Application

```bash
# Build the application
npm run build

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

## Step 5: Configure PM2

### 5.1 Create PM2 Configuration

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add the following content:

```javascript
module.exports = {
  apps: [{
    name: 'tradathon-platform',
    script: 'server.js',
    cwd: '/home/ubuntu/tradathon-platform/web',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/err.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true
  }]
};
```

### 5.2 Create Log Directory

```bash
mkdir -p /home/ubuntu/logs
```

### 5.3 Start Application with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 6: Configure Nginx

### 6.1 Create Nginx Configuration (IP-Only Access)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/tradathon-platform
```

Add the following content:

```nginx
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
```

### 6.2 Enable Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/tradathon-platform /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 7: Skip SSL Setup (IP-Only Access)

Since you're using an IP address instead of a domain, we'll skip SSL setup for now. The application will be accessible via HTTP.

**Note:** For production use, consider getting a domain name and setting up SSL for security.

## Step 8: Configure Firewall

### 8.1 Setup UFW

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## Step 9: Setup AWS RDS (Database)

### 9.1 Create RDS Instance

1. **Go to RDS Console**
   - Navigate to [AWS RDS Console](https://console.aws.amazon.com/rds/)

2. **Create Database**
   ```
   Engine: PostgreSQL
   Version: 15.x
   Template: Free tier (for development)
   DB instance identifier: tradathon-db
   Master username: tradathon_admin
   Master password: [Generate strong password]
   DB instance class: db.t3.micro
   Storage: 20 GB
   ```

3. **Connectivity**
   ```
   VPC: Same as EC2 instance
   Subnet group: Default
   Public access: Yes (for development)
   VPC security groups: Create new
   ```

4. **Security Group Rules**
   ```
   Type: PostgreSQL
   Port: 5432
   Source: EC2 security group ID
   ```

### 9.2 Update Environment Variables

```bash
# Update .env file with RDS endpoint
nano .env
```

Update the DATABASE_URL with your RDS endpoint:
```env
DATABASE_URL="postgresql://tradathon_admin:your-password@tradathon-db.abc123.us-east-1.rds.amazonaws.com:5432/tradathon_db?schema=public"
```

## Step 10: Final Setup and Testing

### 10.1 Restart Services

```bash
# Restart PM2
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx
```

### 10.2 Test Application

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs

# Test WebSocket health
curl https://your-domain.com/api/websocket-health
```

### 10.3 Monitor Resources

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h
```

## Step 11: Domain Configuration (Optional)

### 11.1 Point Domain to EC2

1. **Get EC2 Public IP**
   ```bash
   curl http://169.254.169.254/latest/meta-data/public-ipv4
   ```

2. **Update DNS Records**
   ```
   A Record: your-domain.com -> EC2_PUBLIC_IP
   CNAME: www.your-domain.com -> your-domain.com
   ```

## Step 12: Monitoring and Maintenance

### 12.1 Setup Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/tradathon-platform
```

Add:
```
/home/ubuntu/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 12.2 Setup Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Create monitoring script
nano /home/ubuntu/monitor.sh
```

Add:
```bash
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
```

```bash
# Make executable
chmod +x /home/ubuntu/monitor.sh

# Add to crontab for regular monitoring
crontab -e
# Add: 0 */6 * * * /home/ubuntu/monitor.sh >> /home/ubuntu/monitoring.log
```

## Troubleshooting

### Common Issues

1. **WebSocket Not Connecting**
   ```bash
   # Check if port 3000 is accessible
   sudo netstat -tlnp | grep :3000
   
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   npm run prisma:studio
   
   # Check RDS security groups
   # Ensure EC2 security group is allowed
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate manually
   sudo certbot renew
   ```

4. **Application Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Check environment variables
   pm2 env 0
   
   # Restart application
   pm2 restart all
   ```

### Useful Commands

```bash
# View application logs
pm2 logs tradathon-platform

# Restart application
pm2 restart tradathon-platform

# Monitor resources
pm2 monit

# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check SSL certificate
sudo certbot certificates

# View system logs
sudo journalctl -u nginx
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Firewall Configuration**
   ```bash
   sudo ufw status
   ```

3. **SSH Key Security**
   - Use strong SSH keys
   - Disable password authentication
   - Use fail2ban for SSH protection

4. **Database Security**
   - Use strong passwords
   - Restrict database access to EC2 only
   - Regular backups

## Cost Optimization

1. **Use t3.micro for development** (free tier)
2. **Stop instance when not in use**
3. **Use RDS free tier for development**
4. **Monitor costs in AWS Cost Explorer**

## Backup Strategy

1. **Database Backups**
   ```bash
   # Automated RDS backups are enabled by default
   # Manual backup:
   pg_dump -h your-rds-endpoint -U tradathon_admin -d tradathon_db > backup.sql
   ```

2. **Application Backups**
   ```bash
   # Backup application files
   tar -czf tradathon-backup-$(date +%Y%m%d).tar.gz /home/ubuntu/tradathon-platform
   ```

## Support

If you encounter issues:

1. Check the logs: `pm2 logs`
2. Verify environment variables: `pm2 env 0`
3. Test WebSocket health: `curl https://your-domain.com/api/websocket-health`
4. Check Nginx configuration: `sudo nginx -t`

Your Tradathon Platform should now be accessible at `https://your-domain.com`! 🚀
