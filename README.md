# snapdrop-tray
Crossplatform Snapdrop Client with functional Tray Icon, ported with Electron.
Thanks to the electon-team for https://www.electronjs.org/ and thanks to the Snapdrop-team for https://snapdrop.net/!
(github: https://github.com/RobinLinus/snapdrop)

# Installation:
Im working on building this as an app, currently its just code. To install it now, open a Terminal (after installing 'git' and 'npm') run this command:
```
git clone https://github.com/erik-404err/snapdrop-tray.git && cd ./snapdrop-tray && npm install electron --save-dev && npm install path mime-types electron-store
```
Then run `npm start`

# How to use it?



# Known issues:

- When sending a File via the Tray Icon, the application holds for a few seconds, making the Filesharing prosess slower.
- When sending Text messages via the Tray Icon on Linux, the Inputbox has black corners. This is caused by electron not supporting transparent background on linux (yet). 
- When reloading the application, the old device is still found in Snapdrop
- The Window isnt in the perfect positioning for everybody. This can be fixed by (somehow) getting the screenresulution of the client 

