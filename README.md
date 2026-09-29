# 🌍 AI-Powered Travel & Tourism Assistant

A full-stack web application that serves as an AI-powered virtual travel consultant. Users can explore cities, discover attractions, find hotels, and manage reservations — all through an intelligent conversational AI assistant.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Tailwind CSS v4, Framer Motion, React Router v6, Axios, Recharts |
| **Backend** | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| **Database** | PostgreSQL with Alembic migrations |
| **AI Model** | Groq API (Llama 3.3 70B Versatile) |
| **Agent Framework** | LangGraph |
| **RAG** | ChromaDB + BGE-small embeddings |
| **Speech-to-Text** | Faster Whisper |
| **Text-to-Speech** | Piper TTS |
| **Auth** | JWT (python-jose) |

## 📋 Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Groq API Key** (free at [console.groq.com](https://console.groq.com))

## 🛠️ Setup Instructions

### 1. Clone and Setup Database

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE travel_assistant;"
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your GROQ_API_KEY and DATABASE_URL
```

### 3. Configure `.env`

Edit `backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/travel_assistant
GROQ_API_KEY=your-groq-api-key-here
```

### 4. Start Backend

```bash
cd backend
python run.py
```

The API will start at `http://localhost:8000`. Tables are auto-created on first start.

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will start at `http://localhost:5173`.

### 6. Default Admin Account

Created automatically on first start:
- **Email:** `admin@travelassistant.com`
- **Password:** `admin123456`

## 🎯 Key Features

### Customer Portal
- 🏙️ **City Explorer** — Browse cities with attractions, foods, hotels
- 🤖 **AI Assistant** — Conversational booking via text/voice
- 🏨 **Hotel Information** — View details, room types, amenities
- 📋 **Itinerary Packages** — 1/2/3-day tour packages
- 📅 **My Bookings** — Track all reservations
- 🎤 **Voice Support** — Speak to the assistant
- 🌐 **Multi-language** — English, Hindi, Telugu

### Admin Portal
- 📊 **Analytics Dashboard** — Calls, revenue, trends
- 🏙️ **City Management** — CRUD cities, attractions, foods
- 🏨 **Hotel Management** — Hotels, room types, pricing
- 📦 **Inventory** — Date-aware room availability
- 📋 **Reservations** — View and track all bookings
- 📚 **Knowledge Base** — Upload PDF/DOCX/TXT for RAG
- 👥 **User Management** — Customer accounts
- ⚙️ **System Settings** — AI configuration

### AI Assistant Capabilities
- ✅ Answer tourism questions using RAG knowledge base
- ✅ Recommend hotels based on preferences
- ✅ Check real-time room availability
- ✅ Create hotel reservations (with confirmation flow)
- ✅ Modify existing bookings
- ✅ Cancel reservations (with inventory release)
- ✅ Auto-detect city context from page

### Critical Business Rules
- **All bookings through AI only** — No manual booking forms
- **Hotel required for itinerary** — Can't book itinerary alone
- **Date-aware inventory** — Availability tracked per date, not globally
- **Confirmation required** — Booking only after explicit user confirmation

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py         # Settings
│   │   ├── database.py       # SQLAlchemy async engine
│   │   ├── models/           # ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── api/              # API routes
│   │   ├── services/         # Business logic
│   │   ├── agent/            # LangGraph AI agent
│   │   ├── rag/              # ChromaDB RAG pipeline
│   │   ├── speech/           # STT/TTS services
│   │   └── utils/            # Security, file processing
│   ├── alembic/              # Database migrations
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router setup
│   │   ├── api/client.js     # Axios API client
│   │   ├── contexts/         # Auth, Theme, City contexts
│   │   ├── components/       # Reusable UI components
│   │   └── pages/            # All 28 pages
│   ├── index.html
│   └── vite.config.js
├── data/                     # ChromaDB storage
├── uploads/                  # Document uploads
└── piper_models/             # TTS voice models
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | JWT login |
| GET | `/api/cities/` | List all cities |
| GET | `/api/cities/{id}` | City details |
| GET | `/api/hotels/city/{id}` | Hotels by city |
| POST | `/api/inventory/check-availability` | Check rooms |
| POST | `/api/assistant/chat` | AI chat |
| POST | `/api/assistant/voice` | Voice chat |
| GET | `/api/reservations/my` | User bookings |
| GET | `/api/analytics/dashboard` | Admin stats |
| POST | `/api/documents/upload` | Upload KB docs |

Full API docs at `http://localhost:8000/docs`

## 🌐 Supported Languages

| Code | Language |
|------|----------|
| `en` | English |
| `hi` | Hindi |
| `te` | Telugu |

## 📝 License

MIT License
