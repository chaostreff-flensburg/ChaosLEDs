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
const CONTROLTIME = 5;

//function to check if controllingSockets turn is over
var controllerCheck = function() {
    //check if controlling Socket is free
    if (controllingSocket === "") {
        //make first socket in waitinglist controller
        controllingSocket = waitingSockets[0];
        controllingTimestamp = Date.now();

        //inform new controlling socket
        io.to(controllingSocket).emit('controlling', {
            control: true
        });

        //remove first socket from waiting list
        waitingSockets.splice(0, 1);
    }

    //replace controller if he is controlling for longer than the allowed controlling time
    if (controllingSocket !== "" && Date.now() - controllingTimestamp > CONTROLTIME) {
        //add current controller at the end of the waiting list
        waitingSockets.push(controllingSocket);

        //make first socket in waiting list the controller and set timestamp
        controllingSocket = waitingSockets[0];
        controllingTimestamp = Date.now();

        //inform new controlling socket
        io.to(controllingSocket).emit('controlling', {
            control: true
        });

        //remove first socket from waiting list
        waitingSockets.splice(0, 1);
    }
    console.log(controllingSocket);
    console.log(waitingSockets);
};

io.on('connection', function(socket) {

    //add socket to waiting pool
    waitingSockets.push(socket.id);

    //check current controller
    controllerCheck();

    //tell socket whether it is the controller or not
    socket.emit('controlling', {
        control: (socket.id === controllingSocket)
    });

    //send initial values to new user
    socket.emit('initialize', {
        'r': r,
        'g': g,
        'b': b
    });

    //let clients check if the controller has changed
    socket.on('controllercheck', function() {
      controllerCheck();
    });

    //replace controller on disconnect/ remove socket from waitinglist
    socket.on('disconnect', function() {
        //check if socket is controller
        if (socket.id === controllingSocket) {

            //make first socket in waitinglist controller
            controllingSocket = waitingSockets[0];
            controllingTimestamp = Date.now();

            //inform new controlling socket
            io.to(controllingSocket).emit('controlling', {
                control: true
            });
        }

        //check if socket is in waiting list
        removeWaitingIndex = waitingSockets.indexOf(socket.id);

        if (removeWaitingIndex > -1) {
            //remove socket from waiting list
            waitingSockets.splice(removeWaitingIndex, 1);
        }
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
