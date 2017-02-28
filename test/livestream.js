const dgram = require('dgram');
const server = dgram.createSocket('udp4');
var fs = require('fs');

//Limit file rape
var writeCount = 0;
var writeAmount = 200;

server.on('message', function(msg, rinfo) {
  if(writeCount < writeAmount){
    //Get offset from header
    var offset = 144;
    for (var i = 0; i < 320; i++){
      if (msg[i] == 0xFF && msg[i+1] == 0xD8){
        offset = i;
        break;
      }
    }

    var jpgData = new Buffer(msg.length - offset);
    msg.copy(jpgData, 0, offset);

    fs.writeFile("./video/stream_" + writeCount + ".jpg", 
      jpgData, function(err) {
      if(err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });

  }
    writeCount++;
});

server.on('listening', function() {
  var address = server.address();
  console.log('server listening', address);
});

server.bind(49473);




