# Vercel Deployment Guide

## Backend Deployment

1. **Push your code to GitHub**
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `backend` folder as the root directory
   - Add Environment Variables:
     - `MONGODB_URI`: Your MongoDB connection string
     - `PORT`: 3000
     - `FRONTEND_URL`: (will add after frontend deployment)
   - Deploy!

3. **Note your API URL**
   - After deployment, copy your Vercel URL (e.g., `https://your-backend.vercel.app`)

## Frontend Deployment

1. **Update Frontend Environment Variable**
   - In `frontend/.env`, update:
     ```
     VITE_API_URL=https://utangphbackend.vercel.app/api
     ```

2. **Push frontend to GitHub**
   ```bash
   cd ../frontend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-frontend-repo-url>
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your frontend GitHub repository
   - Vercel will auto-detect Vite
   - Add Environment Variable:
     - `VITE_API_URL`: `https://utangphbackend.vercel.app/api`
   - Deploy!

4. **Update Backend CORS**
   - Go back to your backend Vercel project
   - Add environment variable:
     - `FRONTEND_URL`: `https://utangph-oxgv01ehu-dubuu03s-projects.vercel.app`
   - Redeploy backend

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
PORT=3000
FRONTEND_URL=https://utangph-oxgv01ehu-dubuu03s-projects.vercel.app
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api  # For local dev
# VITE_API_URL=https://utangphbackend.vercel.app/api  # For production
```

## MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist IP: `0.0.0.0/0` (allow all - for Vercel)
5. Get connection string and add to backend environment variables

## Notes

- Backend runs on Node.js serverless functions on Vercel
- MongoDB Atlas is already configured in your connection string
- Make sure to add all environment variables in Vercel dashboard
- Frontend automatically builds and deploys on Vercel
- Any push to main branch will trigger automatic redeployment
