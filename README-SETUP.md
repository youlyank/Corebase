# CoreBase Platform - One-Click Setup

## 🚀 Super Quick Start (3 Commands)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd corebase

# 2. Run the setup script
./setup.sh

# 3. Start the platform
npm run dev
```

That's it! 🎉 Your CoreBase platform will be running at http://localhost:3000

---

## 📋 What the Setup Script Does

✅ **Generates secure JWT secrets**  
✅ **Creates .env file with all configuration**  
✅ **Installs all npm dependencies**  
✅ **Sets up the database**  
✅ **Creates necessary directories**  
✅ **Provides you with the generated keys**

---

## 🔑 Your Generated Keys (After Running Setup)

The setup script will generate and display these keys:

```bash
JWT_SECRET="xJ4kL8mN2pQ5rS7tV1wY3zA6bC9dE2fG5hI8jK1lM4oP7qR0sU3vX6yZ9aB2cE"
JWT_REFRESH_SECRET="nH3gF6jK9mP2qR5tV8wY1zA4bC7dE0fG3hI6jK9lM2oP5qR8sU1vX4yZ7aB0cD"
NEXTAUTH_SECRET="pL2oR5tV8wY1zA4bC7dE0fG3hI6jK9mP2qR5tV8wY1zA4bC7dE0fG3hI6jK9lM"
```

**⚠️ IMPORTANT**: Save these keys securely if you plan to use them in production!

---

## 🌐 Access Points After Setup

| Service | URL | Description |
|---------|-----|-------------|
| **Main App** | http://localhost:3000 | CoreBase Platform |
| **API** | http://localhost:3000/api | REST API |
| **WebSocket** | ws://localhost:3001 | Real-time features |
| **MinIO Console** | http://localhost:9001 | File storage |

---

## 🔧 Manual Setup (If Script Fails)

If the setup script doesn't work, here's the manual process:

### 1. Create .env file
```bash
cp .env.example .env
```

### 2. Generate your own keys
```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Add to .env file
echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
echo "JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\"" >> .env
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"" >> .env
```

### 3. Install and setup
```bash
npm install
npm run db:generate
npm run db:push
mkdir -p uploads logs
```

### 4. Start the platform
```bash
npm run dev
```

---

## 🎯 First Steps After Setup

1. **Open your browser** → http://localhost:3000
2. **Create an account** → First user becomes admin
3. **Explore the dashboard** → Check container management
4. **Create your first project** → Start building!

---

## 🆘 Quick Troubleshooting

### Port 3000 already in use?
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
```

### Database not working?
```bash
# Reset database
npm run db:push --force-reset
```

### Permission denied on setup script?
```bash
# Make it executable
chmod +x setup.sh
```

---

## 📚 Need More Details?

- **Full Setup Guide**: See `SETUP.md`
- **Key Reference**: See `KEYS.md`
- **API Documentation**: http://localhost:3000/api/docs

---

**🎉 You're all set! CoreBase is ready to revolutionize your development workflow!**