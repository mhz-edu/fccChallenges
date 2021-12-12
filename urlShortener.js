require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const urlParser = require('url');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let urlSchema = new Schema({
  shortUrl: Number,
  url: String
});

let counterSchema = new Schema({
  name: String,
  count: Number
});

let Url = mongoose.model('Url', urlSchema);
let Counter = mongoose.model('Counter', counterSchema);

let urlCounter = new Counter({name: 'urlCounter', count: 1});
urlCounter.save();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/api/shorturl', express.urlencoded());

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const addUrl = (url, count, done) => {
  new Url({
        shortUrl: count,
        url: url
      }).save(done);
  Counter.findOneAndUpdate({name: 'urlCounter'}, {"count": count + 1}, ()=>{});
}

const getUrlByShort = (short, done) => {
  console.log('Start searching url by short');
  Url.findOne({shortUrl: short}, (err, doc) => {
    if (err) {
      return done(err);
    }
    console.log('url found', doc);
    done(null, doc);
  });
};

const getUrlByUrl = (url, done) => {
  console.log('Start searching url by url');
  Url.findOne({url: url}, (err, doc) => {
    if (err) {
      return done(err);
    }
    console.log('url found', doc);
    done(null, doc);
  });
}

const validateUrl = (url, done) => {
  let urlObj = new urlParser.parse(url);
  if (urlObj.protocol === 'https:') {
    dns.lookup(urlObj.hostname, (err) => {
      if (err) {
        done(err);
      }
      done(null, url);
    });
  } else {
    done(-1);
  }
}

const getUrlCount = (done) => {
  console.log('Start count')
  Counter.findOne({name: 'urlCounter'}, (err, doc) => {
    if (err) {
      console.log(err);
      return done(err);
    }
    console.log('url found count', doc.count);
    done(null, doc.count);
  });
}

app.get('/api/shorturl/:short', (req, res, next) => {
  console.log(req.params);
  getUrlByShort(parseInt(req.params.short), (err, data) => {
    if (err) {
      return next(err);
    }
    if (!data) {
      res.json({"error":"No short URL found for the given input"});
      return next();
    }
    console.log('handling found url')
    res.redirect(data.url);
  });
})

app.post('/api/shorturl', (req, res, next) => {
  console.log(req.body);
  validateUrl(req.body.url, (err) => {
    if (err) {
      if (err === -1) {
        res.json({"error":"Invalid URL"});
      }
      return next(err);
    }
    getUrlByUrl(req.body.url, (err, data) => {
      if (err) {
        return next(err)
      }
      console.log('url by url data', data);
      if (!data) {
        console.log('handling new url');
        getUrlCount((err, count) => {
          if (err) {
            return next(err)
          }
          console.log('url count', count);
          addUrl(req.body.url, count, (err, data) => {
            if(err) {
              return next(err);
            }
            console.log('url added', data);
            res.json({"original_url":data.url,"short_url":data.shortUrl});
          });
        });
        
    
      }
      if (data) {
        console.log('handling found url during addition')
        res.json({"original_url":data.url,"short_url":data.shortUrl});
      }
    })
    })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
