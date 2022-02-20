const { app, dialog, shell, desktopCapturer, BrowserWindow } = require("@electron/remote")
const { qrcodeConverter, time, localization } = require("@levminer/lib")
const logger = require("@levminer/lib/logger/renderer")
const QrcodeDecoder = require("qrcode-decoder").default
const { ipcRenderer: ipc } = require("electron")
const path = require("path")
const fs = require("fs")
const { qrImport, qrCamera, qrScreen } = require(path.join(__dirname, "src", "js", "qr.js"))
const { gaImport, gaCamera } = require(path.join(__dirname, "src", "js", "ga.js"))

/**
 * Send error to main process
 */
window.onerror = (error) => {
	ipc.send("rendererError", { renderer: "import", error })
}

/**
 * Start logger
 */
logger.getWindow("import")

/**
 * Localization
 */
localization.localize("import")

const lang = localization.getLang()

/**
 * Check if running in development
 */
let dev = false

if (app.isPackaged === false) {
	dev = true
}

// Get current window
const currentWindow = BrowserWindow.getFocusedWindow()

/**
 * Get Authme folder path
 */
const folder_path = dev ? path.join(app.getPath("appData"), "Levminer", "Authme Dev") : path.join(app.getPath("appData"), "Levminer", "Authme")

/**
 * Read settings
 * @type {LibSettings}
 */
const settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

/**
 * Check for available webcam
 */
const checkWebcam = (callback) => {
	const md = navigator.mediaDevices
	if (!md || !md.enumerateDevices) return callback(false)
	md.enumerateDevices().then((devices) => {
		callback(devices.some((device) => device.kind === "videoinput"))
	})
}

/**
 * Links
 */
const qrLink = () => {
	shell.openExternal("https://docs.authme.levminer.com/#/import?id=import")
}

const gaLink = () => {
	shell.openExternal("https://docs.authme.levminer.com/#/import?id=advanced-import")
}

/**
 * Hide window
 */
const hide = () => {
	ipc.send("toggleImport")
}

/**
 * Build number
 */
const buildNumber = async () => {
	const info = await ipc.invoke("info")

	if (info.build_number.startsWith("alpha")) {
		document.querySelector(".build-content").textContent = `You are running an alpha version of Authme - Version ${info.authme_version} - Build ${info.build_number}`
		document.querySelector(".build").style.display = "block"
	} else if (info.build_number.startsWith("beta")) {
		document.querySelector(".build-content").textContent = `You are running a beta version of Authme - Version ${info.authme_version} - Build ${info.build_number}`
		document.querySelector(".build").style.display = "block"
	}
}

buildNumber()

/**
 * Show experimental import screen capture
 */
if (settings.experimental.screen_capture === true) {
	document.querySelector(".screenCapture").style.display = "block"
}
