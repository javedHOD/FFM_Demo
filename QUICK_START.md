# FieldForce Enterprise - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Installation
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### 3. Demo Login Credentials

**Choose any of these to test different roles:**

| Role | Email | Password |
|------|-------|----------|
| 👨‍💼 Admin | admin@fieldforce.com | Admin@123 |
| 📊 National Sales Manager | nsm@fieldforce.com | Nsm@123 |
| 🔵 Regional Manager | rm@fieldforce.com | Rm@123 |
| 🟢 City Manager | cm@fieldforce.com | Cm@123 |
| 🟠 Promoter | promoter@fieldforce.com | Promoter@123 |

### 4. What You Can Do

#### As a Promoter/City Manager:
- ✅ Check-in with selfie verification
- 🏪 Manage shop visits with photo capture
- 💰 Record sales entries
- 📦 Submit orders
- 📊 View personal reports

#### As a Regional Manager/NSM:
- ✅ Review and approve orders
- 📊 View comprehensive reports
- 🎯 Track pending approvals
- 📈 Monitor sales metrics

#### As an Admin:
- 👥 Manage all users
- 🏪 Manage all shops
- 📋 Monitor all visits with photos
- 📍 Monitor all attendance with selfies
- 📦 Manage all orders
- 📊 View sales reports
- 📸 Photo compliance tracking
- 🎯 **Live field force tracking**

---

## 🎯 Key Features to Try

### 1. **Attendance Check-in** (Field Staff)
```
Path: /attendance
- Click "Open Camera" to capture selfie
- 3-second countdown auto-captures
- Can retake or upload from gallery
- Check-in records selfie with GPS
```

### 2. **Shop Visits** (Promoter/City Manager)
```
Path: /visits
- Click "Start Visit"
- Select assigned shop
- Complete visit with 3 required photos:
  - Outside shop
  - Shelf photo
  - Selfie with shopkeeper
- Add remarks and submit
```

### 3. **Live Tracking** (Admin/NSM)
```
Path: /tracking
- See all field staff in real-time
- View GPS coordinates
- Monitor active visits
- Click "Details" for full info
- Auto-refresh every 30 seconds
```

### 4. **Order Approvals** (RM/NSM)
```
Path: /order-approvals
- Review pending orders
- Approve with remarks
- Reject with reason
- Filter by status
```

### 5. **Admin Dashboard**
```
Path: /admin/dashboard
- Overview stats
- Charts and graphs
- Recent activities
- Pending items
```

---

## 📊 Dashboard Navigation

All roles have a role-appropriate navigation menu:

**Field Staff Side Menu:**
- Dashboard
- Attendance
- Shop Visits
- Sales Entry
- Orders
- Reports
- Profile

**Admin Side Menu:**
- Dashboard
- User Management
- Shop Management
- Visit Monitoring
- Attendance Monitoring
- Orders Management
- Sales Reports
- Photo Compliance
- Live Tracking

---

## 🎨 UI Features to Explore

### Responsive Design
- Works on mobile, tablet, desktop
- Sidebar collapses on mobile
- Touch-friendly buttons

### Interactive Elements
- Stat cards (clickable)
- Charts (hover for details)
- Tables (pagination & sorting)
- Modals (smooth animations)
- Toast notifications (success/error)

### Real-time Updates
- Live tracking updates every 30 seconds
- Auto-refresh toggle
- Manual refresh button
- Loading indicators

---

## 📸 Camera Features (Modern Browsers)

**Works in:**
- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop)
- ✅ Safari (iOS 14.5+)

**Features:**
- Live camera preview
- Front/rear camera toggle
- 3-second countdown capture
- Photo review before upload
- Fallback file upload

---

## 📱 Mobile Testing

**Desktop:**
```bash
npm run dev
# Open in Chrome DevTools
# Toggle device toolbar (Ctrl+Shift+M)
```

**Mobile Device:**
```bash
# Find your PC IP: ipconfig (Windows) or ifconfig (Mac/Linux)
# Then visit: http://YOUR_IP:5173
```

---

## 🔍 Exploring the Data

### Mock Data Includes:
- 8 users across 5 roles
- 5 regions with 8 cities
- 6 shops with GPS coordinates
- Attendance records with selfies
- Visit records with photos
- Sales entries
- Orders with approval workflow
- 15 product catalog items

**All data persists during the session** (localStorage for auth)

---

## 🛠️ Build for Production

```bash
npm run build
# Creates optimized dist/index.html
# Size: ~1MB (286KB gzipped)
# Ready to deploy!
```

---

## 🔌 API Integration Ready

The entire app is **API-agnostic**. Mock APIs are in:
```
src/api/
├── authApi.ts        (Login/logout)
├── usersApi.ts       (User management)
├── shopsApi.ts       (Shop management)
├── attendanceApi.ts  (Check-in/out)
├── visitsApi.ts      (Visits & photos)
├── salesApi.ts       (Sales entries)
├── ordersApi.ts      (Orders workflow)
└── reportsApi.ts     (Analytics)
```

**To connect to your real backend:**
1. Update `src/api/client.ts` baseURL
2. Replace mock functions with real API calls
3. No UI changes needed!

---

## 📞 Common Tasks

### Add a New User (Admin)
```
/admin/users → Click "Add User"
Fill form with:
- Name, Email, Phone
- Role (dropdown)
- Region/City
- Active status
```

### Create a Shop (Admin)
```
/admin/shops → Click "Add Shop"
Fill form with:
- Shop name & type
- Address
- Region/City
- GPS coordinates (optional)
- Assign staff
```

### Record a Visit (Field Staff)
```
/visits → Click "Start Visit"
- Select shop
- Take 3 required photos
- Add remarks
- Click "Complete Visit"
```

### Approve an Order (RM/NSM)
```
/order-approvals
- See pending orders
- Click approve/reject
- Add remarks
- Done!
```

---

## ⚙️ Configuration

### Environment Variables
Create `.env` file:
```
VITE_API_URL=http://localhost:5000/api
```

### Available Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

---

## 🐛 Troubleshooting

### Camera Not Working
- Check browser permissions
- Reload page if permission was denied
- Try Chrome if other browsers fail
- Use file upload fallback

### GPS Not Showing
- Allow location permission
- May not work in private/incognito mode
- Fallback values are used automatically

### Data Not Persisting
- Auth token is stored (localStorage)
- Other data is session-based (resets on refresh)
- For persistence, connect to backend

### Route Not Found
- Ensure you're logged in first
- Check role permissions
- Look for "Unauthorized" message

---

## 📚 File Structure

```
src/
├── api/                 # API services (mock & client)
├── components/          # Reusable UI components
│   ├── layout/         # Sidebar, Header, AppLayout
│   └── ui/             # Button, Card, Input, etc.
├── pages/              # Full page components
│   ├── auth/           # Login
│   ├── dashboard/      # Main dashboards
│   ├── attendance/     # Check-in with selfie
│   ├── visits/         # Shop visits
│   ├── sales/          # Sales entry
│   ├── orders/         # Order management
│   ├── reports/        # Analytics
│   ├── profile/        # User profile
│   ├── tracking/       # Live tracking
│   ├── admin/          # Admin modules
│   └── ...
├── store/              # Zustand auth store
├── types/              # TypeScript definitions
├── utils/              # Helper functions
├── App.tsx             # Main app with routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

---

## 🎯 Next Development Steps

1. **Connect Backend API**
   - Update `src/api/client.ts`
   - Replace mock functions with real calls

2. **Add Real Database**
   - Use MSSQL with provided schema
   - Create JWT authentication
   - Implement file uploads

3. **Enhance Features**
   - Map integration (Google Maps)
   - WebSocket real-time updates
   - PDF/Excel exports
   - Push notifications

4. **Mobile Native**
   - Convert to React Native
   - Native camera integration
   - Offline sync

---

## 💡 Tips & Tricks

### Speed Up Development
- Use React DevTools browser extension
- Chrome DevTools for responsive testing
- Console logs for debugging
- Network tab for API calls

### Better Testing
- Test all 5 roles
- Try on mobile device
- Test offline scenarios
- Check accessibility (Tab navigation)

### Performance
- Check Network tab (should be instant)
- View Lighthouse report
- Monitor bundle size (~1MB uncompressed)

---

## 📞 Support & Questions

**The code is fully commented and documented.**

All components follow:
- TypeScript strict mode
- Consistent naming conventions
- Reusable patterns
- Clear separation of concerns

**Ready to extend and customize!**

---

## ✅ Checklist Before Production

- [ ] Update API base URL
- [ ] Test all user roles
- [ ] Test on target devices
- [ ] Enable HTTPS
- [ ] Set up error logging
- [ ] Configure CORS
- [ ] Set up database
- [ ] Test file uploads
- [ ] Test GPS permissions
- [ ] Configure email notifications

---

**Happy coding! 🚀**
