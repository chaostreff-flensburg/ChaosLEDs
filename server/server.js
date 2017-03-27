// ===============
// Dependencies
// ===============

var express = require("express"),
    app = express(),
    router = express.Router(),
    http = require('http').Server(app),
    server = require('http').createServer(app),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    hostname = process.env.HOSTNAME || 'localhost',
    PORT = process.argv[3] || 8083,
    publicDir = process.argv[2] || __dirname + '/public',
    path = require('path'),
    io = require("socket.io")(http, {
        serveClient: false,
        pingInterval: 1000,
        pingTimeout: 10000
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

//slack webhook endpoint
router.post('/slack', function(req, res) {
    console.log(req.body);
    led.send({
        'function': 'blink',
        'color': {
            'r': 255,
            'g': 1,
            'b': 1
        }
    });
    res.status(200);
    res.end();
});

app.use(router);

// ====================
// Socket.io
// ====================
io.set('transports', [                     // enable all transports (optional if you want flashsocket)
    'websocket',
   'htmlfile',
   'xhr-polling',
   'jsonp-polling'
]);

var r = 100;
var g = 100;
var b = 100;
var controllingSocket = "";
var controllingTimestamp = 0;
var lastInputTimestamp = 0;
var waitingSockets = [];
const CONTROLTIME = 15000;
const AFKTIME = 10000;

//get time it takes for socket to become controller
var waitingTimeCheck = function(socket) {
    //check if socket is controlling
    if (socket.id === controllingSocket) {
        return 0;
    }

    //get remaining controlling time for current controller
    var currentControllerRemainingTime = CONTROLTIME - (Date.now() - controllingTimestamp);

    //check position in waiting list and multiply with controltime
    var waitingTime = 0;
    var waitingListIndex = waitingSockets.indexOf(socket.id);

    if (waitingListIndex > -1) {
        waitingTime = waitingListIndex * CONTROLTIME;
    }

    return waitingTime + currentControllerRemainingTime;
};

//function to check if controllingSockets turn is over
var controllerCheck = function() {
    //check for multiple id's in case of reload
    for (var i = 0; i < waitingSockets.length; i++) {
        //delete waiting socket if duplicate of controlling socket
        if (waitingSockets[i] === controllingSocket) {
            waitingSockets.splice(i, 1);
        }

        //delete socket if it is a duplicate of a socket on the waiting list which appeared earlier
        if (waitingSockets.indexOf(waitingSockets[i]) < i) {
            waitingSockets.splice(i, 1);
        }
    }

    //check if controlling Socket is free
    if (typeof controllingSocket === "undefined") {
        //make first socket in waitinglist controller
        controllingSocket = waitingSockets[0];
        controllingTimestamp = Date.now();

        //inform new controlling socket
        io.to(controllingSocket).emit('controlling', {
            control: true
        });

        //initially set lastInputTimestamp
        lastInputTimestamp = Date.now();

        //remove first socket from waiting list
        waitingSockets.splice(0, 1);

        return;
    }

    //replace controller if he is controlling for longer than the allowed controlling time
    if (controllingSocket !== "" && Date.now() - controllingTimestamp > CONTROLTIME) {
        //inform current controlling socket of controller change
        io.to(controllingSocket).emit('controlling', {
            control: false
        });

        //add current controller at the end of the waiting list
        waitingSockets.push(controllingSocket);

        //make first socket in waiting list the controller and set timestamp
        controllingSocket = waitingSockets[0];
        controllingTimestamp = Date.now();

        //inform new controlling socket
        io.to(controllingSocket).emit('controlling', {
            control: true
        });

        //initially set lastInputTimestamp
        lastInputTimestamp = Date.now();

        //remove first socket from waiting list
        waitingSockets.splice(0, 1);

        return;
    }

    //replace controller and remove him from waitinglist if his lastInputTimestamp is older than AFKTIME
    if (Date.now() - lastInputTimestamp > AFKTIME) {
        //inform current controlling socket of controller change and afk status
        io.to(controllingSocket).emit('controlling', {
            control: false,
            afk: true
        });

        //make first socket in waiting list the controller and set timestamp (thereby remove last controller from waiting list)
        controllingSocket = waitingSockets[0];
        controllingTimestamp = Date.now();

        //inform new controlling socket
        io.to(controllingSocket).emit('controlling', {
            control: true
        });

        //initially set lastInputTimestamp
        lastInputTimestamp = Date.now();

        //remove first socket from waiting list
        waitingSockets.splice(0, 1);

        return;
    }
};

//connection handling
io.on('connection', function(socket) {

    console.log("Connection established!");
    console.log(socket.id);


    //check current controller
    controllerCheck();


    //set socket as client
    socket.on('role', function(msg) {

      if(msg.role == "user") {

        //join group which gets the color updates
        socket.join('color');

        //add socket to waiting pool
        waitingSockets.push(socket.id);

        //check current controller
        controllerCheck();

        //tell socket whether it is the controller or not
        socket.emit('controlling', {
            control: (socket.id === controllingSocket),
            waitingTime: waitingTimeCheck(socket)
        });

        //send initial values to new user
        socket.emit('initialize', {
            'r': r,
            'g': g,
            'b': b
        });


        console.log("User added:");
        console.log(socket.id);

        console.log("Waiting pool:");
        console.dir(waitingSockets);

        console.log("Controller:");
        console.log(controllingSocket);

      }

      if(msg.role == "client") {
        //join group which gets the color updates
        console.log("Client joined:");
        console.log(socket.id);

        socket.join('color');
      }

    });

    //let clients check if the controller has changed
    socket.on('controllercheck', function() {
        console.log("Controlcheck requested from:");
        console.log(socket.id);

        controllerCheck();

        //if socket is not controlling, send it its waiting time
        if (controllingSocket !== socket.id) {
            socket.emit('controlling', {
                control: false,
                waitingTime: waitingTimeCheck(socket)
            });
        }
    });

    //replace controller on disconnect/ remove socket from waitinglist
    socket.on('disconnect', function() {
        console.log("Connection lost!");
        console.log(socket.id);
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
    socket.on('color', function(msg) {
        console.log(msg);

        //only process input from currently controlling socket
        if (socket.id === controllingSocket) {
            //set lastInputTimestamp
            lastInputTimestamp = Date.now();

            socket.to('color').emit('color', {
                'r': r,
                'g': g,
                'b': b
            });
            //console.log('R Value: ' + msg);
            r = msg.r;
            g = msg.g;
            b = msg.b;
        }
    });

    //accept heartbeats to prevent disconnect
    socket.on('heartbeat', function(msg) {

    });
});

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
