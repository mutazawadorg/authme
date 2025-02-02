const { Menu, getCurrentWindow, app } = require("@electron/remote")
const Titlebar = require("@6c65726f79/custom-titlebar")
const { ipcRenderer: ipc } = require("electron")

/**
 * Prevent default shortcuts
 * @param {KeyboardEvent} event
 */
document.addEventListener("keydown", (event) => {
	if (event.ctrlKey && event.code === "KeyA" && event.target.type !== "text" && event.target.type !== "number" && event.target.type !== "textarea" && event.target.type !== "password") {
		event.preventDefault()
	}

	if (event.altKey && event.code === "F4") {
		ipc.invoke("saveWindowPosition")

		app.exit()
	}
})

/**
 * Prevent drag and drop
 */
document.addEventListener("dragover", (event) => event.preventDefault())
document.addEventListener("drop", (event) => event.preventDefault())

/**
 * Title bar
 */
const current_window = getCurrentWindow()
let titlebar
let loaded = false

if (process.platform === "win32") {
	current_window.webContents.once("dom-ready", () => {
		titlebar = new Titlebar({
			menu: Menu.getApplicationMenu(),
			browserWindow: current_window,
			backgroundColor: "#000000",
			icon: "../../img/icon.png",
			unfocusEffect: false,
		})

		loaded = true
	})
}

/**
 * Refresh title bar
 */
ipc.on("refreshMenu", () => {
	if (loaded === true) {
		titlebar.updateOptions({ menu: Menu.getApplicationMenu() })
	}
})
