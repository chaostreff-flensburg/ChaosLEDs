var pi = require('wiring-pi');
pi.wiringPiSetupGpio();

//pwm values
var r = 0;
var g = 0;
var b = 100;

//set pins
const rPin = 2;
const gPin = 3;
const bPin = 4;

pi.softPwmCreate(rPin, 100, 100);
pi.softPwmCreate(gPin, 100, 100);
pi.softPwmCreate(bPin, 100, 100);

pi.softPwmWrite(rPin, r);
pi.softPwmWrite(gPin, g);
pi.softPwmWrite(bPin, b);


//receive signal from parent
process.on('message', function(msg) {
    console.log(msg);

    //update pwm values
    r = parseInt(msg.r);
    g = parseInt(msg.g);
    b = parseInt(msg.b);

    //update pwm writes
    pi.softPwmWrite(rPin, r);
    pi.softPwmWrite(gPin, g);
    pi.softPwmWrite(bPin, b);
});

//kill child process with parent
process.on("SIGTERM", function() {
    console.log("Parent SIGTERM detected");
    // exit cleanly
    process.exit();
});

/* ---------- LED FUNCTIONS ------------- */

// SYSTEM FUNCTIONS

//function which chooses the correct pin by string input
var l = function(color, brightness) {
    var pin;

    switch (color) {
        case 'r':
            pi.softPwmWrite(rPin, brightness);
            break;

        case 'g':
            pi.softPwmWrite(gPin, brightness);
            break;

        case 'b':
            pi.softPwmWrite(bPin, brightness);
            break;

        default:
    }
};

var setAllColors = function(brightness) {
    l('r', brightness);
    l('g', brightness);
    l('p', brightness);
};

// STATE FUNCTIONS

// TIMED FUNCTIONS

var blinkSingleColor = function(color) {
    setAllColors(0);
    for (var i = 0; i < 6; i++) {
        pi.delay(300);
        l(color, 100);
        pi.delay(300);
        l(color, 0);
    }
};
