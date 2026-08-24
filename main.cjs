const { app, BrowserWindow, Menu, globalShortcut } = require("electron");
const path = require("path");

// 🔗 Reemplazá esto por la URL real de tu deploy en Netlify.
const URL_APP = "https://torreantares.netlify.app";


function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    autoHideMenuBar: true, // oculta la barra de menú (Archivo/Editar/Ver...)
    frame: true, // true = queda el marco/título nativo de Windows, como una app normal.
                 // Poné false si querés que ni siquiera se vea la barra de título/minimizar/cerrar,
                 // aunque ahí tenés que armar tus propios botones de cerrar/minimizar en la web.
    backgroundColor: "#0d1117", // evita el flash blanco mientras carga
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      devTools: false, // 🔒 desactiva F12 / clic derecho > Inspeccionar de raíz
      contextIsolation: true,
      nodeIntegration: false, // la web no necesita acceso a Node, más seguro
      spellcheck: false,
    },
  });

  // Por las dudas: aunque devTools:false ya bloquea el panel, esto además
  // intercepta el atajo de teclado antes de que llegue a Chromium.
  ventana.webContents.on("before-input-event", (event, input) => {
    const esF12 = input.key === "F12";
    const esInspeccionar =
      input.control && input.shift && ["I", "J", "C"].includes(input.key.toUpperCase());
    const esVerCodigoFuente = input.control && input.key.toUpperCase() === "U";

    if (esF12 || esInspeccionar || esVerCodigoFuente) {
      event.preventDefault();
    }
  });

  // Bloquea el menú contextual (clic derecho) para que no aparezca
  // "Inspeccionar elemento" ahí tampoco.
  ventana.webContents.on("context-menu", (event) => {
    event.preventDefault();
  });

  // Sin menú de aplicación (el que normalmente tiene Archivo/Editar/Ver/Ayuda).
  Menu.setApplicationMenu(null);

  ventana.loadURL(URL_APP);

  // Si el usuario intenta abrir un link con target="_blank" (por ejemplo un
  // <a href> externo), lo mandamos al navegador normal en vez de abrir una
  // segunda ventana de Electron sin restricciones.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  crearVentana();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});