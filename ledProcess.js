const numCPUs = require('os').cpus().length;
const cluster = require('cluster');
const fs = require('fs');
const file = "state.json";

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

    let worker = null;

    //receive signal from parent
    process.on('message', function(msg) {
        //console.log(msg);

        //send message to led worker
        fs.writeFileSync(file, JSON.stringify(msg), {
            'flag': 'w+'
        });

        if (worker === null) {
            //create led worker
            worker = cluster.fork();
        }
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

    //set pins
    const rPin = 2;
    const gPin = 3;
    const bPin = 4;

    //pwm values
    var rgb = [0, 0, 0];

    //fade values
    let targets = [Math.floor(Math.random() * (255 - 1)) + 1, Math.floor(Math.random() * (255 - 1)) + 1, Math.floor(Math.random() * (255 - 1)) + 1];

    //init GPIO's
    pi.wiringPiSetupGpio();

    pi.softPwmCreate(rPin, 100, 100);
    pi.softPwmCreate(gPin, 100, 100);
    pi.softPwmCreate(bPin, 100, 100);

    /* ---------- LED FUNCTIONS -------- */

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


    var fade = function() {

        for (let h = 0; h < rgb.length; h++) {
            if (rgb[h] < targets[h]) {
                ++rgb[h];
            } else if (rgb[h] > targets[h]) {
                --rgb[h];
            } else if (rgb[h] == targets[h]) {
                targets[h] = Math.floor(Math.random() * (256 - 1)) + 1;
            }
            console.log(rgb[h]);
            pi.softPwmWrite(rPin, rgb[h]);
        }
        pi.delay(10);

        update();
    };

    var blink = function(color) {
        pi.delay(300);
        l(color);
        pi.delay(300);
        rgb = [0, 0, 0];
        l(rgb);

        update();
    };

    /* ----------- HANDLE MASTER COMMUNICATION ------ */

    var update = function() {
        try {
            setTimeout(function() {
                //communication file
                let msg = JSON.parse(fs.readFileSync(file, 'utf8'));
                console.log(msg);

                switch (msg.function) {
                    case 'setColors':
                        l(msg.rgb);
                        break;

                    case 'blink':
                        blink(msg.rgb);
                        break;

                    case 'fade':
                        fade();
                        break;

                }
            }, 1000 / 60);
        } catch (e) {

        }
    };

    update();
}
