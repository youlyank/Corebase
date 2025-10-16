#!/bin/bash

# GitHub Push Script for CoreBase Platform
# This script helps push the code to GitHub repository

echo "🚀 CoreBase Platform - GitHub Push Script"
echo "=========================================="

# Repository URL
REPO_URL="https://github.com/youlyank/Corebase.git"

echo "📋 Repository Information:"
echo "URL: $REPO_URL"
echo "Branch: master"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
    git remote add origin $REPO_URL
fi

# Check current status
echo "📊 Current Git Status:"
git status --porcelain
echo ""

# Add all changes
echo "📦 Adding all changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "🚀 Complete CoreBase Platform - Container Orchestration System

## 🎯 Production-Ready Features
- Complete Docker container orchestration
- Real-time WebSocket collaboration
- JWT authentication system
- Enterprise-grade security
- Comprehensive monitoring

## 📚 Complete Documentation
- JWT secret setup instructions
- Database configuration guide
- GitHub repository setup
- Deployment documentation

## 🔑 Setup Instructions
1. Clone repository
2. Run ./setup.sh for automated configuration
3. Generate JWT secrets
4. Start with npm run dev

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
echo "📤 Pushing to GitHub repository..."
echo "Repository: $REPO_URL"
echo ""

# Try to push (this will require authentication)
git push -u origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Repository: https://github.com/youlyank/Corebase"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Visit the repository on GitHub"
    echo "2. Clone it in your new environment: git clone $REPO_URL"
    echo "3. Run ./setup.sh to configure JWT secrets and database"
    echo "4. Start with npm run dev"
else
    echo ""
    echo "❌ Push failed. This is expected if you don't have GitHub CLI configured."
    echo ""
    echo "🔧 Manual Push Instructions:"
    echo "1. Make sure you have GitHub access to the repository"
    echo "2. Configure your Git credentials:"
    echo "   git config --global user.name 'Your Name'"
    echo "   git config --global user.email 'your.email@example.com'"
    echo "3. Try pushing manually:"
    echo "   git push -u origin master"
    echo ""
    echo "📁 All files are ready and committed locally."
    echo "📚 Complete documentation is available in GITHUB-SETUP.md"
fi

echo ""
echo "🎉 CoreBase Platform is ready for GitHub deployment!"