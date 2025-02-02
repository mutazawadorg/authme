// @ts-nocheck
const fs = require("fs")
const path = require("path")

const colors = {
	white: "\x1b[37m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	green: "\x1b[32m",
	purple: "\x1b[35m",
}

const time = () => {
	return new Date().toLocaleString()
}

let file_name = null
let file_path = null

module.exports = logger = {
	/**
	 * Node.js color codes
	 */
	colors,

	/**
	 * Writes a log to the console
	 * @param {string} message
	 * @param {string|object} log
	 */
	log: (message, log) => {
		if (typeof log === "object") {
			log = JSON.stringify(log, null, "\t")
		} else if (typeof log === "undefined") {
			log = undefined
		}

		if (typeof log === "undefined") {
			console.log(`${colors.green}[AUTHME LOG] ${colors.blue}{${time()}} ${colors.white}${message} ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME LOG] {${time()}} ${message} \n`)
			} catch (error) {}
		} else {
			console.log(`${colors.green}[AUTHME LOG] ${colors.blue}{${time()}} ${colors.white}${message} ${colors.green}(${log}) ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME LOG] {${time()}} ${message} (${log}) \n`)
			} catch (error) {}
		}
	},

	/**
	 * Writes a log to the console
	 * @param {string} id
	 * @param {string} message
	 * @param {string|object} log
	 */
	rendererLog: (id, message, log) => {
		if (typeof log === "object") {
			log = JSON.stringify(log, null, "\t")
		} else if (typeof log === "undefined") {
			log = undefined
		}

		if (typeof log === "undefined") {
			console.log(`${colors.green}[AUTHME LOG] ${colors.blue}{${time()}} ${colors.white}${colors.purple}<${id}>${colors.white} ${message} ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME LOG] {${time()}} <${id}> ${message} \n`)
			} catch (error) {}
		} else {
			console.log(`${colors.green}[AUTHME LOG] ${colors.blue}{${time()}}${colors.purple}<${id}>${colors.white} ${colors.white}${message} ${colors.green}(${log}) ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME LOG] {${time()}} <${id}> ${message} (${log}) \n`)
			} catch (error) {}
		}
	},

	/**
	 * Writes a warn to the console
	 * @param {string} message
	 * @param {string|object} warn
	 */
	warn: (message, warn) => {
		if (typeof warn === "object") {
			warn = JSON.stringify(warn, null, "\t")
		} else if (typeof warn === "undefined") {
			warn = undefined
		}

		if (typeof warn === "undefined") {
			console.log(`${colors.yellow}[AUTHME WARN] ${colors.blue}{${time()}} ${colors.white}${message} ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME WARN] {${time()}} ${message} \n`)
			} catch (error) {}
		} else {
			console.log(`${colors.yellow}[AUTHME WARN] ${colors.blue}{${time()}} ${colors.white}${message} ${colors.yellow}(${warn}) ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME WARN] {${time()}} ${message} (${warn}) \n`)
			} catch (error) {}
		}
	},

	/**
	 * Writes a warn to the console
	 * @param {string} id
	 * @param {string} message
	 * @param {string|object} warn
	 */
	rendererWarn: (id, message, warn) => {
		if (typeof warn === "object") {
			warn = JSON.stringify(warn, null, "\t")
		} else if (typeof warn === "undefined") {
			warn = undefined
		}

		if (typeof warn === "undefined") {
			console.log(`${colors.yellow}[AUTHME WARN] ${colors.blue}{${time()}} ${colors.purple}<${id}>${colors.white} ${colors.white}${message} ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME WARN] {${time()}} <${id}> ${message} \n`)
			} catch (error) {}
		} else {
			console.log(`${colors.yellow}[AUTHME WARN] ${colors.blue}{${time()}} ${colors.purple}<${id}>${colors.white} ${colors.white}${message} ${colors.yellow}(${warn}) ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME WARN] {${time()}} <${id}> ${message} (${warn}) \n`)
			} catch (error) {}
		}
	},

	/**
	 * Writes an error to the console
	 * @param {string} message
	 * @param {string|object} error
	 */
	error: (message, error) => {
		if (typeof error === "object") {
			error = JSON.stringify(error, null, "\t")
		} else if (typeof error === "undefined") {
			error = undefined
		}

		if (typeof error === "undefined") {
			console.log(`${colors.red}[AUTHME ERROR] ${colors.blue}{${time()}} ${colors.white}${message} ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME ERROR] {${time()}} ${message} \n`)
			} catch (error) {}
		} else {
			console.log(`${colors.red}[AUTHME ERROR] ${colors.blue}{${time()}} ${colors.white}${message} ${colors.red}(${error}) ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME ERROR] {${time()}} ${message} (${error}) \n`)
			} catch (error) {}
		}
	},

	/**
	 * Writes an error to the console
	 * @param {string} id
	 * @param {string} message
	 * @param {string|object} error
	 */
	rendererError: (id, message, error) => {
		if (typeof error === "object") {
			error = JSON.stringify(error, null, "\t")
		} else if (typeof error === "undefined") {
			error = undefined
		}

		if (typeof error === "undefined") {
			console.log(`${colors.red}[AUTHME ERROR] ${colors.blue}{${time()}} ${colors.purple}<${id}>${colors.white} ${colors.white}${message} ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME ERROR] {${time()}} <${id}> ${message} \n`)
			} catch (error) {}
		} else {
			console.log(`${colors.red}[AUTHME ERROR] ${colors.blue}{${time()}} ${colors.purple}<${id}>${colors.white} ${colors.white}${message} ${colors.red}(${error}) ${colors.white}`)

			try {
				logger.writeFile(`[AUTHME ERROR] {${time()}} <${id}> ${message} (${error}) \n`)
			} catch (error) {}
		}
	},

	/**
	 * Creates a log file
	 * @param {string} file
	 * @param {string} name
	 */
	createFile: (file, name) => {
		const time = new Date().toISOString().replace("T", "-").replaceAll(":", "-").substring(0, 19)

		if (!fs.existsSync(path.join(file, "logs"))) {
			fs.mkdirSync(path.join(file, "logs"))
		}

		fs.writeFileSync(path.join(path.join(file, "logs"), `${name}-${time}.log`), "")

		file_name = `${name}-${time}.log`
		file_path = path.join(file, "logs")
	},

	/**
	 * Writes to a log file
	 * @param {string} message
	 */
	writeFile: (message) => {
		fs.appendFileSync(path.join(file_path, file_name), message)
	},

	/**
	 * Returns current file name
	 * @return {string} file_name
	 */
	fileName: () => {
		return file_name
	},
}
