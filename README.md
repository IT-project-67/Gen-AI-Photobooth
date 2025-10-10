# Gen-AI Photobooth

<div align="center">

  <img src="public/assets/images/icon.png" alt="Gen-AI Photobooth Logo" width="200"/>

  <p>An AI-powered photobooth application that transforms your photos into stunning artwork using multiple artistic styles.</p>

  [![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://gen-ai-photobooth.vercel.app/)

  [![Nuxt](https://img.shields.io/badge/Nuxt-4.0-00DC82?logo=nuxt.js)](https://nuxt.com)

  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## 📖 Overview
Gen-AI Photobooth is a full-stack web application designed for event organizers who want to create engaging experiences and provide participants with memorable, shareable AI-generated photos. The application transforms regular photos into stunning artwork using multiple artistic styles, complete with event branding.

### 🎯 Project Goal
A Full-stack Web App that helps take pictures of people and turn them into shareable GenAI-fied versions to make events more memorable and engaging.

### 🎪 Product Vision
**For event organizers** who want to have engaging events and provide a medium for participants to reconnect with each other after the event.
The GenAI photobooth is an augmented photobooth that creates memorable branded photo experiences and makes participants engage with it.

---

### ✨ Key Capabilities
- 📸 **Mobile-First Design**: Access and use via smartphone for seamless event experience
- 🎨 **AI Photo Generation**: Transform photos into 4 artistic styles (Anime, Watercolor, Oil Painting, Disney)
- 🏷️ **Event Branding**: Upload and apply custom logos/frames to all generated photos
- 🔗 **Easy Sharing**: Generate QR codes for instant photo sharing with colleagues and friends
- 👥 **Secure Authentication**: Email/password and OAuth (Google, Discord) support
- 📱 **Responsive UI**: Polished mobile-first interface that works across all devices
**Live Demo:** [https://gen-ai-photobooth.vercel.app/](https://gen-ai-photobooth.vercel.app/)

---

## ✨ Features
### Core Features
#### 🎪 Event Organizer Features
- **🔐 Authentication & User Management**:
  - Email/password registration and login
  - OAuth integration (Google, Discord) with account linking
  - Session management with JWT tokens and automatic refresh
  - Password reset via email with secure one-time tokens
  - Comprehensive error handling for all auth scenarios
- **🏷️ Event Logo & Branding Management**:
  - Upload custom logos (PNG, JPEG, JPG, ICO, WebP, max 5MB)
  - Real-time logo preview on sample photos
  - Reselect/change logos before event creation
  - Option to proceed without logo
  - Secure storage with authentication-based access control
- **📅 Event Management**:
  - Create events with custom names and date ranges
  - Organize photo sessions by event
  - Track event participation and engagement

#### 👥 Event Participant Features
- **📷 Photo Capture**:
  - Built-in camera with live preview
  - Photo retake functionality with preview
  - Secure upload to backend storage (PNG format, max 20MB)
  - Real-time upload status and error handling
- **🎨 AI Style Generation**:
  - Generate 4 different artistic styles simultaneously:
    - Anime Style
    - Watercolor Painting  
    - Oil Painting
    - Disney Fairytale Style
  - Automatic logo overlay application on all generated photos
  - Photo selection and confirmation workflow
  - Retry options for failed generations
- **🔗 Photo Sharing**:
  - Generate time-limited QR codes (7-day expiry)
  - Lightweight share pages for easy access
  - Browser-native download and sharing options
  - Secure signed URLs that protect storage links
  - Clear error messages for expired/invalid codes

### Technical Features
#### 🚀 Performance & Scalability
- **Server-Side Rendering (SSR)**: Optimized performance with Nuxt.js
- **Mobile-First Responsive Design**: Fast loading (< 2.5s) and smooth interactions (< 200ms)
- **Scalable Architecture**: Modular design for easy feature additions
- **Efficient API**: Well-structured endpoints with TypeScript for reliability

#### 🔒 Security & Compliance
- **Secure Authentication**: OAuth2 implementation with best practices
- **Data Protection**: HTTPS transmission and secure password storage
- **Privacy Controls**: Users can access, export, and delete their data
- **Access Control**: JWT-based authorization with session management
- **Input Validation**: Comprehensive validation on all endpoints

#### 🛠️ Development & Maintenance
- **Clean Code Architecture**: Modular, well-documented codebase
- **Type Safety**: Full TypeScript implementation
- **Database ORM**: Type-safe operations with Prisma
- **Cloud Storage**: Secure Supabase storage for photo management
- **Image Processing**: Sharp integration for efficient handling
- **Cross-Platform Compatibility**: Works across browsers and operating systems

---

## 🛠️ Tech Stack
### Frontend
- **[Nuxt 4](https://nuxt.com/)**: Vue.js meta-framework with Composition API
- **[Vue 3](https://vuejs.org/)**: Progressive JavaScript framework
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development
- **[@nuxt/ui](https://ui.nuxt.com/)**: Beautiful UI components
- **[@nuxt/image](https://image.nuxt.com/)**: Optimized image loading
- **[Iconify](https://iconify.design/)**: Icon framework
- **[Font Awesome](https://fontawesome.com/)**: Icon library

### Backend
- **[Nuxt Server](https://nuxt.com/docs/guide/directory-structure/server)**: Full-stack TypeScript framework
- **[Prisma](https://www.prisma.io/)**: Next-generation ORM
- **[PostgreSQL](https://www.postgresql.org/)**: Relational database
- **[Supabase](https://supabase.com/)**: Backend-as-a-Service (Auth + Storage)
  
### AI & Image Processing
- **[Leonardo AI](https://leonardo.ai/)**: AI image generation service
- **[Sharp](https://sharp.pixelplumbing.com/)**: High-performance image processing
- **[QRCode](https://www.npmjs.com/package/qrcode)**: QR code generation

### Authentication & Security
- **[Supabase Auth](https://supabase.com/docs/guides/auth)**: OAuth2 + JWT authentication
- **Google OAuth**: Social login integration
- **Discord OAuth**: Alternative social login option

### Hosting & Deployment
- **[Vercel](https://vercel.com/)**: Serverless hosting platform
- **[GitHub](https://github.com/)**: Source control and CI/CD
- **Serverless Compute**: Scalable backend infrastructure

### Development Tools
- **[ESLint](https://eslint.org/)**: Code linting
- **[Prettier](https://prettier.io/)**: Code formatting
- **[TypeScript](https://www.typescriptlang.org/)**: Static type checking

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** / **pnpm** / **yarn** / **bun** - Package manager
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Required API Keys & Services
1. **Supabase Account**: [Sign up at supabase.com](https://supabase.com)
2. **Leonardo AI API Key**: [Get API key at leonardo.ai](https://leonardo.ai)
3. **PostgreSQL Database**: Local or hosted (Supabase, Neon, etc.)

---

## 🚀 Installation
### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/genai-photobooth.git
cd genai-photobooth
```

### 2. Install Dependencies
```bash

# Using npm
npm install

# Using pnpm
pnpm install

# Using yarn
yarn install

# Using bun
bun install
```
  
### 3. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# ==================================================================
# Public Environment Variables
# ==================================================================
NUXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# ==================================================================
# Private Runtime Configuration (Server-Only)
# ==================================================================
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
# PostgreSQL connection strings (used by Prisma / Supabase client)
DATABASE_URL=postgresql://postgres.<your-project-id>:<your-password>@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://postgres:<your-password>@db.<your-project-id>.supabase.co:5432/postgres
# Leonardo API credentials
LEONARDO_API_KEY=<your-leonardo-api-key>

# ==================================================================
# Business / Application Configuration
# ==================================================================
SUPABASE_BUCKET=<your-storage-bucket-name>
LEONARDO_MODEL_ID=<model-id>
LEONARDO_STYLE_ID=<select-id>
```

### 4. Set Up Database
```bash
# Generate Prisma Client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Open Prisma Studio to view database
npm run db:studio
```

### 5. Configure Supabase
1. Create a new project in [Supabase Dashboard](https://app.supabase.com)
2. Create a storage bucket named `PhotoBooth` (or your custom name)
3. Set bucket policies to allow authenticated users to upload/read
4. Enable authentication providers (Email, Google, Discord) in Auth settings

---

## 🏃 Development
Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`
 

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run generate        # Generate static site

# Code Quality
npm run lint            # Lint code
npm run lint:fix        # Fix linting errors
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
npm run typecheck       # Type check with TypeScript

# Database
npm run db:generate     # Generate Prisma Client
npm run db:migrate      # Run migrations
npm run db:pull         # Pull schema from database
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database (destructive)
```

---

## 📁 Project Structure
```
genai-photobooth/
├── app/                          # Application code
│   ├── assets/                   # Static assets (CSS, images)
│   ├── components/               # Vue components
│   │   ├── AppButton.vue
│   │   ├── AppCamera.vue
│   │   ├── AuthForm.vue
│   │   └── ...
│   ├── composables/              # Vue composables (business logic)
│   │   ├── useAuth.ts
│   │   ├── useAiPhoto.ts
│   │   ├── useLeonardo.ts
│   │   └── ...
│   ├── layouts/                  # Layout templates
│   ├── middleware/               # Route middleware
│   ├── pages/                    # Application routes
│   │   ├── index.vue            # Home page
│   │   ├── login.vue            # Login page
│   │   ├── cameraPage.vue       # Camera page
│   │   └── ...
│   └── app.vue                   # Root component
├── server/                       # Backend code
│   ├── api/v1/                  # API routes
│   │   ├── auth/                # Authentication endpoints
│   │   ├── event/               # Event management
│   │   ├── leonardo/            # AI generation
│   │   ├── session/             # Photo sessions
│   │   └── share/               # Photo sharing
│   ├── clients/                 # External service clients
│   │   ├── leonardo.client.ts   # Leonardo AI client
│   │   ├── prisma.client.ts     # Database client
│   │   └── supabase.client.ts   # Supabase client
│   ├── model/                   # Data models
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utility functions
├── prisma/                      # Database schema & migrations
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Migration files
├── public/                      # Public static files
├── nuxt.config.ts              # Nuxt configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

---

## 🗄️ Database Schema
The application uses PostgreSQL with Prisma ORM. Key entities:
### Models
- **Profile**: User profile information
- **Event**: Event details with start/end dates and logos
- **PhotoSession**: Photo capture sessions linked to events
- **AIPhoto**: AI-generated photos with style information
- **SharedPhoto**: Shareable photos with QR codes

### Relationships
```
Profile (1) ──→ (N) Event
Event (1) ──→ (N) PhotoSession
Event (1) ──→ (N) SharedPhoto
PhotoSession (1) ──→ (N) AIPhoto
AIPhoto (1) ──→ (N) SharedPhoto
```

---

## 🔌 API Documentation
### Base URL (localhost)
```
http://localhost:3000/api/v1
```

### Authentication Endpoints
| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| POST   | `/auth/register`        | Register new user      |
| POST   | `/auth/login`           | Login user             |
| GET    | `/auth/me`              | Get current user       |
| POST   | `/auth/forgot-password` | Request password reset |
| POST   | `/auth/reset-password`  | Reset password         |

### Event Endpoints
| Method | Endpoint                    | Description       |
| ------ | --------------------------- | ----------------- |
| POST   | `/event/create`             | Create new event  |
| GET    | `/event/get-event-by-id`    | Get event details |
| GET    | `/event/get-events-by-user` | Get user's events |
| POST   | `/event/logo`               | Upload event logo |
| GET    | `/event/logo`               | Get event logo    |

### Photo Session Endpoints
| Method | Endpoint          | Description             |
| ------ | ----------------- | ----------------------- |
| POST   | `/session/create` | Create photo session    |
| GET    | `/session/get`    | Get session details     |
| POST   | `/session/photo`  | Upload photo to session |
| GET    | `/session/photo`  | Get session photo       |

### AI Photo Endpoints
| Method | Endpoint                           | Description                    |
| ------ | ---------------------------------- | ------------------------------ |
| POST   | `/leonardo/generate`               | Generate AI photos             |
| GET    | `/leonardo/me`                     | Get Leonardo account info      |
| GET    | `/aiphoto/aiphoto`                 | Get AI photo (blob/signed URL) |
| GET    | `/aiphoto/get-aiphoto-by-id`       | Get AI photo details           |
| GET    | `/aiphoto/get-aiphotos-by-session` | Get session's AI photos        |

### Share Endpoints
| Method | Endpoint                     | Description            |
| ------ | ---------------------------- | ---------------------- |
| POST   | `/share/create`              | Create shareable photo |
| GET    | `/share/get-share-by-id`     | Get share details      |
| GET    | `/share/get-shares-by-event` | Get event shares       |
| GET    | `/share/qrcode`              | Get QR code image      |

All authenticated endpoints require `Authorization: Bearer <token>` header.

---

## 🎨 AI Style Configuration
The application supports 4 predefined artistic styles powered by Leonardo AI. Each style is generated simultaneously to provide users with multiple options:
### Available Styles
1. **Anime Style**:
   - Transforms photos into anime/manga art style
   - Maintains original composition, faces, expressions, and background
   - Only changes the art style to anime aesthetic
2. **Watercolor Painting**:
   - Soft watercolor painting effect
   - Preserves all original elements while applying watercolor texture
   - Creates artistic, painterly appearance
3. **Oil Painting**:
   - Classic oil painting aesthetic
   - Maintains original photo elements with oil painting style
   - Rich, traditional artistic look
4. **Disney Fairytale**:
   - Disney-inspired magical style
   - Transforms photos into Disney animation aesthetic
   - Maintains original composition with magical Disney styling

### Technical Implementation
- **Parallel Generation**: All 4 styles are generated simultaneously for faster processing
- **Logo Overlay**: Event logos are automatically applied to all generated styles
- **Quality Control**: Each style uses carefully crafted prompts to maintain photo integrity
- **Error Handling**: Retry options available for failed generations
- **Storage Management**: Generated images are securely stored with unique identifiers

---

## 🌐 Deployment
### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!
```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Other Platforms
The application can be deployed to any platform supporting Node.js:
- **Netlify**: Use `nuxt generate` for static deployment
- **Railway**: One-click deploy with PostgreSQL
- **Render**: Deploy as web service
- **Docker**: See [Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment)

### Production Build
```bash
# Build the application
npm run build

# Start production server
node .output/server/index.mjs
```

---

## 🧪 Testing
```bash
# Run tests (if configured)
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 🔒 Security & Compliance
### Authentication & Authorization
- **JWT-based Authentication**: Secure token-based authentication via Supabase
- **OAuth2 Implementation**: Google and Discord OAuth with secure best practices
- **Session Management**: Automatic token refresh and secure session handling
- **Password Security**: Secure password hashing and storage
- **Access Control**: Only authenticated users can upload photos and generate QR codes

### Data Protection
- **HTTPS Transmission**: All data transmitted over secure HTTPS connections
- **Row-Level Security (RLS)**: Database-level security policies in Supabase
- **Environment Variables**: Sensitive data stored in secure environment variables
- **Input Validation**: Comprehensive validation on all API endpoints
- **CORS Configuration**: Proper cross-origin resource sharing setup

### Privacy & User Rights
- **Data Control**: Users can access, export, and delete their personal data
- **No Third-Party Sharing**: Data is not shared with third parties without explicit consent
- **Secure Storage**: Direct storage URLs are never exposed; only signed URLs via QR codes
- **Time-Limited Access**: QR codes expire after 7 days for enhanced privacy
- **Compliance**: Designed to meet data protection regulations and requirements

---

## 🤝 Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feature(feat): Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

---

## 👨‍💻 Authors
- UniMelb IT Project Group 67

---

## 🙏 Acknowledgments
- [Leonardo AI](https://leonardo.ai/) for AI image generation
- [Supabase](https://supabase.com/) for authentication and storage
- [Nuxt.js](https://nuxt.com/) team for the amazing framework
- [Prisma](https://www.prisma.io/) for the excellent ORM