
// ===============
// Dependencies
// ===============

var express         = require("express"),
    app             = express(),
    router          = express.Router(),
    cp              = require('child_process'),
    led             = cp.fork('ledProcess.js'),
    server          = require('http').createServer(app),
    bodyParser      = require('body-parser'),
    cookieParser    = require('cookie-parser'),
    methodOverride  = require('method-override'),
    errorHandler    = require('errorhandler'),
    hostname        = process.env.HOSTNAME || 'localhost',
    PORT            = process.env.PORT || 8081,
    publicDir       = process.argv[2] || __dirname + '/public',
    path            = require('path'),
    io          = require("socket.io"),
    exphbs          = require('express-handlebars'),
    session         = require('express-session');



// ====================
// Express Config
// ====================

app.engine('handlebars', exphbs({}));
app.set('view engine', 'handlebars');
app.set('port', PORT);

app.use(methodOverride('X-HTTP-Method-Override'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(publicDir));
app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
}));

// ====================
// Express Routes
// ====================

router.get('/', function(req, res) {
  res.render('panel', []);
});

app.use(router);

// ====================
// Control LED Process
// ====================

//receive signal from child
process.on('message', function(message) {
  console.log(message);
});

led.send('wululu');

// ====================
// Start the Server
// ====================

app.start = app.listen = function(){
    return server.listen.apply(server, arguments);
};

app.start(PORT);
console.log("Server showing %s listening at http://%s:%s", publicDir, hostname, PORT);
