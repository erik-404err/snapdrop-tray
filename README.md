# snapdrop-tray
Crossplatform Snapdrop Client with functional Tray Icon, ported with Electron.


Thanks to the electon-team for https://www.electronjs.org/!

Thanks to the Snapdrop-team for https://snapdrop.net/! ([GitHub Repository](https://github.com/RobinLinus/snapdrop))

## Installation:

Linux only, for now:
Take a look at the [releases](https://github.com/erik-404err/snapdrop-tray/releases).

Currently theres only a Linux .deb that can't be installed on MacOs or Windows. Im working on building the app for thoose platforms too.

Until then you can try to launch the sourcecode. Clone this repository, `npm install electron path mime-types electron-store` via npm, move the '/images' folder one directory up (working on a fix) and then run `npm start`.

## How to use it?

Once you ran `npm start` you should see a Tray icon on the bottom right. When clicking on it, you should see a Menu constaining:

- __Settings__   >
- __Send Files__ >
- __Send Text__  >
- __Reload__
- __Quit All__

'Quit All' and 'Reload' are pretty self explanatory.

The Submenus 'Send Text' and 'Send Files' should show your Snapdrop-name at the top and all other Snapdrop Devices at the bottom.

The 'Settings' Submenu contains:

- __Start Notification__ (pushes a Notification on sucsessful startup if enabled)
- __Quit Notification__ (pushes a waring Notification when the user closes the Snapdrop window if enabled)
- __Using Window__ (if enabled you'll see a Snapdrop window, if disabled you'll see a Tray Icon with 'Send' submenus)
- __Using Frame__ (if disabled, the Snapdrop window will not have a frame around it)
- __Apply__ (applies the setting via reloading)



## Known issues:
- When sending a File via the Tray Icon, the application holds for a few seconds, making the Filesharing prosess slower.
- When sending Text messages via the Tray Icon on Linux, the Inputbox has black corners. This is caused by electron not supporting transparent background on linux (yet). 
- When reloading the application, the old device is still found in Snapdrop
- The Window isnt in the perfect positioning for everybody. This can be fixed by (somehow) getting the screenresulution of the client 

