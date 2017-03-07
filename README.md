Prerequisites
=======
Get node if you haven't already. [Highly recommend nvm](https://github.com/creationix/nvm)

Steps to get this set up to run
========
`npm install`

Steps to get this running
========
1. Start camera
2. Click MENU
3. Select WiFi under settings
4. Wi-Fi Function
5. New Connection
6. Remote Shooting ^ View
7. `npm start`

Compile for distribution
========
Use this to build
`https://github.com/electron-userland/electron-packager`

eg. `electron-packager ./ --platform=darwin --arch=x64`
eg. `electron-packager ./ --platform=linux --arch=arm`


Notes
========
The first time connecting to the camera will require the user to accept the incoming connection from this program
Once hitting "Yes", you will need to restart this program

You will also need to reset the file number on the camera for this to properly download the photos after taking them.
If this is not a possibility you may change the file number offset in the config.js file