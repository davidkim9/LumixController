'use strict';
require("./config");
var $ = require("jquery");
var Lumix = require("./Lumix");
var Log = require("./Log");

var canvas = document.querySelector('#canvas');
var context = canvas.getContext('2d');
var previewImageSmall = document.querySelector('#previewImageSmall');

class Controller {
  constructor() {
    var camera = new Lumix();

    camera.initialize();
    camera.startStream();

    this.camera = camera;

    this.imageObj = new Image();
    this.previewImage = new Image();

    //Attach events
    $(".clickMeToCapture").click(()=>this.capture());

    this.render();

  }

  render() {
    this.displayImage(this.camera.getPreviewImage());

    requestAnimationFrame(this.render.bind(this));
  }

  displayImage(imgData) {
    if(imgData){
      this.imageObj.onload = function() {
        context.drawImage(this, 0, 0, this.width, this.height, 0, 0, canvas.width, canvas.height);
      };
      this.imageObj.src = "data:image/jpg;base64," + imgData;
    }
  }

  capture() {
    console.log("Capture Start");

    this.camera.capture((err, ok)=>{
      console.log("Capture Attempt");
      if(err){
        console.log("Failed to take a picture");
        return;
      }

      // Attempt to download last photo taken
      this.attempt((cb)=>{
        this.camera.getLastPhoto(cb);
      }, (err, data)=>{
        console.log("Get Last Photo Attempt");

        if(err){
          console.log("Failed to download last photo");
          if(err.url){
            console.log("Last taken URL: ", err.url);
          }
          return;
        }

        // Save photo
        var previewImageData = data.toString('base64');
        this.previewImage.src = "data:image/jpg;base64," + previewImageData;
        
        this.camera.startStream();
      }, 3);

    });
  }

  attempt(fn, callback, tries) {
    fn((err, res)=>{
      if(err){
        //Retry
        if(tries == 0){
          return callback(err, res);
        }else{
          return this.attempt(fn, callback, tries - 1);
        }
      }
      return callback(err, res);
    });
  }

}

module.exports = Controller;
