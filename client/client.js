var pi = require('wiring-pi'),
    masterUrl = 'http://10.9.0.2:8803',
    socket = require('socket.io-client')(masterUrl);

    //join server as client
    socket.emit('role', {role: "client"});

pi.wiringPiSetupGpio();

//set pins
const rPin = 2;
const gPin = 3;
const bPin = 4;

//pwm values
var r = 0;
var g = 0;
var b = 0;

pi.softPwmCreate(rPin, 100, 100);
pi.softPwmCreate(gPin, 100, 100);
pi.softPwmCreate(bPin, 100, 100);

pi.softPwmWrite(rPin, r);
pi.softPwmWrite(gPin, g);
pi.softPwmWrite(bPin, b);


//receive signal from parent
socket.on('message', function(msg) {
    console.log(msg);

    switch (msg.function) {
        case 'setColors':
            setColors(msg.r, msg.g, msg.b);
            break;

        case 'blink':
            blink(msg.color);
            break;

        case 'fade':
            fade(msg.color);
            break;

        case 'setAllColors':
            setAllColors(parseInt(msg.color));
            break;
    }
});

/* ---------- LED FUNCTIONS ------------- */

// SYSTEM FUNCTIONS

//function which chooses the correct pin by string input
var l = function(color, brightness) {
    //sanity check brightness
    brightness = Math.round(brightness);

    if (brightness > 256) {
        brightness = 256;
    } else if (brightness < 1) {
        brightness = 1;
    }

    switch (color) {
        case 0:
        case 'r':
            pi.softPwmWrite(rPin, brightness);
            break;

        case 1:
        case 'g':
            pi.softPwmWrite(gPin, brightness);
            break;

        case 2:
        case 'b':
            pi.softPwmWrite(bPin, brightness);
            break;

        default:
    }
};

var setAllColors = function(brightness) {
    setColors(brightness, brightness, brightness);
};

var still = function() {
    l('r', r);
    l('g', g);
    l('b', b);
};

var setColors = function(rValue, gValue, bValue) {
    r = rValue;
    g = gValue;
    b = bValue;

    still();
};

var fade = function(color) {
    setColors(color.r, color.g, color.b);

    var tempColors = [color.r, color.g, color.b];
    var targets = [Math.floor(Math.random() * (256 - 1)) + 1, Math.floor(Math.random() * (256 - 1)) + 1, Math.floor(Math.random() * (256 - 1)) + 1];

    for (var i = 0; i < 300; i++) {
        for (var h = 0; h < tempColors.length; h++) {
            if (tempColors[h] < targets[h]) {
                ++tempColors[h];
            } else if (tempColors[h] > targets[h]) {
                --tempColors[h];
            } else if (tempColors[h] == targets[h]) {
                targets[h] = Math.floor(Math.random() * (256 - 1)) + 1;
            }
            console.log(tempColors[h]);
            l(h, tempColors[h]);
        }
        pi.delay(10);
    }
    setColors(r, g, b);
    still();
};

var blink = function(color) {
    setAllColors(1);
    pi.delay(300);
    for (var i = 0; i < 2; i++) {
        setColors(color.r, color.g, color.b);
        pi.delay(300);
        setAllColors(1);
        pi.delay(300);
    }
    setColors(color.r, color.g, color.b);
};
