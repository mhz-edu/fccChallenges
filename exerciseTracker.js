const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const { Schema } = mongoose;

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(express.urlencoded({extended: false}));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let userSchema = new Schema({
  username: String
})

let exerciseSchema = new Schema({
  userId: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: Number,
  date: Date
})

let logSchema = new Schema({
  count: Number,
  log: [mongoose.Schema.Types.ObjectId]
})

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);
let Log = mongoose.model('Log', logSchema);

const addUser = (name, done) => {
  new User({username: name}).save(done);
}

const getUserById = (id, done) => {
  User.findById(id, done);
}

const addExercise = (exercise, done) => {
  new Exercise(exercise).save(done);
}

const getExerciseByUserId = (id, options, done) => {
  let from, to, lim;
  if (options.hasOwnProperty('limit')) {
    lim = parseInt(options.limit);
  }
  if (options.hasOwnProperty('from') && options.hasOwnProperty('to')) {
    from = new Date(options.from);
    to = new Date(options.to);
  }
  Exercise.find({userId: id}, (err, data) => {
    if (err) {
      return done(err);
    }
    if (!data) {
      return done(null, data);
    } else {
      if (from && to) {
        data = data.filter(item => (from < item.date && item.date < to));
      }
      if (lim) {
        return done(null, data.slice(0, lim));
      }
      return done(null, data);
    }
  });
}

app.get('/api/users/:userId/logs?', (req, res, next) => {
  console.log(req.query);
  const options = req.query;
  const userId = req.params.userId;
  getUserById(userId, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log(user);
      res.json({"error": "User not found"});
    } else {
      getExerciseByUserId(userId, options, (err, data) => {
        if (err) {
          return next(err);
        }
        if (!data) {
          res.json({'error': 'No exercises found'})
        } else {
          const logOutput = {
            '_id': user._id,
            'username': user.username,
            'count': data.length,
            'log': data.map(item => ({
              'description': item.description,
              'duration': item.duration,
              'date': item.date.toDateString()
            }))};
          res.json(logOutput);   
        }
      })
    }});
});

app.get('/api/users', (req, res, next) => {
  User.find({}, (err, data) => {
    if (err) {
      return next(err);
    } else {
      res.json(data);
    }
  })
});


app.post('/api/users/:userId/exercises', (req, res, next) => {
  const userId = req.params.userId;
  getUserById(userId, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      console.log(user);
      res.json({"error": "User not found"});
    } else {
      const date = (req.body.date)? new Date(req.body.date): new Date;
      const exercise = {
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: date,
        userId: user._id
      }
      addExercise(exercise, (err, result) => {
        if (err) {
          return next(err);
        } else {
          const output = {
            '_id': user._id,
            'username': user.username,
            'description': result.description,
            'duration': result.duration,
            'date': result.date.toDateString()
          }
          res.json(output);
        }
      })
    }
  })
})

app.post('/api/users', (req, res, next) => {
  console.log(req.body);
  addUser(req.body.username, (err, data) => {
    if (err) {
      return next(err);
    }
    res.json(data);
  })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
