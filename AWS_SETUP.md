# AWS RDS PostgreSQL Setup Guide

This guide will walk you through setting up AWS RDS PostgreSQL for the Tradathon Platform.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Basic knowledge of AWS services

## Step 1: Create AWS RDS PostgreSQL Instance

### 1.1 Login to AWS Console
- Go to [AWS Console](https://console.aws.amazon.com/)
- Navigate to RDS service

### 1.2 Create Database
1. Click "Create database"
2. Choose "Standard create"
3. Select "PostgreSQL" as engine type
4. Choose PostgreSQL version (recommend 15.x or 16.x)

### 1.3 Database Configuration
```
Template: Free tier (for development) or Production (for production)
DB instance identifier: tradathon-db
Master username: tradathon_admin
Master password: [Generate a strong password]
DB instance class: db.t3.micro (free tier) or db.t3.small (production)
Storage type: General Purpose SSD (gp2)
Allocated storage: 20 GB (minimum)
```

### 1.4 Connectivity Configuration
```
VPC: Default VPC (or create custom VPC)
Subnet group: Default
Public access: Yes (for development) / No (for production with VPN)
VPC security groups: Create new
Security group name: tradathon-db-sg
Availability Zone: No preference
Database port: 5432
```

### 1.5 Additional Configuration
```
Initial database name: tradathon_db
DB parameter group: default.postgres15
Backup retention period: 7 days
Backup window: No preference
Maintenance window: No preference
Monitoring: Disable enhanced monitoring (for cost savings)
Log exports: Disable (for cost savings)
```

## Step 2: Configure Security Groups

### 2.1 Database Security Group
1. Go to EC2 → Security Groups
2. Find the security group created for your RDS instance
3. Edit inbound rules:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Your IP address (for development) or VPC CIDR (for production)

### 2.2 Application Security Group (if using EC2)
If deploying on EC2, create a security group for your application:
```
Type: HTTP, Port: 80, Source: 0.0.0.0/0
Type: HTTPS, Port: 443, Source: 0.0.0.0/0
Type: Custom TCP, Port: 3000, Source: 0.0.0.0/0
Type: SSH, Port: 22, Source: Your IP
```

## Step 3: Get Connection Details

### 3.1 Find RDS Endpoint
1. Go to RDS → Databases
2. Click on your database instance
3. Note the "Endpoint" value (e.g., `tradathon-db.abc123.us-east-1.rds.amazonaws.com`)

### 3.2 Connection String Format
```
postgresql://tradathon_admin:your_password@tradathon-db.abc123.us-east-1.rds.amazonaws.com:5432/tradathon_db
```

## Step 4: Configure Environment Variables

### 4.1 Create .env file
Copy `env.example` to `.env` and update with your values:

```bash
# Database Configuration for AWS RDS
DATABASE_URL="postgresql://tradathon_admin:your_password@tradathon-db.abc123.us-east-1.rds.amazonaws.com:5432/tradathon_db?schema=public"
DIRECT_URL="postgresql://tradathon_admin:your_password@tradathon-db.abc123.us-east-1.rds.amazonaws.com:5432/tradathon_db?schema=public"

# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

### 4.2 Test Connection
```bash
cd web
npm run prisma:generate
npm run prisma:migrate
```

## Step 5: Database Migrations

### 5.1 Generate Prisma Client
```bash
cd web
npm run prisma:generate
```

### 5.2 Run Migrations
```bash
npm run prisma:migrate
```

### 5.3 Verify Database
```bash
npm run prisma:studio
```
This will open Prisma Studio where you can verify your tables were created.

## Step 6: Deploy Application

### 6.1 Local Development
```bash
cd web
npm run dev
```

### 6.2 Production Deployment Options

#### Option A: AWS EC2
1. Launch EC2 instance (t3.micro for free tier)
2. Install Node.js, npm, and git
3. Clone your repository
4. Set up environment variables
5. Run the application

#### Option B: AWS Elastic Beanstalk
1. Create Elastic Beanstalk application
2. Upload your code
3. Configure environment variables
4. Deploy

#### Option C: AWS App Runner
1. Create App Runner service
2. Connect to your GitHub repository
3. Configure build and run commands
4. Set environment variables

## Step 7: SSL Configuration (Production)

### 7.1 Enable SSL
Add SSL parameters to your DATABASE_URL:
```
DATABASE_URL="postgresql://tradathon_admin:your_password@tradathon-db.abc123.us-east-1.rds.amazonaws.com:5432/tradathon_db?schema=public&sslmode=require"
```

### 7.2 Update Prisma Schema
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Step 8: Monitoring and Maintenance

### 8.1 CloudWatch Monitoring
- Monitor database performance metrics
- Set up alarms for CPU, memory, and storage
- Monitor connection counts

### 8.2 Backup Strategy
- Automated backups are enabled by default
- Consider point-in-time recovery for production
- Test restore procedures regularly

### 8.3 Security Best Practices
- Use IAM database authentication when possible
- Rotate passwords regularly
- Enable VPC flow logs
- Use AWS Secrets Manager for sensitive data

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check security group rules
   - Verify VPC configuration
   - Ensure public access is enabled (for development)

2. **Authentication Failed**
   - Verify username and password
   - Check if database exists
   - Ensure user has proper permissions

3. **SSL Certificate Issues**
   - Download RDS CA certificate
   - Configure SSL mode appropriately

### Useful Commands

```bash
# Test database connection
psql "postgresql://tradathon_admin:password@endpoint:5432/tradathon_db"

# Check Prisma connection
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset
```

## Cost Optimization

### Development
- Use db.t3.micro (free tier eligible)
- Enable automated backups
- Use General Purpose SSD storage

### Production
- Choose appropriate instance size based on load
- Consider Reserved Instances for long-term use
- Monitor and optimize storage usage
- Use Multi-AZ for high availability

## Security Considerations

1. **Network Security**
   - Use VPC with private subnets
   - Configure security groups properly
   - Enable VPC flow logs

2. **Access Control**
   - Use IAM roles when possible
   - Implement least privilege access
   - Rotate credentials regularly

3. **Data Protection**
   - Enable encryption at rest
   - Use SSL/TLS for data in transit
   - Implement proper backup encryption

## Support and Resources

- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [AWS RDS Pricing](https://aws.amazon.com/rds/pricing/)

For additional help, refer to the AWS support documentation or contact your system administrator.

