# 🚗 ZimRide – Zimbabwe's Ride Sharing App

ZimRide is a full-stack ride sharing platform tailored for the Zimbabwean market, inspired by BlaBlaCar. It connects drivers and passengers travelling between Zimbabwe's cities, making inter-city travel more affordable, convenient and social.

---

## 🌍 Features

### Zimbabwe-Specific
- **20+ Zimbabwean cities** – Harare, Bulawayo, Mutare, Victoria Falls, Masvingo, Gweru, and more
- **USD pricing** – Zimbabwe's primary currency, clear per-seat pricing
- **Local payment methods** – EcoCash 💚, OneMoney 🔵, USD Cash 💵, ZimSwitch, Bank Transfer
- **Popular routes** – Pre-populated with most-travelled inter-city routes

### Core Functionality
- 🔐 **User authentication** – Register / login with JWT sessions
- 🚗 **Offer a ride** – Drivers post journeys with date, time, seats, price, amenities
- 🔍 **Search rides** – Filter by city, date, number of passengers
- 🎫 **Book seats** – Reserve one or more seats with preferred payment method
- ⭐ **Ratings & reviews** – Rate drivers and passengers after trips
- 👤 **User profiles** – View driver history, ratings, and contact info
- 📱 **Mobile-first design** – Responsive layout optimised for smartphones

---

## 🏗️ Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Backend  | Node.js 24, Express 4 |
| Database | Node.js built-in SQLite (`node:sqlite`) |
| Auth     | JWT (jsonwebtoken) + bcryptjs |
| Styling  | Pure CSS (no framework) – Mobile-first |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js v22+** (uses built-in `node:sqlite` module)
- **npm**

### 1. Clone the repository
```bash
git clone https://github.com/vedushare/zimride.git
cd zimride
```

### 2. Configure the Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set LOCALHOSTZW_API_KEY and a strong JWT_SECRET
```

### 3. Start the Backend
```bash
npm install
npm start
# API runs on http://localhost:5000
```

### 4. Start the Frontend
```bash
cd ../frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

The frontend proxies `/api` requests to the backend automatically.

---

## 📲 SMS / OTP Configuration

ZimRide uses **[sms.localhost.co.zw](https://sms.localhost.co.zw)** — a Zimbabwean branded SMS platform — to deliver one-time verification codes.

Set the following in `backend/.env`:

```env
SMS_PROVIDER=localhostzw
LOCALHOSTZW_API_KEY=your_api_key_here   # from sms.localhost.co.zw dashboard
LOCALHOSTZW_SENDER_ID=ZimRide           # shown on recipient's phone (max 11 chars)
```

When `LOCALHOSTZW_API_KEY` is not set (development), the provider falls back to **console** mode — OTPs are printed to stdout and returned in the API response as `devOtp` so you can test without real SMS.

Alternative providers (`africastalking`, `twilio`) are supported via the same `SMS_PROVIDER` env var — see `backend/.env.example` for full configuration.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user (auto-sends OTP if phone provided) |
| POST | `/api/auth/login` | Login with email + password, receive JWT |
| POST | `/api/auth/send-otp` | Send OTP to a phone number |
| POST | `/api/auth/verify-otp` | Phone-based login — verify OTP → JWT |
| POST | `/api/auth/verify-phone` | Verify phone after registration (auth required) |
| POST | `/api/auth/resend-otp` | Resend verification OTP (auth required) |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rides` | Search rides (query: `from`, `to`, `date`, `seats`) |
| GET | `/api/rides/:id` | Get ride details |
| POST | `/api/rides` | Post a new ride (auth required) |
| PUT | `/api/rides/:id` | Update a ride (driver only) |
| DELETE | `/api/rides/:id` | Cancel a ride (driver only) |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Book a ride (auth required) |
| GET | `/api/bookings/my` | My bookings (auth required) |
| GET | `/api/bookings/ride/:rideId` | Bookings for my ride (driver only) |
| PUT | `/api/bookings/:id/status` | Update booking status |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/me` | Update my profile (auth required) |
| GET | `/api/users/me/rides` | My offered rides (auth required) |
| POST | `/api/users/:id/review` | Leave a review (auth required) |

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

All 37 API tests cover authentication, OTP/phone verification, rides, bookings, and user profile endpoints.

---

## 📁 Project Structure

```
zimride/
├── backend/
│   ├── db/
│   │   └── database.js      # SQLite setup & schema
│   ├── middleware/
│   │   └── auth.js          # JWT middleware
│   ├── routes/
│   │   ├── auth.js          # Register / Login
│   │   ├── rides.js         # Ride CRUD
│   │   ├── bookings.js      # Booking management
│   │   └── users.js         # User profiles & reviews
│   ├── tests/
│   │   └── api.test.js      # API tests (Jest + Supertest)
│   └── server.js            # Express app entry point
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── api.js       # Axios API client
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── RideCard.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx  # Auth state
    │   ├── pages/
    │   │   ├── Home.jsx         # Landing page with search
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── SearchRides.jsx  # Search results
    │   │   ├── PostRide.jsx     # Offer a ride
    │   │   ├── RideDetails.jsx  # Ride details & booking
    │   │   ├── MyRides.jsx      # My trips dashboard
    │   │   └── Profile.jsx      # User profile
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css            # Global styles
    ├── index.html
    └── vite.config.js
```

---

## 🇿🇼 Popular Routes

- Harare → Bulawayo (439 km, ~5 hrs)
- Harare → Mutare (263 km, ~3 hrs)
- Bulawayo → Victoria Falls (440 km, ~5 hrs)
- Harare → Masvingo (292 km, ~3.5 hrs)
- Harare → Gweru (275 km, ~3 hrs)
- Harare → Beitbridge (580 km, ~6.5 hrs)

---

## 📝 License

MIT © ZimRide Zimbabwe
