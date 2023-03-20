const express = require('express');
const app = express();
const logger = require('morgan');
const path = require('path');
require('dotenv').config();

// Setup
const PORT = process.env.PORT || 3000;
app.use(logger('dev'));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true}));

const indexRouter = require('./routes/index');
const homeRouter = require('./routes/home');
const menuRouter = require('./routes/menu');

// Router setup
app.use('/', indexRouter);
app.use('/home', homeRouter);
app.use('/menu', menuRouter);

// Testing
app.get('/version', function(req, res) {
  res.json({version: process.env.npm_package_version})
})

// Start server
app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`)
})
