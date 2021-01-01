//Require
const { app, BrowserWindow, Notification, Menu, Tray, ipcMain, dialog } = require('electron'); //electron Modules
const Store = require('electron-store'); //storeing data in Electron
const fs = require('fs');//acessing local files (for sending files via TrayMenu)
const path = require('path');//getting filename from path //may be removed in the future to clean up code (if workaround found)
const mime = require('mime-types');//getting MIME-type from extention //may be removed in the future to clean up code (if workaround found)
//END


//global variables
var ClientName = 'The eaiest way to transfer data across devices';//as long as no name is set, display this
var ClearName = null           //Clientname without sentences, just the name //may be removed in the future to clean up code (if workaround found)
const store = new Store();    //for storeing data after app ic closed
var contextMenu = null;      //Menu of the Tray icon
var win = null;             //the \'Snapdrop\' window
let tray = null;           //the tray icon itself
var peers = [];           //Array of all current peers
var txt = null;          //The \'text input\' window
//END


//Listeners

//listener for sendName
ipcMain.on('sendName', (event, newClientName) => { //triggerd in ui.js ln.16
  ClientName = 'You are known as ' + newClientName;
  ClearName = newClientName;
  console.log(ClientName);//log ClientName
  SetSendMenu();// adds the name, then updates the Menu
});
//END


//listener for peerJoined
ipcMain.on('peerJoined', (event, peer) => { //triggerd in ui.js ln.32
  peers[peers.length] = {name: peer.name.displayName, id: peer.id};//adds name and id to peers
  console.log(peer.name.displayName + ' joined!')//log that peer joined
  SetSendMenu();//then updates the Menu
});

//listener for clearPeers
ipcMain.on('clearPeers', () => { //triggerd in ui.js ln.56
  peers = [];//clear all peers
  console.log('cleared peers')//log that peers cleared
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
  console.log('Peer \'' + peers[PeerPos].name + '\' left');//log that peer left
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
  win = new BrowserWindow({ //create a Browser Window
    width: 400,
    height: 800,
    x: 1525, //this works for my setup, function for allways correct position required
    y: 250,
    show: GetUsingWindowCheckboxState(), //get checkbox states
    frame: GetUsingFrameCheckboxState(),
    icon:'./images/logo_transparent_512x512.png', //set icon in Taskbar
    webPreferences: {
      nodeIntegration: true, // for ipcRenderer.send/on ...
      contextIsolation: false //this is a bad idea (according to: https://github.com/electron/electron/issues/23506) but 'true' causes:
      //Uncaught ReferenceError: require/Event is not defined at network.js & ui.js
      //not that bad, since index.html doesnt contain 'untrusted content'
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
    icon: './images/logo_transparent_512x512.png'
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
    icon: './images/logo_transparent_512x512.png'
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
    icon:'./images/logo_transparent_512x512.png',
    transparent: true, //doesnt work for linux, background will be square, not round
    backgroundColor: '#00121212', //since fully transparent isnt possible on linux (#00..) is shows up black --Find a way to determin client OS
    webPreferences: {
      nodeIntegration: true,// for ipcRenderer.send()
      contextIsolation: false// see line 89
    }
  });
  txt.loadFile('TextDialog.html');//load the .html
  ipcMain.on('textInput', (event, textGiven) => { //triggerd in TextDialog.html ln.78
    win.webContents.send('sendText', {text: textGiven, to: id}); //triggers network.js ln.385
    txt.destroy()//destroy the window
  });
};
//END


//function called to SendFilesTo ID 
function SendFilesTo (id, name){
  dialog.showOpenDialog({   //open dialog
    title: 'Select files for \'' + name + '\'',//set title for dialog 
    buttonLabel: 'Send', //cange open butten to 'Send'
    properties: ['openFile', 'multiSelections']  //with proerties
  }).then(result => {
    if(result.canceled){return;};//retun if user canceld the promp
    
    var dataSend = [];var nameSend = [];var typeSend = [];  //local variable reset
    for(let i = 0; i < result.filePaths.length; i++){ // loop though filepaths 
      dataSend[i] = fs.readFileSync(result.filePaths[i]); //read the file
      nameSend[i] = path.parse(result.filePaths[i]).base; //get filename
      typeSend[i] = mime.lookup(result.filePaths[i]); //get MIME-Type
      if(typeSend[i] == false){ //if no type was recognised
        typeSend[i] = 'application/octet-stream' //use 'binary' (no extention)
      }
    };

    win.webContents.send('sendFiles', { //triggers network.js ln.373
      to: id,
      files: [],
      data: dataSend,
      name: nameSend,
      type: typeSend 
    });
  });
};
//END


//function that returns the proper ToolTip string
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
    { label: 'Start Notification', sublabel: 'here', id: 'start', type: 'checkbox', checked: GetStartNotificationCheckboxState() },  //Settings via checkboxes
    { label: 'Quit Notification', id: 'quit', type: 'checkbox', checked: GetQuitNotificationCheckboxState() },
    { label: 'Using Window', id: 'window', type: 'checkbox', checked: GetUsingWindowCheckboxState() },
    { label: 'Using Frame', id: 'frame', type: 'checkbox', checked: GetUsingFrameCheckboxState() },
    { label: 'ApplySeperator', type: 'separator'},
    { label: 'Apply', click() {SaveStates();app.relaunch();app.exit()}} //relaunch to apply changes
  ];
  return submenu; //return the submenu
};
//END


//function to construct a new menu when called and nesessery
function SetSendMenu(){
  if(!GetUsingWindowCheckboxState()){ //Only if no window exists

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
      {label: 'Reload', click() {SaveStates();app.relaunch();app.exit()}},    //Reload after saving prefs
      { label: 'Quit All', click () {SaveStates();app.quit()}}, //buttion to quit all
    ]);
    tray.setToolTip(GetToolTip()); //get the text shown when hovering over the TrayIcon
    tray.setContextMenu(contextMenu); //setting contextMenu
  };//EndIf
};
//END


//Get CheckboxStartes
function GetQuitNotificationCheckboxState(){//Get the stored state of the Quit notofication checkbox
  if(store.get('QuitNotification')==null){
    return true;
  } else {
    return store.get('QuitNotification');
  }
};

function GetStartNotificationCheckboxState(){//Get the stored state of the Start Notification checkbox
  if(store.get('StartNotification')==null){
    return true;
  } else {
    return store.get('StartNotification');
  }
};

function GetUsingWindowCheckboxState(){//Get the stored state of the Using Window checkbox
  if(store.get('UsingWindow')==null){
    return true;
  } else {
    return store.get('UsingWindow');
  }
};

function GetUsingFrameCheckboxState(){//Get the stored state of the Using Frame checkbox
  if(store.get('UsingFrame')==null){
    return true;
  } else {
    return store.get('UsingFrame');
  }
};
//END


//when App ready, call createWindow and build the Tray icon
app.whenReady().then(createWindow).then(StartNotification).then(() => {
  tray = new Tray('./images/logo_transparent_white_512x512.png')
  if(GetUsingWindowCheckboxState()){  
    contextMenu = Menu.buildFromTemplate([  //context Menu With Window
      { label: 'Show/Hide', click() {ShowHide()}},
      { label: 'Settings', id:'checkboxes', submenu: SettingsSubmenu()}, //settings submenu
      { label: 'QuitSeperator', type: 'separator'},
      { label: 'Reload', click() {SaveStates();app.relaunch();app.exit()}},    //Reload after saving prefs
      { label: 'Quit All', click () {SaveStates();app.quit()}}               //buttion to quit all
    ]);
  } else { //if no window should be opend
    SetSendMenu(); //build advanced TrayMenu
  }
  tray.setToolTip(GetToolTip()); //get the text shown when hovering over the TrayIcon
  tray.setContextMenu(contextMenu); //setting contextMenu
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
  store.set('QuitNotification', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('quit').commandId].checked );
  store.set('StartNotification', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('start').commandId].checked );
  store.set('UsingWindow', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('window').commandId].checked );
  store.set('UsingFrame', contextMenu.commandsMap[contextMenu.getMenuItemById('checkboxes').commandId].submenu.commandsMap[contextMenu.getMenuItemById('frame').commandId].checked );
};
//END