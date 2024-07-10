/**
*
* Xact NodeJS Proxy - Main NodeJS App
* Copyright 2020 Woolworths Limited
*
*/
console.log("Hollard.js - loading dependencies");
var express = require('express');
var routes = require('./routes');
var http = require('http');
var fs = require('fs');
var path = require('path');
var configuration = require("./configuration.js");
var dir = path.normalize(configuration.LOG_DIR);
var winston = require('winston');
var logf = path.join(dir, configuration.LOG_FILE_PREFIX);
var loge = path.join(dir, configuration.LOG_EXCEPTION_FILE);
var app = express();

//latest expressJS version requires below plugins (used to be bundled) - starts
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var session = require('cookie-session');
var static = require('serve-static');
var errorHandler = require('errorhandler');
// expressJS plugins - ends

//for enhanced logging - starts
const { format, level, prettyPrint } = require('winston');
require('winston-daily-rotate-file');

const timeZoneFormat = () => {
  if (configuration.LOG_TIMEZONE && configuration.LOG_TIME_FORMAT) {
    return new Date().toLocaleString(configuration.LOG_TIME_FORMAT, {
      timeZone: configuration.LOG_TIMEZONE
    });
  } else {
    return null; //will use java format in GMT
  }
}

var logFileTransport = new (winston.transports.DailyRotateFile)({
  filename: logf + '-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  format: format.combine(format.timestamp({ format: timeZoneFormat }), format.prettyPrint())
});

const consoleFormat = format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp}: ${level} -> ${message}`;
});

var consoleLogTransport = new (winston.transports.Console)({
  format: format.combine(format.timestamp({ format: timeZoneFormat }), consoleFormat)
});
//for enhanced logging - ends

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, 0766, function (err) {
    if (err) {
      console.error(err);
      console.error("ERROR! Can't make the directory! \n");
    }
  });
}

//set new logging format
winston.configure({
  transports: [
    logFileTransport,
    consoleLogTransport
  ]
});
winston.exceptions.handle(new winston.transports.File({ filename: loge }));

var options = {
  requestCert: false,
  rejectUnauthorized: false,
  agent: http,
  agentClass: http.Agent,
  pool: { maxSockets: 1024 }
};

function rawBody(req, res, next) {
  var data = [];
  req.on('data', function (chunk) {
    data.push(chunk);
  });
  req.on('end', function () {
    var buffer = Buffer.concat(data);
    req.rawBody = buffer.toString('utf8');
    next();
  });
}

// all environments
let port = process.env.port || configuration.SERVER_PORT;
app.set('port', port);
//app.set('port', configuration.SERVER_PORT);
//app.set('host', 'localhost'); //Not needed for Azure app service
//app.set('views', __dirname + '/views'); //not needed
//app.set('view engine', 'ejs'); //not needed

//app.use(favicon()); //NOT NEEDED!
app.use(rawBody);
app.use(methodOverride());
app.use(cookieParser('Proxy'));

app.set('trust proxy', 1);
app.use(session({
  saveUninitialized: true,
  resave: true,
  secret: 'xact-nodejs-proxy',
  cookie: { secure: true }
}));

//app.use(app.router); //DEPRECATED!
app.use(static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(errorHandler());
  //app.use(logger('dev')); //this may not be required since we have winston
} else {
  winston.remove(winston.transports.Console);
}

app.get('/healthz', function (req, res) {
  res.send('healthy');
  console.log('Received request on /healthz');
});

//app.get('*', routes.hollard);
//app.post('*', routes.hollard);

console.log("Hollard.js - starting proxy");

http.createServer(options, app)
  .listen(app.get('port'),
    function () {
      winston.log('info', 'Xact insurer proxy started for ' + configuration.INSURER_URL);
      winston.log('info', 'Xact insurer proxy listening on port ' + app.get('port'));
      console.log('Xact insurer proxy listening on port ' + app.get('port'));
    }
  )
  .on('error', function (e) {
    console.log("Hollard.js - proxy failed to load: "+e.message);
    winston.log('error', e.message);
  });

console.log("Hollard.js - proxy running successfully");