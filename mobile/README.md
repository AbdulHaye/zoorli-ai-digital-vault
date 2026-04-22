# Zorli AI Vault - Mobile App (React Native + Expo)

A production-ready React Native mobile application for Zorli AI Vault, providing complete feature parity with the web version.

## 🏗️ Architecture

**Backend Integration**: The mobile app connects to the **same Express backend** as the web application. No separate backend is needed.

- **Authentication**: Uses REST API endpoints (`/api/auth/signin`, `/api/auth/signup`)
- **File Management**: Same API endpoints as web (`/api/files/*`)
- **AI Features**: Same API endpoints (`/api/ai/chat`, `/api/chat/messages`)
- **Subscriptions**: Same Stripe integration (`/api/create-checkout-session`)

## ✅ What's Working

### Authentication
- ✅ Sign In with email/password
- ✅ Sign Up with firstName, lastName, email, password
- ✅ Secure token storage with Expo SecureStore
- ✅ Automatic navigation after successful login/signup
- ✅ Token-based authentication for all API calls

### Features
- ✅ Dashboard with usage statistics
- ✅ File Vault (upload, view, delete files)
- ✅ AI Chat with conversation history
- ✅ Password Manager (unlimited)
- ✅ User Profile & Settings
- ✅ Subscription Management
- ✅ Admin Panel (for admin users)

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Expo Go app on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

1. **Navigate to mobile directory**:
```bash
cd mobile
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm start
```

4. **Open on your device**:
   - Scan the QR code with Expo Go app (Android)
   - Scan with Camera app (iOS, then open in Expo Go)

## 🔧 Configuration

### Environment Variables

The mobile app is pre-configured to connect to the Replit backend. The `.env` file contains:

```env
# Backend API URL (same backend as web app)
EXPO_PUBLIC_API_URL=https://[your-replit-domain].replit.dev

# All authentication, file management, and AI features use the shared backend API
```

**Important**: The mobile app uses the same backend as the web app - no additional setup required!

## 📱 Features & Screens

### 1. Authentication Flow
- **Landing Screen**: Welcome page with Sign In/Sign Up options
- **Sign In**: Email/password authentication
- **Sign Up**: Create account with firstName, lastName, email, password

### 2. Main App (Bottom Tabs)
- **Dashboard**: Usage stats, quick actions
- **Vault**: File management with native pickers
- **AI Chat**: Conversation interface
- **Passwords**: Encrypted credentials storage
- **Profile**: User settings & subscription

### 3. Additional Features
- **Subscription Page**: View plan, usage, upgrade options
- **Admin Panel**: Full admin dashboard (admin users only)
- **File Upload**: Camera, gallery, document picker support

## 🔐 Authentication Flow

1. **User signs in** → Mobile app calls `/api/auth/signin`
2. **Backend validates** → Returns JWT token + user data
3. **Token stored** → Saved in Expo SecureStore (encrypted)
4. **All API calls** → Include `Authorization: Bearer <token>` header
5. **Navigate to Dashboard** → User sees their data

## 🔗 API Integration

The mobile app makes requests to these backend endpoints:

### Authentication
- `POST /api/auth/signin` - Sign in user
- `POST /api/auth/signup` - Create new account

### Files
- `GET /api/files` - Get user files
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/:id/preview` - Get file preview

### AI & Chat
- `POST /api/ai/chat` - Send chat message
- `GET /api/chat/messages` - Get chat history

### Subscriptions
- `GET /api/subscriptions/current` - Get subscription
- `GET /api/subscriptions/usage` - Get usage stats
- `POST /api/create-checkout-session` - Create Stripe checkout

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

## 🐛 Troubleshooting

### "Network request failed"
- Ensure backend server is running
- Check EXPO_PUBLIC_API_URL in `.env` file
- Verify your device can reach the backend URL

### "Invalid email or password"
- Ensure you're using the correct credentials
- Check that the backend `/api/auth/signin` endpoint is working

### "Sign up failed"
- Ensure all fields are filled (firstName, lastName, email, password)
- Password must be at least 8 characters
- Email must be valid format

### App not connecting to backend
1. Check backend is running: `curl https://[your-backend]/api/health`
2. Verify `.env` file has correct `EXPO_PUBLIC_API_URL`
3. Restart Expo dev server: `npm start` and clear cache

## 📦 Build for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## 🛠️ Tech Stack

- **Framework**: React Native 0.76.9
- **Platform**: Expo SDK 52
- **Language**: TypeScript
- **Navigation**: React Navigation (Tab + Stack)
- **Storage**: Expo SecureStore (encrypted)
- **Backend**: Shared Express.js API
- **File Upload**: Expo Camera, ImagePicker, DocumentPicker

## 📝 Notes

- Mobile app shares **100% of backend code** with web app
- All features work exactly the same as web version
- Authentication tokens are securely stored
- File uploads use native mobile pickers
- Stripe payments redirect to mobile-friendly checkout

## 🤝 Support

If you encounter issues:
1. Check this README
2. Verify backend is running
3. Check `.env` configuration
4. Clear Expo cache: `npm start --clear`
