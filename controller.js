var express = require('express'),
    cp      = require('child_process'),
    router  = express.Router();

//start the led controller child process
var led = cp.fork('ledProcess.js');

//receive signal from child
process.on('message', function(message) {
  console.log(message);
});

led.send('wululu');

router.get('/', function(req, res) {

});

module.exports = router;
