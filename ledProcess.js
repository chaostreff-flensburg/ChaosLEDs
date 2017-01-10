var gpio = require('raspi-wiringpi');

//receive signal from parent
process.on('message', function(msg) {
  console.log(msg);
});

//kill child process with parent
process.on("SIGTERM", function() {
   console.log("Parent SIGTERM detected");
   // exit cleanly
   process.exit();
});
