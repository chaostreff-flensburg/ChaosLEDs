const numCPUs = require('os').cpus().length;
const cluster = require('cluster');

//set pins
const rPin = 2;
const gPin = 3;
const bPin = 4;

var state = {
    'function': 'setColor',
    'rgb': rgb
};

////////////////
//// MASTER ////
////////////////

if (cluster.isMaster) {

    /* ---------- LED WORKER HANDLER ------------- */

    //STATE GENERATOR

    let LEDController = function*() {
        let worker = cluster.fork();
        while (true) {
            let msg = yield;
            state = msg;

            //kill worker and create new one if function is different
            if (msg.function !== state.function) {
                worker.kill();
                worker = cluster.fork();
            }

            worker.send(state);
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
        // exit cleanly
        process.exit();
    });

}
////////////////
//// WORKER ////
////////////////

if (cluster.isWorker) {
    const pi = require('wiring-pi');

    //pwm values
    var rgb = [0, 0, 0];

    //init GPIO's
    pi.wiringPiSetupGpio();

    pi.softPwmCreate(rPin, 100, 100);
    pi.softPwmCreate(gPin, 100, 100);
    pi.softPwmCreate(bPin, 100, 100);

    /* ----------- HANDLE MASTER COMMUNICATION ------ */

    process.on('message', function(msg) {
        switch (msg.function) {
            case 'setColors':
                l(msg.rgb);
                break;

            case 'blink':
                blink(msg.rgb);
                break;

            case 'fade':
                fade(msg.rgb);
                break;

        }
    });

    //kill worker with parent
    process.on("SIGTERM", function() {
        //set color to old value
        l(rgb);
        console.log("Worker shutting down...");
        // exit cleanly
        process.exit();
    });

    //set lights by global rgb values
    var l = function(...rgb) {
        //check if arguments are set
        if (arguments[0] !== "undefined") {
            rgb = [arguments[0].r, arguments[0].g, arguments[0].b];
        }

        //sanity check and map rgb values
        rgb = rgb.map(function(e) {
            //scale it from 0 - 255 to 0 - 100
            e = e / 255 * 100;
            e = Math.round(e);
            if (e > 100) {
                e = 100;
            } else if (e < 1) {
                e = 1;
            }

            return e;
        });
        console.dir(rgb);
        pi.softPwmWrite(rPin, rgb[0]);
        pi.softPwmWrite(gPin, rgb[1]);
        pi.softPwmWrite(bPin, rgb[2]);
    };


    var fade = function(color) {
        l(color);

        let tempColors = [color.r, color.g, color.b];
        let targets = [Math.floor(Math.random() * (255 - 1)) + 1, Math.floor(Math.random() * (255 - 1)) + 1, Math.floor(Math.random() * (255 - 1)) + 1];

        while (true) {
            for (let h = 0; h < tempColors.length; h++) {
                if (tempColors[h] < targets[h]) {
                    ++tempColors[h];
                } else if (tempColors[h] > targets[h]) {
                    --tempColors[h];
                } else if (tempColors[h] == targets[h]) {
                    targets[h] = Math.floor(Math.random() * (256 - 1)) + 1;
                }
                console.log(tempColors[h]);
                pi.softPwmWrite(rPin, tempColors[h]);
            }
            pi.delay(10);
        }
    };

    var blink = function(color) {
        l(color);
        while(true) {
            pi.delay(300);
            l(color);
            pi.delay(300);
            rgb = [0, 0, 0];
            l();
        }
    };

}
