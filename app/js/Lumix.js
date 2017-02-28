'use strict';

var http = require('http');
var parseString = require('xml2js').parseString;

var LumixServer = require('./LumixServer');

var lumixAddress = '192.168.54.1';
const deviceName = 'DMC-CM1';
const deviceId = '4D454930-0100-1000-8000-F02765BACACE';

const init = '/cam.cgi?mode=accctrl&type=req_acc&value=' + deviceId + '&value2=' + deviceName;
const recmode = '/cam.cgi?mode=camcmd&value=recmode';
const playmode = '/cam.cgi?mode=camcmd&value=playmode';
const capture = '/cam.cgi?mode=camcmd&value=capture';
const capture_cancel = '/cam.cgi?mode=camcmd&value=capture_cancel';
const startstream = '/cam.cgi?mode=startstream&value=' + global.PORT;
const stopstream = '/cam.cgi?mode=stopstream';
const getstate = '/cam.cgi?mode=getstate';

const get_content_info = '/cam.cgi?mode=get_content_info';

const imageUrl = 'http://' + lumixAddress + ':50001/';

class Lumix {
  constructor() {
    this.server = new LumixServer();
    this.capturing = false;
    this.heartBeatCount = 0;
  }

  getPreviewImage() {
    return this.server.imageData;
  }

  getBinary(path, cb) {
    this.getRequest(path, function (err, res) {
      if (cb)
        cb(err, res);
    }, true);
  }

  getRequest(path, cb, bin) {
    try {
      var options = {
        host: lumixAddress,
        port: (bin ? 50001 : 80),
        path: path,
      };

      // console.log(options);

      let callback = function (response) {
        if (cb) {
          if (bin) {
            var data = [];
            response.on('data', function (chunk) {
              data.push(chunk);
            }).on('end', function () {
              var buffer = Buffer.concat(data);
              cb(null, buffer);
            });
          }else {
            var str = '';
            response.on('data', function (chunk) {
              str += chunk;
            }).on('end', function () {
              cb(null, str);
            });
          }
        }
      };

      var req = http.request(options, callback);
      req.on('error', function (err) {
        console.log('HTTP Request Failed');
        cb(err);
      });

      req.end();
    }catch (e) {
      console.log(e);
      cb && cb('Get request failed');
    }
  }

  sendLumix(path, cb) {
    this.getRequest(path, function (err, str) {
      if (cb) {
        if (err) {
          return cb(err, str);
        }

        try {
          parseString(str, function (err, result) {
            // console.log(JSON.stringify(result));
            cb(err, result);
          });
        }catch (e) {
          console.log('Failed parsing: ', e.stack);
          cb('Failed parsing');
        }
      }
    });
  }

  initialize() {
    this.sendLumix(init);
    this.startHeartbeat();
  }

  startStream() {
    this.sendLumix(recmode, (err, result)=> {
      this.sendLumix(startstream);
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    var _this = this;
    this.timer = setInterval(function () {
      if (!_this.downloading && !_this.capturing) {
        _this.sendLumix(getstate);
        _this.sendLumix(recmode);

        if (_this.heartBeatCount > 60) {
          //send every once in a while
          _this.sendLumix(init);
          _this.heartBeatCount = 0;
        }

        _this.heartBeatCount++;
      }
    }, 1000);
  }

  stopHeartbeat() {
    if (this.timer)
      clearInterval(this.timer);
  }

  captureBurst(callback, timeout){
    // capture_cancel
    let _this = this;
    if (_this.capturing) {
      if (callback) callback('Currently capturing');
      return;
    }

    _this.capturing = true;
    _this.sendLumix(recmode, function (err, result) {
      // console.log('send lumix callback');
      if (callback) {
        if (err) {
          _this.capturing = false;
          return callback(err);
        }

        //Run async
        _this.sendLumix(capture);

        //Stop capture
        setTimeout(function(){
          _this.sendLumix(capture_cancel);
          _this.capturing = false;
          callback(null, true);
        }, timeout);
      }else {
        _this.sendLumix(capture, function () {
          _this.capturing = false;
        });
      }
    });
  }

  capture(callback) {
    // console.log('Capture');
    let _this = this;
    if (_this.capturing) {
      if (callback) callback('Currently capturing');
      return;
    }

    _this.capturing = true;
    _this.sendLumix(recmode, function (err, result) {
      // console.log('send lumix callback');
      if (callback) {
        if (err) {
          _this.capturing = false;
          return callback(err);
        }

        //Run async
        _this.sendLumix(capture);

        //Change this to set interval to check for 5 seconds
        var maxTime = 6000;
        var checkFrequency = 70;
        var sdFlag = false;

        var timeStart = Date.now();

        //check with timer instead of attempts here

        var checkImageCount = function () {
          _this.sendLumix(getstate, function (err, result) {
            if (err) {
              _this.capturing = false;
              return callback(err);
            }

            if (result.camrply.state && result.camrply.state[0] && result.camrply.state[0].sd_access) {
              var sdAccess = result.camrply.state[0].sd_access == 'on';

              // console.log('sd access: ', sdAccess, result.camrply.state[0].sd_access);
              if (sdFlag && !sdAccess) {
                //Done Writing
                _this.capturing = false;
                return callback(null, true);
              }else {
                sdFlag = sdAccess;
              }
            }

            if ((Date.now() - timeStart) > maxTime) {
              //Failed to take photo
              _this.capturing = false;
              return callback('Failed to take photo');
            }else {
              setTimeout(checkImageCount, checkFrequency);
            }
          });
        };

        checkImageCount();

      }else {
        _this.sendLumix(capture, function () {
          _this.capturing = false;
        });
      }
    });
  }

  getLastPhotoId(callback) {
    // console.log('Get last photo');
    let _this = this;
    _this.downloading = true;
    _this.sendLumix(playmode, function (err, result) {
      // console.log('Play mode result', err, result);
      if (err) {
        _this.downloading = false;
        return callback(err);
      }

      //Wait before getting content
      setTimeout(()=> {
        _this.sendLumix(get_content_info, function (err, result) {
          // console.log('get content info result', err, result);
          if (err) {
            _this.downloading = false;
            return callback(err);
          }

          var contentNumber = parseInt(result.camrply.total_content_number[0]);
          callback(null, contentNumber + global.offsetImageID);
          // setTimeout(function () {
          //   //DL DO DT prefixes for files
          //   var jpgUrl = '/DL100' +  + '.jpg';
          //   console.log(jpgUrl);
          //   _this.getBinary(jpgUrl, function (err, result) {
          //     _this.downloading = false;
          //     return callback(err, result);
          //   });
          // }, 3000);
        });
      }, 500);
    });
  }

  getLastPhoto(callback) {
    // console.log('Get last photo');q
    let _this = this;
    _this.downloading = true;
    _this.sendLumix(playmode, function (err, result) {
      // console.log('Play mode result', err, result);
      if (err) {
        _this.downloading = false;
        return callback(err);
      }

      //Wait before getting content
      setTimeout(()=> {
        _this.sendLumix(get_content_info, function (err, result) {
          // console.log('get content info result', err, result);
          if (err) {
            _this.downloading = false;
            return callback(err);
          }

          var contentNumber = parseInt(result.camrply.total_content_number[0]);
          setTimeout(function () {
            //DL DO DT prefixes for files
            var jpgUrl = '/DL100' + (contentNumber + global.offsetImageID) + '.jpg';
            console.log(jpgUrl);
            _this.getBinary(jpgUrl, function (err, result) {
              _this.downloading = false;
              if(err || !result || result.length == 0){
                var e = {
                  url: jpgUrl,
                  contentNumber: contentNumber,
                  err: err
                }
                return callback(e, result);
              }
              return callback(err, result);
            });
          }, 3000);
        });
      }, 500);
    });
  }
}

module.exports = Lumix;
