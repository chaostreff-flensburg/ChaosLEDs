var masterUrl = 'http://jonasleitner.de',
    socket = require('socket.io-client')(masterUrl);

//join server as client
socket.emit('role', {
    role: "client"
}, function (res) {
  console.log(res);
});

//receive signal from parent
socket.on('color', function(msg) {
    console.log(msg);
});
