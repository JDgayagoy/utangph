import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import memberRoutes from './routes/memberRoutes.js'
import expenseRoutes from './routes/expenseRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// CORS configuration for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Connect to MongoDB
connectDB()

// Routes
app.use('/api/members', memberRoutes)
app.use('/api/expenses', expenseRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'UtangPH API is running' })
})

// Export for Vercel
export default app

// Only start server if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // const server = app.listen(PORT, () => {
  //   console.log(`Server running on port ${PORT}`)
  // })

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please stop the other process or set a different PORT.`)
      process.exit(1)
    }
    console.error('Server error:', err)
  })

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down server...')
    server.close(() => process.exit(0))
  })
}
