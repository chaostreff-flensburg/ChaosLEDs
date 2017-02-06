const cp = require('child_process');

var state = {
    'function': 'setColor',
    'rgb': rgb
};

////////////////
//// MASTER ////
////////////////

/* ---------- LED CHILD HANDLER ------------- */

//STATE GENERATOR

let LEDController = function*() {
    let child = cp.fork();
    while (true) {
        let msg = yield;

        //kill worker and create new one if function is different
        if (msg.function !== state.function) {
            console.log("Killing last child...");
            child.kill();
            child = cp.fork('ledChild.js');
        }

        //save last state
        state = msg;

        child.send(state);
    }
};

let led = LEDController();

/* ------------ EVENT HANDLING ---------- */

//receive signal from parent
process.on('message', function(msg) {
    console.log(msg);

    //send message to led controller
    led.next(msg);
});

//kill child process with parent
process.on("SIGTERM", function() {
    console.log("Parent SIGTERM detected");
    //kill all workers
    cp.disconnect();
    // exit cleanly
    process.exit();
});
