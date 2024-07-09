/**
*
* Xact NodeJS Proxy - Main NodeJS App
* Copyright 2020 Woolworths Limited
*
*/
console.log('Hollard.js - loading dependencies');
var express = require('express');
var http = require('http');
var app = express();
app.get('/healthz', function (req, res) {
  console.log('Hollard.js: Received /healthz');
  res.send('healthy')
});
app.get('/', function (req, res) {
  console.log('Hollard.js: Received /');
  res.send('NodeJS App is running');
});
app.set('port', 8080);
app.set('host', 'localhost');
console.log('Hollard.js - starting proxy');
http.createServer(app)
  .listen(app.get('port'), app.get('host'),
    function () {
      console.log('Hollard.js Xact insurer proxy started on ' + app.get('host') + ':' + app.get('port'));  
    }
  )
  .on('error', function (e) {
    console.log('Hollard.js - proxy failed to load: ' + e.message);
  });

console.log('Hollard.js - proxy running successfully');
