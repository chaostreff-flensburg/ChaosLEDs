var pi = require('wiring-pi');
pi.wiringPiSetup();

//pwm values
var r = 0;
var g = 0;
var b = 100;

//set pins
const rPin = 2;
const gPin = 3;
const bPin = 4;

pi.pinMode(rPin, pi.OUTPUT);
pi.pinMode(gPin, pi.OUTPUT);
pi.pinMode(bPin, pi.OUTPUT);

pi.digitalWrite(rPin, pi.LOW);
pi.digitalWrite(gPin, pi.LOW);
pi.digitalWrite(bPin, pi.LOW);

var intToDigital = function(value) {
  if(value > 49) {
    return pi.HIGH;
  } else {
    return pi.LOW;
  }
};

/*
pi.softPwmCreate(rPin, 100, 100);
pi.softPwmCreate(gPin, 100, 100);
pi.softPwmCreate(bPin, 100, 100);

pi.softPwmWrite(rPin, r);
pi.softPwmWrite(gPin, g);
pi.softPwmWrite(bPin, b);
*/

//receive signal from parent
process.on('message', function(msg) {
    console.log(msg);

    //update pwm values
    r = parseInt(msg.r);
    g = parseInt(msg.g);
    b = parseInt(msg.b);

    //digital writes
    pi.digitalWrite(rPin, intToDigital(r));
    pi.digitalWrite(gPin, intToDigital(g));
    pi.digitalWrite(bPin, intToDigital(b));

    //update pwm writes
    /*
    pi.softPwmWrite(rPin, r);
    pi.softPwmWrite(gPin, g);
    pi.softPwmWrite(bPin, b);
    */
});

//kill child process with parent
process.on("SIGTERM", function() {
    console.log("Parent SIGTERM detected");
    // exit cleanly
    process.exit();
});
