//Require
const { app, BrowserWindow, Notification, Menu, Tray, ipcMain, dialog, screen } = require('electron'); //electron Modules
const Store = require('electron-store'); //storeing data in Electron
const fs = require('fs');//acessing local files (for sending files via TrayMenu)
const AutoLaunch = require('auto-launch');  //needed for 'launch on startup';https://electronjs.org/docs/api/app#appsetloginitemsettingssettings-macos-windows is not supported on linux
const path = require('path');//getting filename from path //may be removed in the future to clean up code (if workaround found)
const mime = require('mime-types');//getting MIME-type from extention //may be removed in the future to clean up code (if workaround found)
//END


//global variableslet 
var ClientName = 'The eaiest way to transfer data across devices';   //as long as no name is set, display this
var ClearName = null           //Clientname without sentences, just the name //may be removed in the future to clean up code (if workaround found)
const store = new Store();    //for storeing data after app ic closed
var contextMenu = null;      //Menu of the Tray icon
var win = null;             //the \'Snapdrop\' window
var tray = null            //the tray icon itself
var peers = [];           //Array of all current peers
var txt = null;          //The \'text input\' window
//END


//Listeners

//listener for sendName
ipcMain.on('sendName', (event, newClientName) => { //triggerd in ui.js ln.16
  ClientName = 'You are known as \'' + newClientName + '\'';
  ClearName = newClientName;
  console.log('[main.js]: ' + ClientName);//log ClientName
  SetSendMenu();// adds the name, then updates the Menu
});

//listener for peerJoined
ipcMain.on('peerJoined', (event, peer) => { //triggerd in ui.js ln.32
  peers[peers.length] = {name: peer.name.displayName, id: peer.id};//adds name and id to peers
  console.log('[main.js]: \'' + peer.name.displayName + '\' joined!')//log that peer joined
  SetSendMenu();//then updates the Menu
});

//listener for clearPeers
ipcMain.on('clearPeers', () => { //triggerd in ui.js ln.56
  peers = [];//clear all peers
  console.log('[main.js]: ' + 'cleared peers')//log that peers cleared
  SetSendMenu();//then updates the Menu
});

//listener for peerLeft
ipcMain.on('peerLeft', (event, peerId) => { //triggerd in ui.js ln.45
  var PeerPos;    //local variable for peers[pos]
  for(let i = 0; i < peers.length; i++){    //loop though all peers
    if(peers[i].id == peerId){    //if peer was found 
      PeerPos = i;    //save pos
    }
  };
  if(PeerPos == null){return;}; //if peer doesnt exist, no need for removal
  console.log('[main.js]: ' + 'Peer \'' + peers[PeerPos].name + '\' left');//log that peer left
  if(peers.length == 1){  //if only one peer exists
    peers = [];   //remove and done
  } else {
    for(let i = 0; i < peers.length; i++){//loop though peers
      if (i > PeerPos){//if they are after the one removed
        peers[i - 1] = peers[i]; //move them up one
      };
    };
    peers.pop();  //remove the last entery (duplicate of one before last)
  };
  SetSendMenu();//then updates the Menu
});

//listener for Text input's cancel button 
ipcMain.on('textInputCancel', (event, arg) => {txt.destroy()}); //triggerd in TextDialog ln.83

//END


//function to create a browser window
function createWindow () { 
  var clientScreen = screen.getPrimaryDisplay(); //get screen info
  win = new BrowserWindow({ //create a Browser Window
    width: 400, //constant size for now ...
    height: 800,
    x: clientScreen.workArea.width + clientScreen.workArea.x - 400,
    y: clientScreen.workArea.height + clientScreen.workArea.y- 800,
    show: GetUsingWindowCheckboxState(), //get checkbox states
    frame: GetUsingFrameCheckboxState(),
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png'), //set icon in Taskbar
    webPreferences: {
      nodeIntegration: true, // for ipcRenderer.send/on ...
      contextIsolation: false //this is a bad idea (according to: https://github.com/electron/electron/issues/23506) but 'true' causes:
      //Uncaught ReferenceError: require/Event is not defined at network.js & ui.js
      //not that bad, since index.html doesn't contain 'untrusted content'
      //https://www.electronjs.org/docs/tutorial/security#isolation-for-untrusted-content
    }
  });
  win.loadFile('index.html'); //load the .html
};
//END


//function for pushing the starting notification
function StartNotification () {
  const notification = { //create Notification with properties
    title: 'Snapdrop',
    body: 'Started succsessfully!',
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png')
  };
  if(store.get('StartNotification')){//get checkbox state
    new Notification(notification).show();//show Notification
  };
};
//END


//send QuitNotification if the user wishes to, then quit the app
function QuitNotification () {
  const QuitNotification = {//create Notification with properties
    title: 'Snapdrop Quit',
    body: 'The window needs to stay open in order for the tray icon to work (turn off this notification in the tray menu)',
    icon: path.join(__dirname, '/../images/logo_transparent_512x512.png'), //set icon in Taskbar
  };
  SaveStates();
  if (store.get('QuitNotification')) { //get checkbox state
    new Notification(QuitNotification).show(); //show Notification
    setTimeout(function (){app.quit();}, 4000); //wait, cause the notification wouldn't show otherwise
  } else {
    app.quit();// else, instant-quit
  };
};
//END


//function for the showing and hideing button in the Tray Menu
function ShowHide() {
  win.isFocused() ? win.minimize() : win.show(); //if win isFocused minimize, otherwise, show
};
//END


//fuction called to SendTextTo given ID 
function SendTextTo (id){
  txt = new BrowserWindow({ //create new BrowserWindow
    width: 400,
    height: 210,
    frame: false,
    icon: path.join(__dirname, '/../images/logo_transparent_white_512x512.png'), //set icon in Taskbar
    transparent: true, //doesnt work for linux, background will be square, not round
    backgroundColor: '#00121212', //since fully transparent isnt possible on linux (#00..) is shows up black --Find a way to determin client OS
    webPreferences: {
      nodeIntegration: true,// for ipcRenderer.send()
      contextIsolation: false// see line 89
    }
  });
  txt.loadFile('TextDialog.html');//load the .html
  ipcMain.on('textInput', (event, textGiven) => { //triggerd in TextDialog.html ln.78
    win.webContents.send('sendText', {text: textGiven, to: id}); //triggers network.js ln.386
    txt.destroy()//destroy the window
  });
};
//END


//function called to SendFilesTo ID 
function SendFilesTo (id, name){
  var paths = dialog.showOpenDialogSync({   //open dialog syncronus
    title: 'Select files for \'' + name + '\'',//set title for dialog 
    buttonLabel: 'Send', //cange open butten to 'Send'
    properties: ['openFile', 'multiSelections']  //with proerties
  });
  if(paths == null ){return;};//retun if user canceld the promp
    
  var dataSend = [];var nameSend = [];var typeSend = [];  //local variable reset
  for(let i = 0; i < paths.length; i++){ // loop though filepaths 
    dataSend[i] = fs.readFileSync(paths[i]); //read the file
    nameSend[i] = path.parse(paths[i]).base; //get filename
    typeSend[i] = mime.lookup(paths[i]); //get MIME-Type
    if(typeSend[i] == false){ //if no type was recognised
      typeSend[i] = 'application/octet-stream' //use 'binary' (no extention)
    }
  };

  win.webContents.send('sendFiles', { //triggers network.js ln.374
    to: id,
    files: [],
    data: dataSend,
    name: nameSend,
    type: typeSend 
  });
};
//END


//function that returns the proper ToolTip string //DESNT WORK ON LINUX: https://github.com/electron/electron/issues/25976
function GetToolTip(){
  if(ClearName == null){
    return 'Snapdrop';
  }else{
    return 'You\'re ' + ClearName;
  };
}
//END


//function that returns the Settings Submenu
function SettingsSubmenu(){
  var submenu =[
    { label: 'Lauch on startup', id: 'auto', type: 'checkbox', checked: GetAutoLauncheckboxState()},  //Settings via checkboxes
    { label: 'Start Notification', id: 'start', type: 'checkbox', checked: GetStartNotificationCheckboxState() },
    { label: 'Quit Notification', id: 'quit', type: 'checkbox', checked: GetQuitNotificationCheckboxState() },
    { label: 'Using Window', id: 'window', type: 'checkbox', checked: GetUsingWindowCheckboxState() },
    { label: 'Using Frame', id: 'frame', type: 'checkbox', checked: GetUsingFrameCheckboxState() },
    { label: 'ApplySeperator', type: 'separator'},
    { label: 'Apply', click() {SaveStates();win.webContents.send('disconnect');app.relaunch();app.exit()}} //relaunch to apply changes and disconnect
  ];
  return submenu; //return the submenu
};
//END


//function to construct a new menu when called and nesessery
function SetSendMenu(){
  if(!GetUsingWindowCheckboxState() && tray != null){ //Only if no window exists

    var DeviceTextSubmenu = [     //Submenu for sending Text
      { label: ClientName, id: 'clientname'},
      { label: 'NameSeperator', type: 'separator'}
    ];
    if(peers.length == 0){        //if no peers exist
      DeviceTextSubmenu[2] = { label: 'Open Snapdrop on other devices to send messages'}; //insert this
    } else {
      for (let i = 0; i < peers.length; i++){ //loop though peers
        DeviceTextSubmenu[3 + i] = { label: peers[i].name, click () {SendTextTo(peers[i].id)}}; //and add them
      };
    };

    var DeviceFilesSubmenu = [      //Submenu for sending files
      { label: ClientName, id: 'clientname'},
      { label: 'NameSeperator', type: 'separator'}
    ];
    if(peers.length == 0){        //if no peers exist
      DeviceFilesSubmenu[2] = { label: 'Open Snapdrop on other devices to send files'}; //insert this
    } else {
      for (let i = 0; i < peers.length; i++){ //loop though peers
        DeviceFilesSubmenu[3 + i] = { label: peers[i].name, click () {SendFilesTo(peers[i].id, peers[i].name)}}; //and add them
      };
    };

    contextMenu = Menu.buildFromTemplate([  //construct a new contextMenu for setting
      { label: 'Settings', id:'checkboxes', submenu: SettingsSubmenu()},    //settings submenu
      { label: 'Send Files', id: 'sendfiles', submenu: DeviceFilesSubmenu},   //filesSubmenu
      { label: 'Send Text', id: 'sendtext', submenu: DeviceTextSubmenu},      //textSubmenu
      { label: 'QuitSeperator', type: 'separator'},
      {label: 'Reload', click() {SaveStates();win.webContents.send('disconnect');app.relaunch();app.exit()}},    //Reload after saving prefs and disconnect
      { label: 'Quit All', click () {SaveStates();app.quit()}}, //buttion to quit all
    ]);
    tray.setContextMenu(contextMenu); //setting contextMenu
    tray.setToolTip(GetToolTip()); //get the text shown when hovering over the TrayIcon
  };//EndIf
};
//END


//Get CheckboxStartes
function GetAutoLauncheckboxState(){//Get the stored state of the autolaunch checkbox
  if(store.get('AutoLaunch')==null){
    return true;  //default true
  } else {
    return store.get('AutoLaunch');
  }
};

function GetQuitNotificationCheckboxState(){//Get the stored state of the Quit notofication checkbox
  if(store.get('QuitNotification')==null){
    return true;  //default true
  } else {
    return store.get('QuitNotification');
  }
};

function GetStartNotificationCheckboxState(){//Get the stored state of the Start Notification checkbox
  if(store.get('StartNotification')==null){
    return false;  //default false
  } else {
    return store.get('StartNotification');
  }
};

function GetUsingWindowCheckboxState(){//Get the stored state of the Using Window checkbox
  if(store.get('UsingWindow')==null){
    return false;  //default false
  } else {
    return store.get('UsingWindow');
  }
};

function GetUsingFrameCheckboxState(){//Get the stored state of the Using Frame checkbox
  if(store.get('UsingFrame')==null){
    return false;  //default false
  } else {
    return store.get('UsingFrame');
  }
};
//END


//when App ready, call createWindow and build the Tray icon
app.whenReady().then(createWindow).then(StartNotification).then(() => {
  tray = new Tray(path.join(__dirname, '/../images/logo_transparent_white_512x512.png'));//why dosnt ../images/ work ...
  if(GetUsingWindowCheckboxState()){  
    contextMenu = Menu.buildFromTemplate([  //context Menu With Window
      { label: 'Show/Hide', click() {ShowHide()}},
      { label: 'Settings', id:'checkboxes', submenu: SettingsSubmenu()}, //settings submenu
      { label: 'QuitSeperator', type: 'separator'},
      { label: 'Reload', click() {SaveStates();win.webContents.send('disconnect');app.relaunch();app.exit()}},    //Reload after saving prefs and disconnect
      { label: 'Quit All', click () {SaveStates();app.quit()}}               //buttion to quit all
    ]);
  } else { //if no window should be opend
    SetSendMenu(); //build advanced TrayMenu
  }
  tray.setContextMenu(contextMenu); //setting contextMenu
  tray.setToolTip(GetToolTip()); //get the text shown when hovering over the TrayIcon
  var autolauncher = new AutoLaunch({ //create an auto launcher
    name: 'SnapdropTray'  //no path needs to be specyfied; https://github.com/Teamwork/node-auto-launch/issues/99 -> this is why productName='SnapdropTray' and not 'Snapdrop Tray'
  });
});
//END


//if all windows get closed, call QuitNotification
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    QuitNotification()
  }
})
//END


//save users Prefrences
function SaveStates(){
  store.set('AutoLaunch', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('auto').commandId].checked );
  store.set('QuitNotification', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('quit').commandId].checked );
  store.set('StartNotification', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('start').commandId].checked );
  store.set('UsingWindow', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('window').commandId].checked );
  store.set('UsingFrame', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('frame').commandId].checked );
  //en/disable autolauncher
  var autolauncher = new AutoLaunch({ //create an auto launcher
    name: 'SnapdropTray'  //no path needs to be specyfied; https://github.com/Teamwork/node-auto-launch/issues/99 -> this is why productName='SnapdropTray' and not 'Snapdrop Tray'
  });
  autolauncher.isEnabled().then(function(isEnabled){if(GetAutoLauncheckboxState()){if(!isEnabled){autolauncher.enable();};} else {if(isEnabled){autolauncher.disable();};};});
};
//END
