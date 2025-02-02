const { app, BrowserWindow, Menu, Tray, shell, dialog, clipboard, globalShortcut, nativeTheme, ipcMain: ipc, powerMonitor: power } = require("electron")
const { en, hu } = require("@levminer/languages")
const logger = require("@levminer/lib/logger/main")
const { autoUpdater } = require("electron-updater")
const { number, date } = require("./build.json")
const remote = require("@electron/remote/main")
const axios = require("axios").default
const path = require("path")
const fs = require("fs")
const os = require("os")

/**
 * Catch crash
 */
process.on("uncaughtException", async (error) => {
	const { stack } = require("@levminer/lib")

	logger.error("Error on load", stack.clean(error.stack))

	if (app.isPackaged === true) {
		dialog.showErrorBox("Authme", `Authme crashed while starting, crash report sent. \n\nPlease restart Authme, if you want report this open a GitHub Issue with a screenshot of this error (https://github.com/Levminer/authme/issues). \n\n${stack.clean(error.stack)}`)

		try {
			await axios.post("https://analytics.levminer.com/api/v1/authme/analytics/post", {
				type: "load_crash",
				version: app.getVersion(),
				build: number,
				os: `${os.type()} ${os.arch()} ${os.release()}`,
				stack: stack.clean(error.stack),
				lang: app.getLocaleCountryCode(),
				date: new Date(),
			})
		} catch (error) {
			logger.error("Failed to send crash report", error)
		}
	}

	process.crash()
})

/**
 * Windows
 */
let /** @type{BrowserWindow} */ window_security
let /** @type{BrowserWindow} */ window_codes
let /** @type{BrowserWindow} */ window_settings
let /** @type{BrowserWindow} */ window_tools

/**
 * Window states
 */
let landing_shown = false
let confirm_shown = false
let codes_shown = false
let settings_shown = false
let tools_shown = false

/**
 * Other states
 */
let authenticated = false
let shortcuts = false
let update_seen = false
let manual_update = false
let /** @type{Buffer} */ password_buffer = null
let /** @type{Tray} */ tray = null
let /** @type{Menu} */ menu = null
let lang = en

/**
 * Check if running in development mode
 */
let dev = false

if (app.isPackaged === false) {
	const debug = require("electron-debug")

	debug({
		showDevTools: false,
	})

	dev = true
}

/**
 * Get platform
 */
let platform

if (process.platform === "win32") {
	platform = "windows"
} else if (process.platform === "darwin") {
	platform = "mac"
} else {
	platform = "linux"
}

/**
 * Initialize remote module
 */
remote.initialize()

/**
 * Check for folders
 */
const full_path = path.join(app.getPath("appData"), "Levminer")
const folder_path = dev ? path.join(app.getPath("appData"), "Levminer", "Authme Dev") : path.join(app.getPath("appData"), "Levminer", "Authme")

// Check if /Levminer path exists
if (!fs.existsSync(full_path)) {
	fs.mkdirSync(full_path)
}

// Check if /Authme path exists
if (!fs.existsSync(folder_path)) {
	fs.mkdirSync(folder_path)
}

// Check if codes folder exists
if (!fs.existsSync(path.join(folder_path, "codes"))) {
	fs.mkdirSync(path.join(folder_path, "codes"))
}

// Check settings folder exists
if (!fs.existsSync(path.join(folder_path, "settings"))) {
	fs.mkdirSync(path.join(folder_path, "settings"))
}

// Check logs folder exists
if (!fs.existsSync(path.join(folder_path, "logs"))) {
	fs.mkdirSync(path.join(folder_path, "logs"))
}

// Check rollbacks folder exists
if (!fs.existsSync(path.join(folder_path, "rollbacks"))) {
	fs.mkdirSync(path.join(folder_path, "rollbacks"))
}

/**
 * Version and logging
 */
const authme_version = app.getVersion()
const release_date = date
const build_number = number

// Send Authme info to renderer
ipc.handle("info", () => {
	return { authme_version, release_date, build_number }
})

const chrome_version = process.versions.chrome
const electron_version = process.versions.electron
const args = process.argv

const os_version = `${os.type()} ${os.arch()} ${os.release()}`
const os_info = `${os.cpus()[0].model.split("@")[0]} ${Math.ceil(os.totalmem() / 1024 / 1024 / 1024)}GB RAM`
	.replaceAll("(R)", "")
	.replaceAll("(TM)", "")
	.replace(/ +(?= )/g, "")

// Logging
logger.createFile(folder_path, "authme")
logger.log(`Authme ${authme_version} ${build_number}`)
logger.log(`System ${os_version}`)
logger.log(`Hardware ${os_info}`)

/**
 * Only allow single Authme instance
 */
if (dev === false) {
	const lock = app.requestSingleInstanceLock()

	if (lock === false) {
		logger.log("Already running, shutting down")

		app.exit()
	} else {
		app.on("second-instance", () => {
			logger.log("Already running, focusing window")

			if (settings.window.maximized === true) {
				window_codes.maximize()
			}

			window_codes.show()
		})
	}
}

/**
 * Settings
 * @type{LibSettings}
 */
const settings_file = {
	info: {
		version: `${authme_version}`,
		build: `${build_number}`,
		date: `${release_date}`,
	},
	settings: {
		launch_on_startup: true,
		close_to_tray: true,
		codes_description: false,
		reset_after_copy: false,
		search_history: true,
		hardware_acceleration: false,
		search_filter: {
			name: true,
			description: false,
		},
		language: null,
		sort: null,
		analytics: true,
		integrations: true,
	},
	security: {
		require_password: null,
		password: null,
		key: null,
	},
	shortcuts: {
		show: "CmdOrCtrl+q",
		settings: "CmdOrCtrl+s",
		exit: "CmdOrCtrl+w",
		zoom_reset: "CmdOrCtrl+0",
		zoom_in: "CmdOrCtrl+1",
		zoom_out: "CmdOrCtrl+2",
		edit: "CmdOrCtrl+t",
		import: "CmdOrCtrl+i",
		export: "CmdOrCtrl+e",
		release: "CmdOrCtrl+n",
		support: "CmdOrCtrl+p",
		docs: "CmdOrCtrl+d",
		licenses: "CmdOrCtrl+l",
		update: "CmdOrCtrl+u",
		info: "CmdOrCtrl+o",
	},
	global_shortcuts: {
		show: "CmdOrCtrl+Shift+a",
		settings: "CmdOrCtrl+Shift+s",
		exit: "CmdOrCtrl+Shift+d",
	},
	search_history: {
		latest: null,
	},
	statistics: {
		opens: 0,
		rated: null,
		feedback: null,
	},
	window: {
		x: 0,
		y: 0,
		height: 1900,
		width: 1000,
		maximized: true,
	},
}

// Create settings if not exists
if (!fs.existsSync(path.join(folder_path, "settings", "settings.json"))) {
	fs.writeFileSync(path.join(folder_path, "settings", "settings.json"), JSON.stringify(settings_file, null, "\t"))
}

// Save settings
const saveSettings = () => {
	fs.writeFileSync(path.join(folder_path, "settings", "settings.json"), JSON.stringify(settings, null, "\t"))
}

/**
 * Read settings
 * @type {LibSettings}
 */
let settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

/**
 * Settings compatibility check
 */
if (settings.settings.language === undefined) {
	settings.settings.language = null

	saveSettings()
}

if (settings.settings.sort === undefined) {
	settings.settings.sort = null

	saveSettings()
}

if (settings.window === undefined) {
	settings.window = {
		x: 0,
		y: 0,
		height: 1900,
		width: 1000,
		maximized: true,
	}

	saveSettings()
}

if (settings.window.maximized === undefined) {
	settings.window.maximized = true

	saveSettings()
}

if (settings.settings.analytics === undefined) {
	settings.settings.analytics = true

	saveSettings()
}

if (settings.settings.integrations === undefined) {
	settings.settings.integrations = false

	saveSettings()
}

/**
 * Force dark mode
 */
nativeTheme.themeSource = "dark"

/**
 * Disable hardware acceleration if turned off
 */
if (settings.settings.hardware_acceleration === false) {
	app.disableHardwareAcceleration()
}

/**
 * Show application window from tray
 */
const showAppFromTray = () => {
	const toggle = () => {
		if (codes_shown === false) {
			if (settings.window.maximized === true) {
				window_codes.maximize()
			}

			window_codes.show()

			codes_shown = true

			logger.log("App shown from tray")
		} else {
			window_codes.hide()
			window_settings.hide()
			window_tools.hide()

			codes_shown = false
			settings_shown = false
			tools_shown = false

			logger.log("App hidden from tray")
		}
	}

	if (settings.security.require_password === true && authenticated === true) {
		toggle()
	} else if (settings.security.require_password === false) {
		toggle()
	} else if (settings.security.require_password === true) {
		if (confirm_shown === false) {
			window_security.maximize()
			window_security.show()

			confirm_shown = true
			codes_shown = true
		} else {
			window_security.hide()

			confirm_shown = false
			codes_shown = false
		}
	}

	createTray()
	createMenu()
}

/**
 * Show settings window from tray
 */
const settingsFromTray = () => {
	const toggle = () => {
		if (settings_shown === false) {
			window_settings.maximize()
			window_settings.show()

			settings_shown = true

			logger.log("Settings shown from tray")
		} else {
			window_settings.hide()

			settings_shown = false

			logger.log("Settings hidden from tray")
		}
	}

	if (settings.security.require_password === true && authenticated === true) {
		toggle()
	} else if (settings.security.require_password === false) {
		toggle()
	}
}

/**
 * Exit app from tray
 */
const exitFromTray = () => {
	saveWindowPosition()

	try {
		password_buffer.fill(0)
	} catch (error) {}

	app.exit()

	logger.log("App exited from tray")
}

/**
 * Save window position
 */
const saveWindowPosition = () => {
	const window_position = settings.window
	settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))
	settings.window = window_position

	saveSettings()
}

const crashReport = async (crash_type, error) => {
	if (dev === false) {
		try {
			await axios.post("https://analytics.levminer.com/api/v1/authme/analytics/post", {
				type: crash_type,
				version: authme_version,
				build: build_number,
				os: os_version,
				hardware: os_info,
				stack: error,
				lang: app.getLocaleCountryCode(),
				options: JSON.stringify(settings),
				date: new Date(),
			})
		} catch (error) {
			logger.error(error)
		}
	}
}

/**
 * Create application windows
 */
const createWindows = () => {
	/* Set language */
	lang = en
	let locale = "en"

	if (settings.settings.language !== null) {
		locale = settings.settings.language
	} else {
		locale = app.getLocale().slice(0, 2).toLowerCase()
	}

	switch (locale) {
		case "en":
			lang = en
			break

		case "hu":
			lang = hu
			break

		default:
			lang = en
			break
	}

	/**
	 * Window Controls Overlay
	 */
	let wco = false

	if (platform === "windows") {
		wco = true
	}

	/**
	 * Set window bounds
	 */
	const positionWindow = () => {
		settings.window = window_codes.getBounds()
		settings.window.maximized = window_codes.isMaximized()

		window_settings.setBounds(settings.window)
		window_tools.setBounds(settings.window)
	}

	/**
	 * Create windows
	 */
	window_security = new BrowserWindow({
		title: `Authme (${authme_version})`,
		icon: path.join(__dirname, "img/icon.png"),
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		titleBarStyle: wco ? "hidden" : null,
		titleBarOverlay: wco
			? {
					color: "black",
					symbolColor: "white",
			  }
			: null,
		backgroundColor: "#0A0A0A",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false,
		},
	})

	window_codes = new BrowserWindow({
		title: `Authme (${authme_version})`,
		icon: path.join(__dirname, "img/icon.png"),
		x: settings.window.x,
		y: settings.window.y,
		width: settings.window.width,
		height: settings.window.height,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		titleBarStyle: wco ? "hidden" : null,
		titleBarOverlay: wco
			? {
					color: "black",
					symbolColor: "white",
			  }
			: null,
		backgroundColor: "#0A0A0A",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false,
		},
	})

	window_settings = new BrowserWindow({
		title: "Authme (Settings)",
		icon: path.join(__dirname, "img/icon.png"),
		x: settings.window.x,
		y: settings.window.y,
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		titleBarStyle: wco ? "hidden" : null,
		titleBarOverlay: wco
			? {
					color: "black",
					symbolColor: "white",
			  }
			: null,
		backgroundColor: "#0A0A0A",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false,
		},
	})

	window_tools = new BrowserWindow({
		title: "Authme (Import)",
		x: settings.window.x,
		y: settings.window.y,
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		titleBarStyle: wco ? "hidden" : null,
		titleBarOverlay: wco
			? {
					color: "black",
					symbolColor: "white",
			  }
			: null,
		backgroundColor: "#0A0A0A",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			contextIsolation: false,
		},
	})

	/**
	 * Window moved
	 */
	window_codes.on("move", () => {
		positionWindow()
	})

	window_codes.on("resized", () => {
		positionWindow()
	})

	window_codes.on("maximize", () => {
		positionWindow()
	})

	// Enable remote module
	remote.enable(window_security.webContents)
	remote.enable(window_codes.webContents)
	remote.enable(window_settings.webContents)
	remote.enable(window_tools.webContents)

	// Load window files
	window_codes.loadFile("./app/codes/index.html")
	window_settings.loadFile("./app/settings/index.html")
	window_tools.loadFile("./app/import/index.html")

	if (settings.security.require_password === null) {
		window_security.loadFile("./app/landing/index.html")
	} else if (settings.security.require_password === true) {
		window_security.loadFile("./app/confirm/index.html")
	} else {
		window_security.close()
	}

	/**
	 * Window states
	 */
	window_security.on("close", () => {
		app.exit()

		logger.log("Application exited from security window")
	})

	window_codes.on("close", (event) => {
		saveWindowPosition()

		if (dev === true) {
			app.exit()
		} else {
			if (settings.settings.close_to_tray === false) {
				try {
					password_buffer.fill(0)
				} catch (error) {}

				app.quit()

				logger.log("Application exited from application window")
			} else {
				event.preventDefault()
				window_codes.hide()

				codes_shown = false

				createTray()
				createMenu()
			}
		}

		logger.log("Application window closed")
	})

	window_settings.on("close", (event) => {
		event.preventDefault()
		window_settings.hide()
		window_codes.focus()

		settings_shown = false

		logger.log("Settings window closed")
	})

	window_tools.on("close", (event) => {
		event.preventDefault()
		window_tools.hide()
		window_codes.focus()

		tools_shown = false

		logger.log("Tools window closed")
	})

	/**
	 * Disables window capture by default
	 */
	window_security.setContentProtection(true)
	window_codes.setContentProtection(true)
	window_settings.setContentProtection(true)
	window_tools.setContentProtection(true)

	/**
	 * Event when application window opens
	 */
	window_codes.on("show", () => {
		const api = () => {
			axios
				.get("https://api.levminer.com/api/v1/authme/releases")
				.then((res) => {
					if (res.data.tag_name > authme_version && res.data.tag_name != undefined && res.data.prerelease != true) {
						window_codes.webContents.executeJavaScript("showUpdate()")

						logger.log("Manual update found!")
					} else {
						logger.log("No manual update found!")
					}
				})
				.catch((error) => {
					logger.error("Error during manual update", error.stack)
				})
		}

		// Check for manual update
		if (update_seen == false && platform !== "windows") {
			api()

			update_seen = true
		}
	})

	/**
	 * Show animations and focus searchbar on windows focus
	 */
	window_codes.on("focus", () => {
		window_codes.webContents.executeJavaScript("focusSearch()")
	})

	/**
	 * Auto update on Windows
	 */
	if (dev === false && platform === "windows") {
		axios
			.get("https://api.levminer.com/api/v1/authme/releases")
			.then((res) => {
				if (res.data.tag_name > authme_version && res.data.tag_name != undefined) {
					autoUpdater.checkForUpdates()
				} else {
					logger.log("No auto update found")
				}
			})
			.catch((error) => {
				logger.error("Error getting response from API (Auto update)", error.stack)

				autoUpdater.checkForUpdates()
			})
	}

	autoUpdater.on("checking-for-update", () => {
		logger.log("Checking for auto update")
	})

	autoUpdater.on("update-available", () => {
		logger.log("Auto update available")

		window_codes.webContents.executeJavaScript("updateAvailable()")
	})

	autoUpdater.on("update-not-available", () => {
		logger.log("Auto update not available")

		if (manual_update === true) {
			dialog.showMessageBox({
				title: "Authme",
				buttons: [lang.button.close],
				defaultId: 0,
				cancelId: 1,
				noLink: true,
				type: "info",
				message: `${lang.dialog.no_update_available} ${authme_version}`,
			})

			manual_update = false
		}
	})

	autoUpdater.on("update-downloaded", () => {
		logger.log("Update downloaded")

		window_codes.webContents.executeJavaScript("updateDownloaded()")
	})

	autoUpdater.on("error", (error) => {
		logger.error("Error during auto update", error.stack)

		if (manual_update === true) {
			dialog.showMessageBox({
				title: "Authme",
				buttons: [lang.button.close],
				defaultId: 0,
				cancelId: 1,
				noLink: true,
				type: "error",
				message: `${lang.dialog.update_error} \n\n${error.stack}`,
			})
		}
	})

	autoUpdater.on("download-progress", (progress) => {
		const download_percent = Math.trunc(progress.percent)
		const download_speed = (Math.round((progress.bytesPerSecond / 1000000) * 10) / 10).toFixed(1)
		const download_transferred = Math.trunc(progress.transferred / 1000000)
		const download_total = Math.trunc(progress.total / 1000000)

		logger.log(`Downloading update: ${download_percent}% - ${download_speed}MB/s (${download_transferred}MB/${download_total}MB)`)

		window_codes.webContents.send("updateInfo", {
			download_percent,
			download_speed,
			download_transferred,
			download_total,
		})
	})

	ipc.on("updateRestart", () => {
		autoUpdater.quitAndInstall(true, true)
	})

	/**
	 * Create global shortcuts
	 */
	try {
		if (settings.global_shortcuts.show !== "None") {
			globalShortcut.register(settings.global_shortcuts.show, () => {
				showAppFromTray()
			})
		}

		if (settings.global_shortcuts.settings !== "None") {
			globalShortcut.register(settings.global_shortcuts.settings, () => {
				settingsFromTray()
			})
		}

		if (settings.global_shortcuts.exit !== "None") {
			globalShortcut.register(settings.global_shortcuts.exit, () => {
				exitFromTray()
			})
		}
	} catch (error) {
		logger.error("Failed to create global shortcuts!")
	}

	/**
	 * Local statistics
	 */
	let opens = settings.statistics.opens
	opens++
	settings.statistics.opens = opens

	saveSettings()

	const openInfo = () => {
		window_codes.on("show", () => {
			window_codes.webContents.executeJavaScript("showInfo()")
		})
	}

	if (settings.statistics.rated === true && settings.statistics.feedback === true) {
		if (opens > 100) {
			openInfo()
		}
	} else if (settings.statistics.rated === true || settings.statistics.feedback === true) {
		if (opens > 50) {
			openInfo()
		}
	} else {
		if (opens > 15) {
			openInfo()
		}
	}
}

/**
 * Start Authme when the app is ready
 */
app.whenReady()
	.then(() => {
		logger.log("App starting")

		// Set application Id
		if (dev === false) {
			app.setAppUserModelId("Authme")
		}

		// Create windows
		createWindows()

		/**
		 * Create tray and menu
		 */
		const icon_path = path.join(__dirname, "img/tray.png")
		tray = new Tray(icon_path)

		tray.on("click", () => {
			showAppFromTray()
			createTray()
			createMenu()
		})

		createTray()
		createMenu()

		/**
		 * App controller
		 */
		if (settings.security.require_password === null) {
			window_security.on("ready-to-show", () => {
				if (authenticated === false) {
					if (landing_shown === false) {
						setTimeout(() => {
							window_security.maximize()
							window_security.show()
						}, 100)

						landing_shown = true
					}

					logger.warn("First start")

					if (dev === false) {
						authme_launcher.enable()
					}
				}
			})
		}

		if (settings.security.require_password === true) {
			window_security.on("ready-to-show", () => {
				if (authenticated === false) {
					settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

					setTimeout(() => {
						if (args[1] !== "--hidden") {
							window_security.maximize()
							window_security.show()

							confirm_shown = true
						}
					}, 100)
				}
			})
		}

		if (settings.security.require_password === false) {
			window_codes.on("ready-to-show", () => {
				if (authenticated === false) {
					settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

					setTimeout(() => {
						if (args[1] !== "--hidden") {
							if (settings.window.maximized === true) {
								window_codes.maximize()
							}

							window_codes.show()

							codes_shown = true
						}

						authenticated = true

						createTray()
						createMenu()
					}, 100)
				}
			})
		}

		// Optional analytics
		if (settings.settings.analytics === true && dev === false) {
			try {
				axios.post("https://analytics.levminer.com/api/v1/authme/analytics/post", { version: authme_version, build: build_number, os: os_version, lang: app.getLocaleCountryCode(), date: new Date() })
			} catch (error) {
				logger.error("Failed to post analytics", error)
			}
		}

		logger.log("App finished loading")
	})
	.catch((error) => {
		logger.error("Error occurred while ready event", error.stack)

		crashReport("start_crash", error.stack)

		dialog
			.showMessageBox({
				title: "Authme",
				buttons: [lang.button.report, lang.button.close, lang.button.exit],
				defaultId: 0,
				cancelId: 1,
				noLink: true,
				type: "error",
				message: `${lang.dialog.error} \n\n${error.stack}`,
			})
			.then((result) => {
				if (result.response === 0) {
					shell.openExternal("https://github.com/Levminer/authme/issues/")
				} else if (result.response === 2) {
					app.exit()
				}
			})
	})

/**
 * Auto launch Authme on system start
 */
const AutoLaunch = require("auto-launch")

const authme_launcher = new AutoLaunch({
	name: "Authme",
	path: app.getPath("exe"),
	isHidden: true,
})

/**
 * Application context menu
 */
const contextmenu = require("electron-context-menu")

contextmenu({
	menu: (actions) => [
		actions.separator(),
		{
			label: "Dev Tools",
			click: () => {
				const window = BrowserWindow.getFocusedWindow()

				window.webContents.toggleDevTools()
			},
			visible: dev === true,
		},
		actions.separator(),
		{
			label: "Reload",
			click: () => {
				const window = BrowserWindow.getFocusedWindow()

				window.webContents.reload()
			},
			visible: dev === true,
		},
		actions.separator(),
		actions.copy({
			transform: (content) => content,
		}),
		actions.separator(),
		actions.paste({
			transform: (content) => content,
		}),
		actions.separator(),
		actions.copyLink({
			transform: (content) => content,
		}),
		actions.separator(),
	],
})

/**
 * Navigate to confirm
 */
ipc.on("toConfirm", () => {
	if (authenticated === false) {
		settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

		window_security.loadFile("./app/confirm/index.html")
	}
})

/**
 * Navigate to application from confirm
 */
ipc.on("toApplicationFromConfirm", () => {
	if (authenticated === false) {
		settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

		if (settings.window.maximized === true) {
			window_codes.maximize()
		}

		window_codes.show()

		setTimeout(() => {
			window_security.hide()
		}, 100)

		authenticated = true

		createTray()
		createMenu()
	}
})

/**
 * Navigate to confirm from landing
 */
ipc.on("toApplicationFromLanding", () => {
	if (authenticated === false) {
		settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

		window_codes.maximize()
		window_codes.show()

		setTimeout(() => {
			window_security.hide()
		}, 100)

		authenticated = true

		createTray()
		createMenu()
	}
})

/**
 * Show/Hide settings
 */
ipc.on("toggleSettings", () => {
	if (settings_shown == false) {
		window_settings.maximize()
		window_settings.show()
		settings_shown = true

		logger.log("Settings shown")
	} else {
		window_settings.hide()
		settings_shown = false

		logger.log("Settings hidden")
	}
})

/**
 * Show/Hide tools window
 */
ipc.handle("toggleToolsWindow", () => {
	if (tools_shown == false) {
		window_tools.maximize()
		window_tools.show()
		tools_shown = true

		logger.log("Tools shown")
	} else {
		window_tools.hide()
		tools_shown = false

		logger.log("Tools hidden")
	}
})

/**
 * Show import page
 */
ipc.handle("toggleImportWindow", () => {
	if (window_tools.getTitle() !== "Authme (Import)") {
		window_tools.loadFile("./app/import/index.html")
		window_tools.setTitle("Authme (Import)")
	}

	window_tools.maximize()
	window_tools.show()

	tools_shown = true

	logger.log("Import window shown/restored")
})

/**
 * Disable launch on startup
 */
ipc.on("disableStartup", () => {
	authme_launcher.disable()

	logger.log("Startup disabled")
})

/**
 * Enable launch on startup
 */
ipc.on("enableStartup", () => {
	authme_launcher.enable()

	logger.log("Startup enabled")
})

/**
 * Disables screen capture until restart
 */
ipc.on("disableWindowCapture", () => {
	try {
		window_security.setContentProtection(true)
	} catch (error) {}

	window_codes.setContentProtection(true)
	window_settings.setContentProtection(true)
	window_tools.setContentProtection(true)

	if (authenticated === false) {
		window_settings.webContents.executeJavaScript("toggleWindowCaptureSwitch()")
	}

	logger.log("Screen capture disabled")
})

/**
 * Enables screen capture until restart
 */
ipc.on("enableWindowCapture", () => {
	try {
		window_security.setContentProtection(false)
	} catch (error) {}

	window_codes.setContentProtection(false)
	window_settings.setContentProtection(false)
	window_tools.setContentProtection(false)

	if (authenticated === false) {
		window_settings.webContents.executeJavaScript("toggleWindowCaptureSwitch()")
	}

	logger.log("Screen capture enabled")
})

/**
 * Set logs path
 */
ipc.on("logs", () => {
	logs()
})

/**
 * Show about dialog
 */
ipc.on("about", () => {
	version()
})

/**
 * Display release notes
 */
ipc.on("releaseNotes", () => {
	releaseNotes()
})

/**
 * Show support Authme dialog
 */
ipc.on("support", () => {
	support()
})

/**
 * Open Microsoft Store link
 */
ipc.on("rateAuthme", () => {
	shell.openExternal("ms-windows-store://review/?ProductId=XP9M33RJSVD6JR")

	settings.statistics.opens = 0
	settings.statistics.rated = true

	saveSettings()
})

/**
 * Open GitHub link
 */
ipc.on("starAuthme", () => {
	shell.openExternal("https://github.com/Levminer/authme/")

	settings.statistics.opens = 0

	saveSettings()
})

/**
 * Show provide feedback dialog
 */
ipc.on("provideFeedback", () => {
	feedback()

	settings.statistics.feedback = true

	saveSettings()
})

/**
 * Receive password from confirm page
 */
ipc.handle("sendPassword", (event, data) => {
	password_buffer = Buffer.from(data)

	window_codes.webContents.executeJavaScript("loadCodes()")
})

/**
 * Send password to requesting page
 */
ipc.handle("requestPassword", () => {
	return password_buffer
})

/**
 * Reload application window
 */
ipc.on("reloadApplicationWindow", () => {
	window_codes.reload()

	if (settings.security.require_password === true) {
		window_codes.webContents.executeJavaScript("loadCodes()")
	}
})

/**
 * Reload settings window
 */
ipc.on("reloadSettingsWindow", () => {
	window_settings.reload()
})

/**
 * Reload export window
 */
ipc.on("reloadExportWindow", () => {
	window_tools.reload()
})

/**
 * Receive error from renderer
 */
ipc.handle("rendererError", async (event, data) => {
	logger.error(`Error in ${data.renderer}`, data.error)

	if (dev === false) {
		const result = await dialog.showMessageBox({
			title: "Authme",
			buttons: [lang.button.report, lang.button.close, lang.button.restart],
			defaultId: 0,
			cancelId: 1,
			noLink: true,
			type: "error",
			message: `${lang.dialog.error} \n\n${data.error}`,
		})

		crashReport("renderer_crash", `Error in ${data.renderer}: ${data.error}`)

		if (result.response === 0) {
			shell.openExternal("https://github.com/Levminer/authme/issues/")
		} else if (result.response === 2) {
			app.relaunch()
			app.exit()
		}
	}
})

/**
 * Logger events
 */
ipc.on("loggerLog", (event, data) => {
	logger.rendererLog(data.window, data.message, data.arg)
})

ipc.on("loggerWarn", (event, data) => {
	logger.rendererWarn(data.window, data.message, data.arg)
})

ipc.on("loggerError", (event, data) => {
	logger.rendererError(data.window, data.message, data.arg)
})

/**
 * Send lang code
 */
ipc.on("languageCode", (event) => {
	event.returnValue = { language: lang.locale.code }
})

/**
 * Send statistics
 */
ipc.handle("statistics", () => {
	return settings.statistics
})

/**
 * Receive imported codes and send to application
 */
ipc.handle("importCodes", (event, codes) => {
	window_codes.webContents.executeJavaScript("location.reload()")

	setTimeout(() => {
		window_codes.webContents.executeJavaScript(`importCodes("${codes}")`)
	}, 150)
})

/**
 * Receive imported codes and send to application
 */
ipc.handle("importExistingCodes", (event, codes) => {
	window_codes.webContents.executeJavaScript("location.reload()")

	setTimeout(() => {
		window_codes.webContents.executeJavaScript(`importExistingCodes("${codes}")`)
	}, 150)
})

/**
 * Save window position
 */
ipc.handle("saveWindowPosition", () => {
	saveWindowPosition()
})

/**
 * Return desktop capture sources
 */
ipc.handle("captureSources", async () => {
	const { desktopCapturer } = require("electron")

	return await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { height: 1280, width: 720 } })
})

/**
 * Logger path
 */
const logs = () => {
	const log_path = logger.fileName()

	shell.openPath(path.join(folder_path, "logs", log_path))
}

/**
 * About dialog
 */
const version = () => {
	const text = `Authme: ${authme_version} \n\nElectron: ${electron_version}\nChrome: ${chrome_version} \n\nOS version: ${os_version}\nHardware info: ${os_info} \n\nRelease date: ${release_date}\nBuild number: ${build_number} \n\nCreated by: Lőrik Levente\n`

	shell.beep()

	dialog
		.showMessageBox({
			title: "Authme",
			buttons: [lang.button.copy, lang.button.close],
			defaultId: 1,
			cancelId: 1,
			noLink: true,
			type: "info",
			message: text,
			icon: path.join(__dirname, "img/tray.png"),
		})
		.then((result) => {
			if (result.response === 0) {
				clipboard.writeText(text)
			}
		})
}

/**
 * Release notes dialog
 */
const releaseNotes = () => {
	const { markdown } = require("@levminer/lib")

	axios
		.get("https://api.levminer.com/api/v1/authme/releases")
		.then((res) => {
			dialog
				.showMessageBox({
					title: "Authme",
					buttons: [lang.button.more, lang.button.close],
					defaultId: 1,
					cancelId: 1,
					noLink: true,
					type: "info",
					message: markdown.convert(res.data.body).split("Other")[0],
				})
				.then((result) => {
					if (result.response === 0) {
						shell.openExternal("https://github.com/Levminer/authme/releases")
					}
				})
		})
		.catch((error) => {
			dialog.showErrorBox("Authme", "Error getting release notes. \n\nTry again later!")

			logger.error("Error getting release notes", error.stack)
		})
}

/**
 * Support dialog
 */
const support = () => {
	dialog
		.showMessageBox({
			title: "Authme",
			buttons: ["PayPal", lang.button.close],
			defaultId: 1,
			cancelId: 1,
			noLink: true,
			type: "info",
			message: lang.dialog.support,
		})
		.then((result) => {
			if (result.response === 0) {
				shell.openExternal("https://paypal.me/levminer")
			}
		})
}

/**
 * Open feedback dialog
 */
const feedback = () => {
	dialog
		.showMessageBox({
			title: "Authme",
			buttons: ["GitHub", "Email", lang.button.close],
			defaultId: 2,
			cancelId: 2,
			noLink: true,
			type: "info",
			message: lang.dialog.feedback,
		})
		.then((result) => {
			if (result.response === 0) {
				shell.openExternal("https://github.com/Levminer/authme/issues")
			} else if (result.response === 1) {
				shell.openExternal("mailto:authme@levminer.com?subject=Authme feedback")
			}
		})
}

/**
 * Lock Authme when PC goes to sleep or locked
 */
power.on("lock-screen", () => {
	if (settings.security.require_password === true) {
		window_codes.hide()
		window_settings.hide()
		window_tools.hide()

		codes_shown = false
		settings_shown = false
		tools_shown = false

		authenticated = false

		createTray()
		createMenu()

		logger.log("Authme locked by sleep")
	}
})

/**
 * Create tray menu
 */
const createTray = () => {
	const contextmenu = Menu.buildFromTemplate([
		{
			label: codes_shown ? lang.tray.hide_app : lang.tray.show_app,
			accelerator: shortcuts ? "" : settings.global_shortcuts.show,
			click: () => {
				showAppFromTray()
				createTray()
				createMenu()
			},
		},
		{ type: "separator" },
		{
			label: lang.tray.settings,
			enabled: authenticated,
			accelerator: shortcuts ? "" : settings.global_shortcuts.settings,
			click: () => {
				settingsFromTray()
			},
		},
		{ type: "separator" },
		{
			label: lang.tray.exit_app,
			accelerator: shortcuts ? "" : settings.global_shortcuts.exit,
			click: () => {
				exitFromTray()
			},
		},
	])

	tray.setToolTip("Authme")
	tray.setContextMenu(contextmenu)
}

/**
 * Create application menu
 */
const createMenu = () => {
	const template = [
		{
			label: lang.menu.file,
			submenu: [
				{
					label: codes_shown ? lang.menu.hide_app : lang.menu.show_app,
					accelerator: shortcuts ? "" : settings.shortcuts.show,
					click: () => {
						showAppFromTray()
						createMenu()
						createTray()
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.settings,
					enabled: authenticated,
					accelerator: shortcuts ? "" : settings.shortcuts.settings,
					click: () => {
						const toggle = () => {
							if (settings_shown === false) {
								window_settings.maximize()
								window_settings.show()

								settings_shown = true

								logger.log("Settings shown")
							} else {
								if (BrowserWindow.getFocusedWindow().getTitle() !== "Authme (Settings)") {
									window_settings.maximize()
									window_settings.show()

									logger.log("Edit restored")
								} else {
									window_settings.hide()

									window_codes.focus()

									settings_shown = false

									logger.log("Settings hidden")
								}
							}
						}

						if (settings.security.require_password === true && authenticated === true) {
							toggle()
						} else if (settings.security.require_password === false) {
							toggle()
						}
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.exit,
					accelerator: shortcuts ? "" : settings.shortcuts.exit,
					click: () => {
						saveWindowPosition()

						try {
							password_buffer.fill(0)
						} catch (error) {}

						app.exit()

						logger.log("App exited from menu")
					},
				},
			],
		},
		{
			label: lang.menu.view,
			submenu: [
				{
					label: lang.menu.reset,
					role: shortcuts ? "" : "resetZoom",
					accelerator: shortcuts ? "" : settings.shortcuts.zoom_reset,
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.zoom_in,
					role: shortcuts ? "" : "zoomIn",
					accelerator: shortcuts ? "" : settings.shortcuts.zoom_in,
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.zoom_out,
					role: shortcuts ? "" : "zoomOut",
					accelerator: shortcuts ? "" : settings.shortcuts.zoom_out,
				},
			],
		},
		{
			label: lang.menu.tools,
			submenu: [
				{
					label: lang.menu.edit_codes,
					enabled: authenticated,
					accelerator: shortcuts ? "" : settings.shortcuts.edit,
					click: () => {
						const toggle = () => {
							if (window_tools.getTitle() !== "Authme (Edit codes)") {
								window_tools.loadFile("./app/edit/index.html")
								window_tools.setTitle("Authme (Edit codes)")

								window_tools.maximize()
								window_tools.show()

								tools_shown = true
							} else {
								if (tools_shown === false) {
									window_tools.maximize()
									window_tools.show()

									tools_shown = true

									logger.log("Edit shown")
								} else {
									if (BrowserWindow.getFocusedWindow().getTitle() !== "Authme (Edit codes)") {
										window_tools.maximize()
										window_tools.show()

										logger.log("Edit restored")
									} else {
										window_tools.hide()
										window_codes.focus()

										tools_shown = false

										logger.log("Edit hidden")
									}
								}
							}
						}

						if (settings.security.require_password === true && authenticated === true) {
							toggle()
						} else if (settings.security.require_password === false) {
							toggle()
						}
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.import,
					enabled: authenticated,
					accelerator: shortcuts ? "" : settings.shortcuts.import,
					click: () => {
						const toggle = () => {
							if (window_tools.getTitle() !== "Authme (Import)") {
								window_tools.loadFile("./app/import/index.html")
								window_tools.setTitle("Authme (Import)")

								window_tools.maximize()
								window_tools.show()

								tools_shown = true
							} else {
								if (tools_shown === false) {
									window_tools.maximize()
									window_tools.show()

									tools_shown = true

									logger.log("Import shown")
								} else {
									if (BrowserWindow.getFocusedWindow().getTitle() !== "Authme (Import)") {
										window_tools.maximize()
										window_tools.show()

										logger.log("Import restored")
									} else {
										window_tools.hide()
										window_codes.focus()

										tools_shown = false

										logger.log("Import hidden")
									}
								}
							}
						}

						if (settings.security.require_password === true && authenticated === true) {
							toggle()
						} else if (settings.security.require_password === false) {
							toggle()
						}
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.export,
					enabled: authenticated,
					accelerator: shortcuts ? "" : settings.shortcuts.export,
					click: () => {
						const toggle = () => {
							if (window_tools.getTitle() !== "Authme (Export)") {
								window_tools.loadFile("./app/export/index.html")
								window_tools.setTitle("Authme (Export)")

								window_tools.maximize()
								window_tools.show()

								tools_shown = true
							} else {
								if (tools_shown === false) {
									window_tools.maximize()
									window_tools.show()

									tools_shown = true

									logger.log("Export shown")
								} else {
									if (BrowserWindow.getFocusedWindow().getTitle() !== "Authme (Export)") {
										window_tools.maximize()
										window_tools.show()

										logger.log("Export restored")
									} else {
										window_tools.hide()
										window_codes.focus()

										tools_shown = false

										logger.log("Export hidden")
									}
								}
							}
						}

						if (settings.security.require_password === true && authenticated === true) {
							toggle()
						} else if (settings.security.require_password === false) {
							toggle()
						}
					},
				},
			],
		},
		{
			label: lang.menu.help,
			submenu: [
				{
					label: lang.menu.documentation,
					accelerator: shortcuts ? "" : settings.shortcuts.docs,
					click: () => {
						dialog
							.showMessageBox({
								title: "Authme",
								buttons: [lang.button.open, lang.button.close],
								defaultId: 1,
								cancelId: 1,
								noLink: true,
								type: "info",
								message: lang.dialog.docs,
							})
							.then((result) => {
								if (result.response === 0) {
									shell.openExternal("https://docs.authme.levminer.com")
								}
							})
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.release_notes,
					accelerator: shortcuts ? "" : settings.shortcuts.release,
					click: () => {
						releaseNotes()
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.support_development,
					accelerator: shortcuts ? "" : settings.shortcuts.support,
					click: () => {
						support()
					},
				},
			],
		},
		{
			label: lang.menu.about,
			submenu: [
				{
					label: lang.menu.show_licenses,
					accelerator: shortcuts ? "" : settings.shortcuts.licenses,
					click: () => {
						dialog
							.showMessageBox({
								title: "Authme",
								buttons: [lang.button.more, lang.button.close],
								defaultId: 1,
								cancelId: 1,
								noLink: true,
								type: "info",
								message: lang.dialog.license,
							})
							.then((result) => {
								if (result.response === 0) {
									shell.openExternal("https://authme.levminer.com/licenses.html")
								}
							})
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.update,
					accelerator: shortcuts ? "" : settings.shortcuts.update,
					click: () => {
						if (platform === "windows") {
							if (dev === false) {
								manual_update = true

								autoUpdater.checkForUpdates()
							}
						} else {
							axios
								.get("https://api.levminer.com/api/v1/authme/releases")
								.then((res) => {
									if (res.data.tag_name > authme_version && res.data.tag_name != undefined && res.data.prerelease != true) {
										dialog
											.showMessageBox({
												title: "Authme",
												buttons: ["Yes", "No"],
												defaultId: 0,
												cancelId: 1,
												noLink: true,
												type: "info",
												message: `Update available: Authme ${res.data.tag_name} \n\nDo you want to download it? \n\nYou currently running: Authme ${authme_version}`,
											})
											.then((result) => {
												if (result.response === 0) {
													shell.openExternal("https://authme.levminer.com#downloads")
												}
											})
									} else {
										dialog.showMessageBox({
											title: "Authme",
											buttons: [lang.button.close],
											defaultId: 0,
											cancelId: 1,
											noLink: true,
											type: "info",
											message: `No update available: \n\nYou are running the latest version! \n\nYou are currently running: Authme ${authme_version}`,
										})
									}
								})
								.catch((error) => {
									dialog.showErrorBox("Authme", "Error getting update manually \n\nTry again later!")

									logger.error("Error getting update manually", error.stack)
								})
						}
					},
				},
				{
					type: "separator",
				},
				{
					label: lang.menu.info,
					accelerator: shortcuts ? "" : settings.shortcuts.info,
					click: () => {
						version()
					},
				},
			],
		},
	]

	// @ts-ignore Set menu
	menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu)

	// Reload menu
	if (window_codes !== undefined && platform === "windows") {
		try {
			window_security.webContents.send("refreshMenu")
		} catch (error) {}

		window_codes.webContents.send("refreshMenu")
		window_settings.webContents.send("refreshMenu")
		window_tools.webContents.send("refreshMenu")
	}
}

/**
 * Toggle shortcuts
 */
ipc.handle("toggleShortcuts", () => {
	if (shortcuts === false) {
		shortcuts = true

		globalShortcut.unregisterAll()

		createTray()
		createMenu()

		logger.log("Shortcuts disabled")
	} else {
		shortcuts = false

		settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

		if (settings.global_shortcuts.show !== "None") {
			globalShortcut.register(settings.global_shortcuts.show, () => {
				showAppFromTray()
			})
		}

		if (settings.global_shortcuts.settings !== "None") {
			globalShortcut.register(settings.global_shortcuts.settings, () => {
				settingsFromTray()
			})
		}

		if (settings.global_shortcuts.exit !== "None") {
			globalShortcut.register(settings.global_shortcuts.exit, () => {
				exitFromTray()
			})
		}

		createTray()
		createMenu()

		logger.log("Shortcuts enabled")
	}
})

/**
 * Refresh shortcuts
 */
ipc.handle("refreshShortcuts", () => {
	settings = JSON.parse(fs.readFileSync(path.join(folder_path, "settings", "settings.json"), "utf-8"))

	globalShortcut.unregisterAll()

	if (settings.global_shortcuts.show !== "None") {
		globalShortcut.register(settings.global_shortcuts.show, () => {
			showAppFromTray()
		})
	}

	if (settings.global_shortcuts.settings !== "None") {
		globalShortcut.register(settings.global_shortcuts.settings, () => {
			settingsFromTray()
		})
	}

	if (settings.global_shortcuts.exit !== "None") {
		globalShortcut.register(settings.global_shortcuts.exit, () => {
			exitFromTray()
		})
	}

	createTray()
	createMenu()

	logger.log("Shortcuts refreshed")
})
