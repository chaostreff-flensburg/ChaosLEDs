var pi = require('wiring-pi');
var connected = pi.wiringPiSetupGpio();

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
process.on('message', function(msg) {
    console.log(msg);

    //check if gpio is connected
    if(connected) {
      switch (msg.function) {
          case 'setColors':
              setColors(parseInt(msg.r), parseInt(msg.g), parseInt(msg.b));
              break;

          case 'blinkSingleColor':
              blinkSingleColor(msg.color);
              break;

          case 'singleFade':
              singleFade(msg.color);
              break;

          case 'setAllColors':
              setAllColors(parseInt(msg.brightness));
              break;
      }
    }
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

var singleFade = function(color) {
    setAllColors(0);
    for (var i = 0; i < 100; i++) {
        l(color, i);
        pi.delay(10);
    }
    for (var h = 100; h > 0; h--) {
        l(color, h);
        pi.delay(10);
    }
    still();
};

var blinkSingleColor = function(color) {
    setAllColors(0);
    for (var i = 0; i < 2; i++) {
        pi.delay(300);
        l(color, 100);
        pi.delay(300);
        l(color, 0);
    }
    still();
};
