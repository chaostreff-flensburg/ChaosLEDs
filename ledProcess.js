const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const fs = require('fs');

//set pins
const rPin = 2;
const gPin = 3;
const bPin = 4;

////////////////
//// MASTER ////
////////////////

if (cluster.isMaster) {

    /* ---------- LED WORKER HANDLER ------------- */

    //STATE GENERATOR
    var state = {
        'function': 'setColor',
        'rgb': {
            'r': 0,
            'g': 0,
            'b': 0
        }
    };

    let LEDController = function*() {
        let worker = cluster.fork();
        while (true) {
            let msg = yield;

            //kill worker and create new one if function is different
            if (msg.function !== state.function) {
                console.log("Stopping last worker...");
                worker.kill('SIGTERM');
                worker = cluster.fork();
            }

            //save last state
            state = msg;

            fs.writeFileSync('state.json', JSON.stringify(state));
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
        cluster.disconnect();
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

    var update = function() {

        //communication file
        let msg = JSON.parse(fs.readFileSync('file', 'utf8'));

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
    };


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
        //console.dir(rgb);
        pi.softPwmWrite(rPin, rgb[0]);
        pi.softPwmWrite(gPin, rgb[1]);
        pi.softPwmWrite(bPin, rgb[2]);

        update();
    };


    var fade = function(color) {
        let tempColors = [color.r, color.g, color.b];
        let targets = [Math.floor(Math.random() * (255 - 1)) + 1, Math.floor(Math.random() * (255 - 1)) + 1, Math.floor(Math.random() * (255 - 1)) + 1];

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

        update();
    };

    var blink = function(color) {
        pi.delay(300);
        l(color);
        pi.delay(300);
        rgb = [0, 0, 0];
        l();

        update();
    };
}
