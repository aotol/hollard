/**
 *
 * Xact NodeJS Proxy - Proxy Driver
 * Copyright 2020 Woolworths Limited
 *
 */
console.log('Index.js - loading dependencies');
var fs = require('fs');
var winston = require('winston');
var request = require('requestretry');
var zlib = require('zlib');
var populateData = fs.readFileSync('./routes/populateData.js');
var JSONMin = fs.readFileSync('./routes/json3.min.js');

var httpntlm = require('httpntlm');
var ntlm = httpntlm.ntlm;
var async = require('async');
var config = require('../configuration.js');

exports.hollard = async function (req, res) {

  var hostname = config.INSURER_URL;
  var hostnameREGEX = new RegExp(hostname, 'gi');
  var hostnameWithoutHTTPS = hostname.replace('https://', '');
  var hostnameREGEXWithoutHTTPS = new RegExp(hostnameWithoutHTTPS, 'gi');

  var b = Date.now();
  //console.log('--> ' + ((Date.now() - b) / 1000) +'s ' + req.url);

  if (config.DEBUG_MODE_PRINT_REQUEST_URL) log('+++++ [REQUEST] fetching ' + req.url + ' ...');

  if (req.url.indexOf('/Jasper/Uploader?') > -1) {
    res.redirect(307, hostname + req.url);
    return;
  }

  if (req.url.indexOf('/healthz') > -1) {
    console.log('Index.js - health check success');
    res.send('healthy');
    return;
  }

  var sess = req.session;
  var proxyingAgent = null;
  if (config.USE_PROXY) {     
    proxyingAgent = require('proxying-agent').create(config.PROXY_SERVER, hostname + req.url);
    console.log('Index.js - use proxy server: '+ config.PROXY_SERVER + ' for target: ' + hostname + req.url);
  }

  //local caching
  if (isCacheable(req.url) && req.headers['cache-control'] != 'no-cache' && req.headers['cache-control'] != 'no-store') {
    try {
      if (fs.existsSync(req.url) && datediff(modifiedDate(req.url), Date.now()) < 1) {
        res.writeHead(200, { 'Content-Type': getEncoding(req.url) });
        res.end(fs.readFileSync(req.url));
        //console.log('<-- ' + ((Date.now() - b) / 1000) +'s loaded! ' + req.url);
        return;
      }
    } catch (err) {
      winston.log('error', 'caching error: ' + err.message);
    }
  }

  //Prepare request headers
  var headers = req.headers;

  headers['host'] = hostnameWithoutHTTPS;

  var hostURL = new RegExp(config.HOST_URL, 'gi');
  if (headers['origin'])
    headers['origin'] = headers['origin'].replace(hostURL, hostname);

  if (headers['referer'])
    headers['referer'] = headers['referer'].replace(hostURL, hostname);

  //Prepare form data
  var form_data = req.rawBody || req.body;

  var username = 'x';
  var password = 'x';
  var adpassword = 'x';
  // /Jasper/login-InnovationInsurance.act
  if (req.url.toLowerCase().indexOf('/jasper/login-innovationinsurance.act') > -1 && req.method.toUpperCase() == 'POST' && form_data) {
    var values = form_data.split('&');
    for (var key in values) {
      if (values[key].indexOf('username=') == 0) {
        username = values[key].substr(values[key].indexOf('=') + 1);
        //sess.username = decodeURIComponent(username);
      }
      if (values[key].indexOf('password=') == 0) {
        password = values[key].substr(values[key].indexOf('=') + 1);
        //sess.password = decodeURIComponent(password);
      }
      if (values[key].indexOf('ADpassword=') == 0) {
        adpassword = values[key].substr(values[key].indexOf('=') + 1);
        adpassword = decodeURIComponent(adpassword);
        //sess.adpassword = decodeURIComponent(adpassword);
      }
    }
  }

  var ntlmOptions = {
    url: decodeURI(hostname + req.url),
    username: username, //sess.username || username,
    password: adpassword, //sess.adpassword || password,
    workstation: '',
    domain: 'hollardgroup'
  };

  async.waterfall([

    function (callback) {

      if (username != 'x')
        sess.auth = 'Basic ' + Buffer.from(username + '@hollardgroup:' + adpassword).toString('base64');

      if (!sess.auth) {

        var type1msg = ntlm.createType1Message(ntlmOptions);

        request(ntlmOptions.url, {
          headers: {
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Authorization': type1msg
          },
          agent: proxyingAgent
        }, callback);
      } else {
        callback();
      }

    },

    function (res2, error, callback) {

      if (!sess.auth) {

        if (!res2.headers['www-authenticate']) {          
          log('+++++ [AUTH RESPONSE] ' + JSON.stringify(res2.headers) + ' ...');
          log('+++++ [AUTH RESPONSE] ' + res2.statusCode + ' ...');
          log('+++++ [AUTH RESPONSE] ' + res2.body + ' ...');
          return callback(new Error('www-authenticate not found on response of second request'));
        }

        var type2msg = ntlm.parseType2Message(res2.headers['www-authenticate']);
        var type3msg = ntlm.createType3Message(type2msg, ntlmOptions);

        sess.auth = type3msg;
      }

      if (config.DEBUG_MODE_PRINT_REQUEST_COOKIES) {
        log('**************** Request Cookies ****************');
        log('Cookie for ' + req.url);
        log(headers.cookie ? headers.cookie : '-no cookie-');
        log('***************************************************************\n');
      }

      var options = {
        url: hostname + req.url,
        method: req.method,
        encoding: null,
        contentType: req.contentType,
        body: form_data,
        keepAlive: true,
        tunnel: true,
        agent: proxyingAgent,
        //binary: true,
        allowRedirects: true,
        pool: { maxSockets: 32 },
        maxAttempts: 5,   // (default) try 5 times
        retryDelay: 5000,  // (default) wait for 5s before trying again
        retryStrategy: request.RetryStrategies.NetworkError,
        headers: {
          'host': headers['host'] || null,
          'accept': headers['accept'] || 'text/html, application/xhtml+xml, image/jxr, */*',
          //'origin' : headers['origin'] || null,
          'referer': headers['referer'] || null,
          'user-agent': headers['user-agent'] + ' NODEJS/2.1',
          'accept-encoding': headers['accept-encoding'] || null,
          'accept-language': headers['accept-language'] || null,
          'content-type': headers['content-type'] || 'application/x-www-form-urlencoded',
          'Connection': 'keep-alive',
          //'Upgrade-Insecure-Requests': '1',
          'cookie': headers.cookie,
          'Authorization': sess.auth || type3msg,
        }
      };

      console.log('Index.js - before setImmediate()');

      setImmediate(function () {

        //console.log('==> ' + ((Date.now() - b) / 1000) +'s ' + req.url);
        request(ntlmOptions.url, options, function (error, response, body) {
          //console.log('<-- ' + ((Date.now() - b) / 1000) +'s ' + req.url);
          try {

            if (error) {
              log('+++++ [PROXY ERROR 1] ' + error.message + ' ...');
              winston.log('error', error.message);
              res.end(error.code, 'Unknown error - ' + error.message);
              return;
            }

            console.log('Index.js - inside setImmediate() request '+JSON.stringify(response.headers));
            console.log('Index.js - inside setImmediate() request '+JSON.stringify(response.statusCode));
            console.log('Index.js - inside setImmediate() request '+JSON.stringify(response.body));

            if (response.headers.location)
              response.headers.location = response.headers.location.replace(hostnameREGEX, config.HOST_URL);

            if (response.statusCode == 302) {
              res.redirect(302, response.headers.location);
              return;
            }

            if (response.headers['content-type'] != null &&
              (
                response.headers['content-type'].indexOf('text/html') > -1 ||
                response.headers['content-type'].indexOf('application/x-javascript') > -1 ||
                response.headers['content-type'].indexOf('application/javascript') > -1
              )
            ) {
              zlib.gunzip(response.body, function (err, dezipped) {

                if (dezipped == undefined) {
                  dezipped = response.body.toString();
                } else {
                  dezipped = dezipped.toString();
                }

                if (dezipped.replace) {
                  dezipped = dezipped.replace(/parent\.document/gi, 'document');
                  dezipped = dezipped.replace(/top.location.href/gi, '\/\/top.location.href');
                  dezipped = dezipped.replace(/'_top'/gi, '\'_self\'');
                  dezipped = dezipped.replace(hostnameREGEX, config.HOST_URL);
                  dezipped = dezipped.replace(hostnameREGEXWithoutHTTPS, config.HOST_URL.replace('https://', ''));
                  dezipped = dezipped.replace('</head>', JSONMin + '</head>\r\n');
                  dezipped = dezipped.replace('</head>', populateData + '</head>');
                }

                response.headers['content-encoding'] = '';
                response.headers['content-length'] = Buffer.byteLength(dezipped, 'utf8');

                //added for double-login issue - EINX-84
                try {
                  if (response.headers['content-type'].indexOf('text/html') > -1) {
                    if (
                      dezipped.indexOf('usernamelbl') > -1 //login page markers
                      && dezipped.indexOf('usernameblock') > -1
                      && dezipped.indexOf('pwdblock') > -1) {
                      var cookies = response.headers['set-cookie'];
                      if (typeof cookies !== 'undefined' && cookies !== null) {
                        delete response.headers['set-cookie'];
                        response.headers['set-cookie'] = cookies;
                        response.headers['Set-Cookie'] = cookies;
                      }
                    }
                  }
                } catch (err) {
                  log('+++++ [PROXY ERROR 2] ' + err + ' ...');
                  winston.log('error', err);
                }
                //added for double-login issue - EINX-84 - end

                res.writeHead(response.statusCode, response.headers);

                if (config.DEBUG_MODE_PRINT_RESPONSE_COOKIES) {
                  var setCookie = response.headers['set-cookie'];
                  log('**************** Response Cookies [set-cookie] ****************');
                  log('Cookie for ' + req.url);
                  log(setCookie ? setCookie : '-no cookie-');
                  log('***************************************************************\n');
                }

                if (config.DEBUG_MODE_PRINT_RESPONSE_URL) log('----- [RESPONSE] pushing ' + req.url + ' to the client...');
                res.end(dezipped);

                if (isCacheable(req.url)) {
                  writeFile(req.url, dezipped);
                  //console.log('<-- ' + ((Date.now() - b) / 1000) +'s saved! ' + req.url);
                } else {
                  //console.log('<-- ' + ((Date.now() - b) / 1000) +'s ' + req.url);
                }

              }); // end gunzip
            } else {

              if (isCacheable(req.url)) {
                zlib.gunzip(body, function (err, dezipped) {
                  if (dezipped != undefined) {
                    writeFile(req.url, dezipped);
                    //console.log('<-- ' + ((Date.now() - b) / 1000) +'s saved! ' + req.url);
                  } else {
                    writeFile(req.url, body);
                    //console.log('<-- ' + ((Date.now() - b) / 1000) +'s saved! ' + req.url);
                  }
                });
              }

              res.writeHead(response.statusCode, response.headers);

              if (config.DEBUG_MODE_PRINT_RESPONSE_URL) log('----- [RESPONSE] pushing ' + req.url + ' to the client...');
              res.end(response.body);
              //console.log('<-- ' + ((Date.now() - b) / 1000) +'s ' + req.url);
            }

          } catch (e) {
            log('+++++ [PROXY ERROR 3] ' + e.message + ' ...');
            winston.log('error', e.message);
            res.send(500, 'Unknown error - ' + e.message);
          } //end catch
        });// end request
      }); //end setImmediate
    },
  ],
    function (err, result) {
      // result now equals 'done'
      log('+++++ [PROXY ERROR 4] ' + err.message + ' ...');
      winston.log('error', err.message);
    }
  );

}; //end proxy

function modifiedDate(path) {
  const stats = fs.statSync(path);
  return stats.mtime
  //const { birthtime } = fs.statSync(path)
  //return birthtime;
}

function datediff(first, second) {
  return Math.round((second - first) / (1000 * 60 * 60 * 24));
}

function isCacheable(filePath) {
  if (
    filePath.endsWith('.js') || //( filePath.startsWith('\/Jasper\/scripts') && filePath.endsWith('.js') ) ||
    filePath.endsWith('.css') ||
    filePath.endsWith('.gif') || filePath.endsWith('.png') || filePath.endsWith('.PNG') || filePath.endsWith('.jpg') ||
    filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.tiff')
  ) {
    return false;
  }

  return false;
}

function getEncoding(filePath) {
  if (filePath.endsWith('.js')) //if( filePath.startsWith('\/Jasper\/scripts') && filePath.endsWith('.js') )
    return 'application/x-javascript';

  if (filePath.endsWith('.css'))
    return 'text/css';

  if (filePath.endsWith('.gif'))
    return 'image/gif';

  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg'))
    return 'image/jpeg';

  if (filePath.endsWith('.png') || filePath.endsWith('.PNG'))
    return 'image/png';

  if (filePath.endsWith('.tiff'))
    return 'image/tiff';

  //return 'text/plain';
}

function writeFile(filePath, content) {
  //return;
  try {
    var onlyPath = require('path').dirname(filePath);
    shell.mkdir('-p', onlyPath);
    fs.writeFile(filePath, content, function (err) {
      if (err) {
        winston.log('error', err.message);
      }
    });
  } catch (err) {
    winston.log('error', err.message);
  }
}

function log(msg) {
  if (config.DEBUG_MODE) {
    winston.log('info', msg);
  }
}
