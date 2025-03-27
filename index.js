const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err))

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// ------------------
// Mongoose Schemas
// ------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})
const User = mongoose.model('User', userSchema)

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})
const Exercise = mongoose.model('Exercise', exerciseSchema)

// ------------------
// API Endpoints
// ------------------

// 1. Create new user
// POST /api/users with form data { username }
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.json({ error: "Username is required" })

    const newUser = new User({ username })
    await newUser.save()
    res.json({ username: newUser.username, _id: newUser._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 2. Get all users
// GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id')
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 3. Add an exercise for a user
// POST /api/users/:_id/exercises with form data { description, duration, date(optional) }
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params
    const { description, duration, date } = req.body

    const user = await User.findById(_id)
    if (!user) return res.json({ error: "User not found" })

    // Use the provided date or default to current date
    const exerciseDate = date ? new Date(date) : new Date()

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    })
    await newExercise.save()

    res.json({
      _id: user._id,
      username: user.username,
      date: newExercise.date.toDateString(),
      duration: newExercise.duration,
      description: newExercise.description
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 4. Get a full exercise log of a user
// GET /api/users/:_id/logs with optional query parameters: from, to, limit
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query

    const user = await User.findById(_id)
    if (!user) return res.json({ error: "User not found" })

    let filter = { userId: _id }
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to) filter.date.$lte = new Date(to)
    }

    let query = Exercise.find(filter)
    if (limit) query = query.limit(parseInt(limit))
    const exercises = await query.exec()

    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }))

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: log
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
