// ===============
// Dependencies
// ===============

var express = require("express"),
    app = express(),
    router = express.Router(),
    http = require('http').Server(app),
    cp = require('child_process'),
    led = cp.fork('ledProcess.js'),
    server = require('http').createServer(app),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    hostname = process.env.HOSTNAME || 'localhost',
    PORT = process.env.PORT || 8081,
    publicDir = process.argv[2] || __dirname + '/public',
    path = require('path'),
    io = require("socket.io")(http, {
        serveClient: false
    }),
    exphbs = require('express-handlebars'),
    session = require('express-session');



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
// Socket.io
// ====================
var r, g, b = 255;
var controllingSocket = "";
var controllingTimestamp = 0;
var waitingSockets = [];
const CONTROLTIME = 15;

io.on('connection', function(socket) {

    //add socket to waiting pool
    waitingSockets.push(socket.id);

    //check if controlling Socket is free
    if (controllingSocket === "") {
        //make current socket controller
        controllingSocket = socket.id;
        controllingTimestamp = Date.now();

        //remove current socket from waiting list
        waitingSockets.splice(waitingSockets.indexOf(socket.id), 1);
    }

    //replace controller if he is controlling for longer than the allowed controlling time

    //tell socket whether it is the controller or not
    socket.emit('controlling', {control : (socket.id === controllingSocket)});

    console.log('A User connected');
    //send initial values to new user
    socket.emit('initialize', {
        'r': r,
        'g': g,
        'b': b
    });

    //handle incoming values
    socket.on('r', function(msg) {
        //only process input from currently controlling socket
        if (socket.id === controllingSocket) {
            socket.broadcast.emit('r', msg);
            console.log('R Value: ' + msg);
            r = msg;
        }
    });

    socket.on('g', function(msg) {

        if (socket.id === controllingSocket) {
            socket.broadcast.emit('g', msg);
            console.log('G Value: ' + msg);
            g = msg;
        }
    });

    socket.on('b', function(msg) {

        if (socket.id === controllingSocket) {
            socket.broadcast.emit('b', msg);
            console.log('B Value: ' + msg);
            b = msg;
        }
    });
});

// ====================
// Control LED Process
// ====================

//receive signal from child
process.on('message', function(message) {
    console.log(message);
});

//led.send('wululu');

// ====================
// Start the Server
// ====================

//start socket.io listener
http.listen(PORT, function() {
    console.log("Server showing %s listening at http://%s:%s", publicDir, hostname, PORT);
});

//start express
app.start = app.listen = function() {
    return server.listen.apply(server, arguments);
};
