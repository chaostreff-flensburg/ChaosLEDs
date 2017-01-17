var pi = require('wiring-pi');
pi.wiringPiSetup();

//pwm values
var r, g, b = 100;

//set pins
const rPin = 1;
const gPin = 2;
const bPin = 3;

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
  r = msg.r;
  g = msg.g;
  b = msg.b;

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
