# FieldForce Enterprise — Backend API

Node.js + Express + MySQL backend for the FieldForce management system.

## Quick Start

### 1. Configure environment
Edit `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=fieldforce_db

JWT_SECRET=fieldforce_jwt_secret_key_2024_enterprise
JWT_EXPIRES_IN=24h

PORT=5000
FRONTEND_URL=http://localhost:5173
```

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Start server
```bash
npm start          # production
npm run dev        # development (auto-restart with nodemon)
```

On startup the server will:
- ✅ Test MySQL connection
- ✅ Create the database if it doesn't exist
- ✅ Create all tables (if not exist)
- ✅ Seed demo users, countries, regions, cities (once only)
- ✅ Create upload folders

---

## Upload Folder Structure

```
backend/
└── uploads/
    ├── selfies/          ← Attendance check-in selfies
    ├── visit-photos/     ← Shop visit photos (outside, shelf, selfie)
    ├── shop-photos/      ← Shop images
    ├── profiles/         ← User profile photos
    └── temp/             ← Temporary / uncategorised uploads
```

Served publicly at: `http://localhost:5000/uploads/<category>/<filename>`

---

## Upload API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/uploads/base64` | Upload single Base64 image (camera capture) |
| POST | `/api/uploads/base64/batch` | Upload multiple Base64 images at once |
| POST | `/api/uploads/file?category=X` | Upload via multipart/form-data |
| DELETE | `/api/uploads/file/:category/:filename` | Delete uploaded file |
| GET | `/api/uploads/info` | Upload folder info |

### Upload Categories
| Category | Saved in folder | Use for |
|----------|-----------------|---------|
| `selfie` | `uploads/selfies/` | Attendance check-in selfies |
| `visit-outside` | `uploads/visit-photos/` | Outside shop photo |
| `visit-shelf` | `uploads/visit-photos/` | Shelf photo |
| `visit-selfie` | `uploads/visit-photos/` | Selfie with shopkeeper |
| `shop` | `uploads/shop-photos/` | Shop images |
| `profile` | `uploads/profiles/` | User profile photos |
| `temp` | `uploads/temp/` | Any other image |

### Example: Upload selfie (Base64)
```json
POST /api/uploads/base64
{
  "image": "data:image/jpeg;base64,/9j/...",
  "category": "selfie"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "filename": "1717590000000-abc123.jpg",
    "url": "/uploads/selfies/1717590000000-abc123.jpg",
    "fullUrl": "http://localhost:5000/uploads/selfies/1717590000000-abc123.jpg",
    "size": 45678
  }
}
```

### Example: Upload 3 visit photos (batch)
```json
POST /api/uploads/base64/batch
{
  "images": [
    { "image": "data:image/jpeg;base64,...", "category": "visit-outside" },
    { "image": "data:image/jpeg;base64,...", "category": "visit-shelf" },
    { "image": "data:image/jpeg;base64,...", "category": "visit-selfie" }
  ]
}
```

---

## All API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/logout` | Yes | Logout |
| POST | `/api/auth/forgot-password` | No | Password reset |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | All users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/users/meta/roles` | All roles |
| GET | `/api/users/meta/regions` | All regions |
| GET | `/api/users/meta/cities?regionId=1` | Cities |

### Location
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/location/countries` | Countries CRUD |
| GET/POST/PUT/DELETE | `/api/location/regions` | Regions CRUD |
| GET/POST/PUT/DELETE | `/api/location/cities` | Cities CRUD |
| GET | `/api/location/hierarchy` | Full hierarchy |

### HR
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/hr/departments` | Departments CRUD |
| GET/POST/PUT/DELETE | `/api/hr/designations` | Designations CRUD |
| GET | `/api/hr/employees/next-code` | Auto employee code |
| GET/POST/PUT/DELETE | `/api/hr/employees` | Employees CRUD |
| GET/POST | `/api/hr/attendance` | Employee attendance |
| GET/PUT | `/api/hr/attendance-config` | Attendance config |
| GET | `/api/hr/attendance-summary` | Summary report |
| GET | `/api/hr/attendance-stats` | Daily stats |
| GET/POST | `/api/hr/approval-requests` | Approval requests |
| PUT | `/api/hr/approval-requests/:id/approve` | Approve |
| PUT | `/api/hr/approval-requests/:id/reject` | Reject |
| GET | `/api/hr/approval-hierarchies` | Hierarchies |

### Attendance (Field)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | All records |
| GET | `/api/attendance/my` | My records |
| GET | `/api/attendance/today` | Today status |
| POST | `/api/attendance/check-in` | Check in (with selfie) |
| POST | `/api/attendance/check-out` | Check out |

### Shops
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/shops` | List / Create |
| GET/PUT/DELETE | `/api/shops/:id` | Get / Update / Delete |

### Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/visits` | All visits |
| GET | `/api/visits/my` | My visits |
| POST | `/api/visits/start` | Start visit |
| GET | `/api/visits/:id` | Get visit |
| POST | `/api/visits/:id/complete` | Complete visit |
| POST | `/api/visits/:id/photos` | Upload visit photos |

### Sales / Orders / Reports
Similar CRUD pattern — see routes files for full details.

---

## Demo Credentials (seeded automatically)

| Email | Password | Role |
|-------|----------|------|
| admin@fieldforce.com | Admin@123 | Admin |
| nsm@fieldforce.com | Nsm@123 | National Sales Manager |
| rm@fieldforce.com | Rm@123 | Regional Manager |
| cm@fieldforce.com | Cm@123 | City Manager |
| promoter@fieldforce.com | Promoter@123 | Promoter |

New users created via API get default password: `FieldForce@123`
