const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.error("Erreur de connexion à MongoDB :", err));

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

app.post('/api/users', async (req, res) => {
  try {
    if (!req.body.username) return res.status(400).json({ error: "Le champ 'username' est requis" });

    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);
    
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await newExercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de l'ajout de l'exercice" });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    let filters = { userId: user._id };

    if (req.query.from || req.query.to) {
      filters.date = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (isNaN(fromDate)) return res.status(400).json({ error: "Format de date 'from' invalide" });
        filters.date.$gte = fromDate;
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (isNaN(toDate)) return res.status(400).json({ error: "Format de date 'to' invalide" });
        filters.date.$lte = toDate;
      }
    }

    let limit = parseInt(req.query.limit);
    if (req.query.limit && (isNaN(limit) || limit < 1)) {
      return res.status(400).json({ error: "Limit doit être un entier positif" });
    }

    const exercises = await Exercise.find(filters).limit(limit || 0).exec();

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération du journal" });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
