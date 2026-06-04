# MusicNest 🎵

A full-stack music streaming web application inspired by Spotify. Stream free, legal music powered by the [Jamendo API](https://www.jamendo.com), create playlists, and enjoy real-time listening features.

## Features

- 🎧 **Stream Music** — Real audio playback via the Jamendo API (Creative Commons licensed tracks)
- 🔍 **Search & Discover** — Search tracks, filter by genre, and browse curated sections
- 📋 **Playlists** — Create, edit, and reorder personal playlists
- 👤 **Auth System** — JWT-based sign up / sign in with refresh token rotation
- 🔴 **Real-time** — Live listening activity via Socket.IO
- 🛡️ **Admin Panel** — User management, role assignment, and ban controls

## Tech Stack

**Frontend**
- React 19, Vite, Tailwind CSS
- Zustand (state), Howler.js (audio), Framer Motion (animations)
- Axios, React Router v7, Socket.IO client

**Backend**
- Node.js, Express 5
- MongoDB + Mongoose, JWT auth, bcrypt
- Socket.IO, Cloudinary (media), Nodemailer (email)
- Jamendo API proxy

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Jamendo API client ID — free at [devportal.jamendo.com](https://devportal.jamendo.com)

### 1. Clone the repo

```bash
git clone https://github.com/AdityaGore2960/Music-Nest.git
cd Music-Nest
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JAMENDO_CLIENT_ID=your_jamendo_client_id
CLIENT_URL=http://localhost:5173

# Optional — only needed for email verification
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

> **Note:** Email is optional during development. Registration works without it — the verification email is simply skipped.

### 3. Install & run

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
MusicNest/
├── backend/
│   ├── controllers/     # Route handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routers
│   ├── services/        # Jamendo API service
│   ├── middleware/      # Auth, error handling
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Reusable UI components
        ├── pages/       # Route-level pages
        ├── store/       # Zustand state stores
        └── services/    # API service layer
```

## License

MIT
