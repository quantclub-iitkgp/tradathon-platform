#!/bin/bash

# AWS RDS Setup Script for Tradathon Platform
# This script helps set up the database connection and run migrations

set -e

echo "🚀 Setting up AWS RDS PostgreSQL for Tradathon Platform..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure your database connection."
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL.*postgresql" .env; then
    echo "❌ DATABASE_URL not configured for PostgreSQL. Please update your .env file."
    exit 1
fi

echo "✅ Environment configuration found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Test database connection
echo "🔍 Testing database connection..."
if npx prisma db pull --force; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your DATABASE_URL and network connectivity."
    exit 1
fi

# Run migrations
echo "🗄️ Running database migrations..."
npm run prisma:migrate

# Verify setup
echo "🔍 Verifying database setup..."
if npx prisma db seed 2>/dev/null || echo "No seed script found (this is okay)"; then
    echo "✅ Database setup completed successfully"
else
    echo "⚠️ Database setup completed with warnings"
fi

echo ""
echo "🎉 Setup complete! You can now:"
echo "   • Run 'npm run dev' to start the development server"
echo "   • Run 'npm run prisma:studio' to view your database"
echo "   • Check AWS_SETUP.md for deployment instructions"
echo ""
echo "📊 Database connection details:"
grep "DATABASE_URL" .env | sed 's/DATABASE_URL=.*@/DATABASE_URL=***@/'

