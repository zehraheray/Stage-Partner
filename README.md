<div align="center">

<div align="center">

<a href="https://academy.masterfabric.co">
  <img src="https://academy.masterfabric.co/academy-badge.png" width="120" alt="MasterFabric Academy">
</a>

<p>
  <sub>
    academy.masterfabric.co is a
    <a href="https://masterfabric.co">MasterFabric</a>
    subsidiary.
  </sub>
</p>

</div>

# 🎭 Stage Partner

### **Interactive Stage Assistant – AI-Powered Theatre & Performance Management Platform**

*Interactive AI-powered stage assistant with real-time analytics and Web-LLM inference.*

</div>

---

# 📖 What is Stage Partner?

**Stage Partner** is a full-stack web platform that brings **AI-powered assistance** to theatre and performance arts.

It combines:

- 💬 **Interactive Chat Assistant** – Powered by **WebLLM (Gemma 2B)** running locally in the browser
- 📊 **Real-time Analytics** – Track performance metrics, user interactions, and system health
- 🔐 **Authentication & Authorization** – Secure JWT-based login/register system
- 📝 **Audit Logging** – Complete history of user interactions and system events

Built as a **monorepo** with **Next.js 16** frontend and **Go (Gin)** backend, orchestrated with **Docker Compose** and deployed on **Vercel + Render**.

---

# 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                         │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐                       │
│  │   Next.js    │◄──►│   WebLLM     │                       │
│  │   Frontend   │    │  (Gemma)     │                       │
│  └──────┬───────┘    └──────────────┘                       │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTPS / API Calls
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Go API     │◄──►│ PostgreSQL   │◄──►│    Redis     │   │
│  │   (Gin)      │    │  (Storage)   │    │   (Cache)    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Audit Logger · Score Engine · Auth Middleware        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

# ⚙️ Tech Stack

| **Layer** | **Technology** | **Purpose** |
|------------|----------------|-------------|
| **Frontend** | Next.js 16 + React 19 | SPA with App Router |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **In-Browser LLM** | WebLLM (Gemma 2B) | Local AI inference via WebGPU |
| **Backend** | Go 1.25 + Gin | REST API, authentication & scoring |
| **Database** | PostgreSQL 15 | Persistent storage |
| **Cache** | Redis 7 | Session management |
| **Auth** | JWT (golang-jwt/v5) | Stateless authentication |
| **ORM** | GORM v1.31.2 | Database ORM |
| **Deployment** | Vercel + Render | Production hosting |
| **Containerization** | Docker + Docker Compose | Local development |

---

# ✨ Features

## 🔐 Authentication & Authorization

- JWT-based user authentication
- Protected routes with **Auth Guard**
- Secure logout & token refresh
- Password hashing using **bcrypt**

---

## 💬 Interactive Stage Assistant

- **WebLLM (Gemma 2B)** runs entirely inside the browser
- No server-side LLM costs
- Stage-specific system prompt engineering
- Chat history & conversation context
- Real-time AI responses

---

## 📊 Analytics Dashboard

- Real-time prompt & interaction metrics
- Performance scoring
  - **Speed**
  - **Quality**
  - **Total Score**
- Interactive charts using **Recharts**
- User activity monitoring

---

## 📝 Audit & Logging

- Complete interaction history
- Score tracking
- System event logging
- User action audit trail

---

## 🎨 Modern UI

- Minimal monochrome design
- Space Grotesk typography
- Fully responsive interface

---

# 📂 Project Structure

```text
Stage-Partner/
├── README.md
├── docker-compose.yml
├── Makefile
├── turbo.json
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
│
├── apps/
│   ├── frontend/                     # Next.js SPA (Vercel)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   ├── (auth)/           # Login / Register pages
│   │   │   │   ├── (dashboard)/      # Main dashboard
│   │   │   │   └── (analytics)/      # Analytics & metrics
│   │   │   ├── components/
│   │   │   │   └── AuthGuard.tsx     # Route protection
│   │   │   ├── lib/
│   │   │   │   └── auth.ts           # Auth utilities
│   │   │   └── __tests__/            # Frontend tests
│   │   ├── vitest.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── backend/                      # Go API (Render)
│       ├── main.go                   # Entry point
│       ├── config/                   # DB & JWT configuration
│       ├── models/                   # GORM models
│       ├── middleware/               # Auth, CORS, rate limiting
│       ├── handlers/                 # HTTP handlers
│       ├── routes/                   # Route registration
│       ├── tests/                    # Integration tests
│       ├── Dockerfile
│       ├── go.mod
│       └── go.sum
```

---

# 🚀 Quick Start

## Prerequisites

- Go **1.25+**
- Node.js **20+**
- Docker & Docker Compose

### 1️⃣ Clone Repository

```bash
git clone https://github.com/zehraheray/Stage-Partner.git

cd Stage-Partner
```

### 2️⃣ Start Infrastructure

```bash
docker compose up -d
```

### 3️⃣ Run Backend

```bash
cd apps/backend

go mod download

go run main.go
```

Backend:

```
http://localhost:8080
```

### 4️⃣ Run Frontend

```bash
cd apps/frontend

npm install

npm run dev
```

Frontend:

```
http://localhost:3000
```

### 5️⃣ Create an Account

Open

```
http://localhost:3000
```

and register to start using Stage Partner.

---

# 🔌 API Endpoints

## Health & Config

| **Method** | **Endpoint** | **Description** |
|------------|--------------|-----------------|
| GET | `/health` | Health check |
| GET | `/config/system` | System status |
| GET | `/config/models` | Supported models |
| GET | `/api/version` | API version |
| GET | `/api/ping` | Ping |

## Authentication

| **Method** | **Endpoint** | **Description** |
|------------|--------------|-----------------|
| POST | `/auth/register` | Register (rate-limited: 10/min) |
| POST | `/auth/login` | Login (rate-limited: 10/min) |
| POST | `/auth/logout` | Logout (rate-limited: 10/min) |
| POST | `/auth/refresh` | Refresh Token (rate-limited: 10/min) |
| PUT | `/auth/password` | Update password (rate-limited: 10/min) |
| PUT | `/auth/profile` | Update profile (rate-limited: 10/min) |
| DELETE | `/auth/account` | Delete account (rate-limited: 10/min) |

## User

| **Method** | **Endpoint** | **Description** |
|------------|--------------|-----------------|
| GET | `/user/profile` | Get user profile (auth required) |

## LLM & Scoring

| **Method** | **Endpoint** | **Description** |
|------------|--------------|-----------------|
| POST | `/llm/log/raw-output` | Create log (auth required, 60/min) |
| GET | `/llm/logs` | Get logs (auth required) |
| GET | `/llm/logs/:id` | Get single log (auth required) |
| DELETE | `/llm/logs/:id` | Delete log (auth required) |
| DELETE | `/llm/logs/clear` | Clear all logs (auth required) |
| GET | `/llm/analytics` | Get analytics (auth required) |
| POST | `/llm/score/decision` | Score decision (auth required) |
| GET | `/llm/export` | Export logs (auth required) |

---

# ☁️ Deployment

## Backend (Render)

**Production**

```
stagepartner-backend.onrender.com
```

Required environment variables:

```bash
DB_HOST=
DB_PORT=5432
DB_USER=
DB_PASSWORD=
DB_NAME=stagepartner
DB_SSLMODE=prefer

GIN_MODE=release

JWT_SECRET=
JWT_EXPIRATION_HOURS=24
JWT_ISSUER=stagepartner

CORS_ALLOWED_ORIGINS=https://stagepartner.vercel.app,http://localhost:3000

LOG_LEVEL=info
```

---

## Frontend (Vercel)

**Production**

```
stagepartner.vercel.app
```

```bash
NEXT_PUBLIC_API_URL=https://stagepartner-backend.onrender.com
```

---

# 🔧 Environment Variables

## Frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Backend

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgrespassword
DB_NAME=stagepartner

DB_SSLMODE=disable

GIN_MODE=debug

JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24
JWT_ISSUER=stagepartner

CORS_ALLOWED_ORIGINS=http://localhost:3000

LOG_LEVEL=debug
```

---

# 🛠️ Development

## Makefile Commands

```bash
make setup        # Install all dependencies
make db-up        # Start PostgreSQL via Docker
make db-down      # Stop PostgreSQL
make run-api      # Run Go backend
make run-web      # Run Next.js frontend
make clean        # Remove containers + node_modules
```

## Running Tests

```bash
# Backend unit + integration tests (requires SQLite)
cd apps/backend
CGO_ENABLED=1 go test -race ./...

# Frontend tests
cd apps/frontend
npm test
```

---

# 🗄️ Database

Database tables are automatically created using **GORM AutoMigrate** during the first application startup.

---


<div align="center">

## Built with ❤️ at MasterFabric Academy

![MasterFabric](https://img.shields.io/badge/MasterFabric-Academy-000000?style=flat-square)

</div>

> **Note**
>
> **WebLLM (Gemma 2B)** runs completely inside your browser using **WebGPU**.
> No prompts are sent to external AI providers, ensuring that your conversations remain private on your device.
