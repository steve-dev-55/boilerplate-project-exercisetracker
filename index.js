const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/exerciseTracker', { useNewUrlParser: true, useUnifiedTopology: true });


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', (req, res) => {
  const newUser = new User({ username: req.body.username });
  newUser.save((err, savedUser) => {
    if (err) return res.status(500).send(err);
    res.json({ username: savedUser.username, _id: savedUser._id });
  });
});

app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(500).send(err);
    res.json(users);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  const newExercise = new Exercise({ userId, description, duration, date: date ? new Date(date) : new Date() });
  newExercise.save((err, savedExercise) => {
    if (err) return res.status(500).send(err);
    User.findById(userId, (err, user) => {
      if (err) return res.status(500).send(err);
      res.json({
        username: user.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toDateString(),
        _id: user._id
      });
    });
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  let dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  let query = Exercise.find({ userId });
  if (from || to) query.where('date').gte(new Date(from)).lte(new Date(to));
  if (limit) query.limit(parseInt(limit));
  query.exec((err, exercises) => {
    if (err) return res.status(500).send(err);
    User.findById(userId, (err, user) => {
      if (err) return res.status(500).send(err);
      res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log: exercises.map(ex => ({
          description: ex.description,
          duration: ex.duration,
          date: ex.date.toDateString()
        }))
      });
    });
  });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
