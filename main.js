const {app, BrowserWindow, Menu, ipcMain, shell} = require('electron');
const path = require('path');
const os = require('os');
const resizeImg = require('resize-img');
const fs = require('fs');
const isMac = process.platform === 'darwin'; // To Check if the OS is MACOS
const isDev = process.env.NODE_ENV !== 'production';
let mainWindow;

//Create the Main Window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Resizer',
        width: isDev? 1000 : 500,
        height: 600,
        webPreferences:{
            contextIsolation: true,
            nodeIntegration: true,
            preload : path.join(__dirname, "preload.js")
        }
    });

    // Open Dev Tools if in DEV Env

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname,'./renderer/index.html'));
}

//Create About Window
function createAboutWindow(){
    const aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 300
    });

    aboutWindow.loadFile(path.join(__dirname,'./renderer/about.html'));
}

//APP is Ready
app.whenReady().then(() => {
    createMainWindow();

    //Implement menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    // Remove minaWindow from memory
    mainWindow.on('closed', () => (mainWindow = null));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows.length === 0){
            createMainWindow();
        }
    })
});

//MENU template
const menu = [
    ...(isMac ? [{
        label:app.name,
        submenu:[
            {
                label:'About',
                click: createAboutWindow
            }
        ]
    }] : []),

    {
        label: 'File',
        submenu:[{
            label:'Quit',
            click: () => app.quit(),
            accelerator : 'CmdOrCtrl+W'
        }]
        /*Another way to create above menu tab is replace everything with
            role:"fileMenu"
        */
    },
    ...(!isMac ? [{
        label:'Help',
        submenu: [{
            label:'About',
            click: createAboutWindow
        }]
    }] : [])
];

//Respond to ipcRenderer resize
ipcMain.on('image:resize',(e, options) => {
    options.dest = path.join(os.homedir(), 'imageresizer');
    resizeImage(options);
});

//Resize the image

async function resizeImage({imgPath, width, height, dest}){
    try {
        const newPath = await resizeImg(fs.readFileSync(imgPath),{
            width : +width,
            height : +height
        });

    //Create file name
    const filename = path.basename(imgPath);

    //Create dest folder if not exists
    if (!fs.existsSync(dest)){
        fs.mkdirSync(dest);
    }

    //Write file to destination
    fs.writeFileSync(path.join(dest, filename), newPath);

    //Send success to Renderer
    mainWindow.webContents.send('image:done');

    // Open dest folder
    shell.openPath(dest);

    }catch (error){
        console.log(error)
    }
}

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
})