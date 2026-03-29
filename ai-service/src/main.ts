import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-service' })
})

// Routes sẽ được thêm vào ở Phase 3
// app.use('/ai', geminiVisionRouter)
// app.use('/market', marketScraperRouter)

const PORT = process.env.PORT ?? 3002
app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`)
})
