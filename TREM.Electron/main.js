const { BrowserWindow, Menu, Notification, app: TREM, Tray, ipcMain, nativeImage, shell, globalShortcut, dialog } = require("electron");
const Configuration = require("./Configuration/Configuration");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const os = require("os");
const logger = require("electron-log");
const path = require("path");
const pushReceiver = require("electron-fcm-push-receiver");
const cp = require("child_process");
const remote = require("@electron/remote/main");
const get_Version = TREM.getVersion();

TREM.Configuration = new Configuration(TREM);
TREM.Utils = require("./Utils/Utils.js");
TREM.Localization = new (require("./Localization/Localization"))(TREM.Configuration.data["general.locale"], TREM.getLocale());
TREM.Window = new Map();
TREM.isQuiting = TREM.Configuration.data["windows.tray"];

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = logger;
TREM.commandLine.appendSwitch("disable-http2");
autoUpdater.requestHeaders = { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" };

// Object.defineProperty(TREM, 'isPackaged', {
// 	get() {
// 	  return true;
// 	}
// });

/**
 * @type {Tray}
 */
let tray = null;
let _hide = TREM.Configuration.data["windows.minimize"];
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;

if (process.argv.includes("--dev") && process.argv.includes("--key")) {
	_devMode = true;
	TREM.Configuration.data["dev.mode"] = _devMode;
} else {
	_devMode = false;
	TREM.Configuration.data["dev.mode"] = _devMode;
}

emitAllWindow("setting", TREM.Configuration._data);
const latestLog = path.join(TREM.getPath("logs"), "latest.log");

if (fs.existsSync(latestLog)) {
	const filetime = fs.statSync(latestLog).mtime;
	const filename = (new Date(filetime.getTime() - (filetime.getTimezoneOffset() * 60000))).toISOString().slice(0, -1).replace(/:+|\.+/g, "-");
	fs.renameSync(path.join(TREM.getPath("logs"), "latest.log"), path.join(TREM.getPath("logs"), `${filename}.log`));
}

if (!fs.existsSync(path.join(TREM.getPath("userData"), "server.json")))
	fs.writeFileSync(path.join(TREM.getPath("userData"), "server.json"), JSON.stringify([]));

fs.readFile(path.join(TREM.getPath("userData"), "server.json"), (err, data) => {
	if (err) throw err;
	console.log(data.toString());

	if (data.toString() == "")
		fs.writeFileSync(path.join(TREM.getPath("userData"), "server.json"), JSON.stringify([]));
});

if (!TREM.Configuration.data["compatibility.hwaccel"]) {
	TREM.disableDomainBlockingFor3DAPIs();
	TREM.disableHardwareAcceleration();
	logger.info("Hardware Acceleration is disabled.");
}

if (!TREM.Configuration.data["compatibility.3DAPI"]) {
	TREM.disableDomainBlockingFor3DAPIs();
	logger.info("3D API is disabled.");
}

/**
 * @type {BrowserWindow}
 */
let MainWindow = TREM.Window.get("main");

/**
 * @type {BrowserWindow}
 */
let SettingWindow = TREM.Window.get("setting");

/**
 * @type {BrowserWindow}
 */
let RTSWindow = TREM.Window.get("rts");

/**
 * @type {BrowserWindow}
 */
let IntensityWindow = TREM.Window.get("Intensity");

// const appFolder = path.dirname(
// 	(process.env.APPDATA ? path.join(process.env.APPDATA, '..', 'Local', 'Programs', 'trem', 'trem') : process.env.APPDATA)
// 	|| (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.APPDATA));
// const runExe = path.resolve(appFolder, 'TREM.exe');
// console.log(runExe);

TREM.setLoginItemSettings({
	openAtLogin : TREM.Configuration.data["windows.startup"],
	// path		: runExe,
	name        : "TREMV",
	args        : TREM.Configuration.data["windows.minimize"] ? ["--start"] : [],
});

TREM.commandLine.appendSwitch("disable-frame-rate-limit");

function createWindow() {
	MainWindow = TREM.Window.set("main", new BrowserWindow({
		title          : TREM.Localization.getString("Application_Title"),
		width          : 1280,
		minWidth       : 1280,
		height         : 720,
		minHeight      : 720,
		resizable      : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			preload              : path.join(__dirname, "preload.js"),
			nodeIntegration      : true,
			contextIsolation     : false,
			enableRemoteModule   : true,
			backgroundThrottling : false,
			nativeWindowOpen     : true,
		},
	})).get("main");
	remote.initialize();
	remote.enable(MainWindow.webContents);
	process.env.window = MainWindow.id;
	MainWindow.loadFile("./Views/MainView.html");
	MainWindow.setAspectRatio(16 / 9);
	MainWindow.setMenu(null);
	MainWindow.webContents.on("did-finish-load", () => {
		MainWindow.webContents.send("setting", TREM.Configuration._data);

		if (!_hide) setTimeout(() => MainWindow.show(), 500);
	});
	pushReceiver.setup(MainWindow.webContents);

	if (process.platform === "win32")
		TREM.setAppUserModelId("TREMV | 臺灣即時地震監測變體");
	MainWindow.on("resize", () => {
		MainWindow.webContents.invalidate();
	});
	MainWindow.on("close", (event) => {
		if (TREM.isQuiting) {
			event.preventDefault();
			MainWindow.hide();

			if (SettingWindow)
				SettingWindow.close();
			event.returnValue = false;
		} else {
			MainWindow.webContents.send("app-before-quit");
		}
	});
	MainWindow.on("unresponsive", () => {
		restart();
	});
}

function createSettingWindow() {
	if (SettingWindow instanceof BrowserWindow) return SettingWindow.focus();
	SettingWindow = TREM.Window.set("setting", new BrowserWindow({
		title          : TREM.Localization.getString("Setting_Title"),
		height         : 600,
		width          : 1000,
		minHeight      : 600,
		minWidth       : 800,
		frame          : false,
		transparent    : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			preload              : path.join(__dirname, "preload.js"),
			nodeIntegration      : true,
			contextIsolation     : false,
			enableRemoteModule   : true,
			backgroundThrottling : false,
			nativeWindowOpen     : true,
		},
	})).get("setting");
	remote.enable(SettingWindow.webContents);
	SettingWindow.loadFile("./Views/SettingView.html");
	SettingWindow.setMenu(null);
	SettingWindow.webContents.on("did-finish-load", () => {
		SettingWindow.webContents.send("setting", TREM.Configuration._data);
		setTimeout(() => SettingWindow.show(), 500);
	});
	SettingWindow.on("close", () => {
		// ipcMain.emit("setting_btn_remove_hide");
		SettingWindow = null;
	});
}

function createRTSWindow() {
	if (RTSWindow instanceof BrowserWindow) return RTSWindow.focus();
	RTSWindow = TREM.Window.set("rts", new BrowserWindow({
		title          : TREM.Localization.getString("Setting_Title"),
		height         : 774,
		width          : 400,
		minHeight      : 774,
		minWidth       : 400,
		frame          : false,
		transparent    : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			preload              : path.join(__dirname, "preload.js"),
			nodeIntegration      : true,
			contextIsolation     : false,
			enableRemoteModule   : true,
			backgroundThrottling : false,
			nativeWindowOpen     : true,
		},
	})).get("rts");
	remote.enable(RTSWindow.webContents);
	RTSWindow.loadFile("./Views/RTSView.html");
	RTSWindow.setMenu(null);
	RTSWindow.webContents.on("did-finish-load", () => {
		RTSWindow.webContents.send("setting", TREM.Configuration._data);
		setTimeout(() => RTSWindow.show(), 500);
	});
	RTSWindow.on("close", () => {
		// ipcMain.emit("setting_btn_remove_hide");
		RTSWindow = null;
	});
}

function createIntensityWindow() {
	if (IntensityWindow instanceof BrowserWindow) {
		if (!IntensityWindow.isVisible()) IntensityWindow.reload();
		return IntensityWindow.show();
	}

	IntensityWindow = TREM.Window.set("Intensity", new BrowserWindow({
		title          : TREM.Localization.getString("Application_Title"),
		width          : 1280,
		minWidth       : 1280,
		height         : 720,
		minHeight      : 720,
		resizable      : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			preload              : path.join(__dirname, "preload.js"),
			nodeIntegration      : true,
			contextIsolation     : false,
			enableRemoteModule   : true,
			backgroundThrottling : false,
			nativeWindowOpen     : true,
		},
	})).get("Intensity");
	remote.enable(IntensityWindow.webContents);
	process.env.intensitywindow = IntensityWindow.id;
	IntensityWindow.loadFile("./Views/IntensityView.html");
	IntensityWindow.setAspectRatio(16 / 9);
	IntensityWindow.setMenu(null);
	IntensityWindow.webContents.on("did-finish-load", () => {
		IntensityWindow.webContents.send("setting", TREM.Configuration._data);
		// if (!_hide) setTimeout(() => IntensityWindow.show(), 500);
	});
	IntensityWindow.on("resize", () => {
		IntensityWindow.webContents.invalidate();
	});
	IntensityWindow.on("close", (event) => {
		event.preventDefault();
		IntensityWindow.hide();
		event.returnValue = false;
	});
}

const shouldQuit = TREM.requestSingleInstanceLock();

if (!shouldQuit) {
	TREM.quit();
} else {
	TREM.on("second-instance", (event, argv, cwd) => {
		if (MainWindow != null) MainWindow.show();
	});
	TREM.whenReady().then(() => {
		trayIcon();
		createIntensityWindow();
		createWindow();
	});
}

function isNetworkError(errorObject) {
	return errorObject.message === "net::ERR_INTERNET_DISCONNECTED"
        || errorObject.message === "net::ERR_PROXY_CONNECTION_FAILED"
        || errorObject.message === "net::ERR_CONNECTION_RESET"
        || errorObject.message === "net::ERR_CONNECTION_CLOSE"
        || errorObject.message === "net::ERR_NAME_NOT_RESOLVED"
        || errorObject.message === "net::ERR_CONNECTION_TIMED_OUT";
}

let update_time = 0;

function checkForUpdates(auto = true) {
	try {
		if (update_time !== 0 || !auto)
			autoUpdater.checkForUpdates().catch((error) => {
				if (isNetworkError(error)) {
					console.log("Network Error");
					console.log(error);
				} else {
					console.log("Unknown Error");
					console.log(error == null ? "unknown" : (error.stack || error).toString());
				}
			});
	} catch (error) {
		console.error("Error while on checkForUpdates: ", error);
	}
}

function downloadUpdate(cancellationToken) {
	try {
		autoUpdater.downloadUpdate(cancellationToken).catch((error) => {
			if (isNetworkError(error)) {
				console.log("Network Error");
				console.log(error);
			} else {
				console.log("Unknown Error");
				console.log(error == null ? "unknown" : (error.stack || error).toString());
			}
		});
	} catch (error) {
		console.error("Error while on downloadUpdate: ", error);
	}
}

TREM.on("ready", () => {
	if (TREM.Configuration.data["update.time"] != undefined) {
		if (TREM.Configuration.data["update.time"] != 0) {
			checkForUpdates();
			update_time = TREM.Configuration.data["update.time"] * 3600000;
			setInterval(() => {
				checkForUpdates();
			}, update_time);
		} else {
			checkForUpdates();
			update_time = 3600000;
			setInterval(() => {
				checkForUpdates();
			}, update_time);
		}
	} else {
		checkForUpdates();
		update_time = 3600000;
		setInterval(() => {
			checkForUpdates();
		}, update_time);
	}

	// globalShortcut.register("Tab", function() {
	// 	console.log("Tab is pressed");
	// })

	// heliarun();
});

async function heliarun() {
	try {
		const { create_Helia, helia_unixfs, multiformats_CID, multiformats_base64 } = await import("./helia.mjs");
		const helia = await create_Helia();
		const libp2p = helia.libp2p;
		const fsa = helia_unixfs(helia);
		// const keychain = libp2p.keychain;
		const id = libp2p.peerId;
		const Multi = libp2p.getMultiaddrs();
		// const keyInfo = await keychain.createKey("TREM", 'RSA', 4096);
		// const peerId = await keychain.exportPeerId(keyInfo.name);
		console.log(id);
		console.log(Multi);
		// console.log(peerId);
		const bafyFoo = fsa.cat(multiformats_CID().parse("mAYAEEiCTojlxqRTl6svwqNJRVM2jCcPBxy+7mRTUfGDzy2gViA", multiformats_base64().decoder));
		// console.log(bafyFoo);

		setInterval(() => {
			console.log(`peer: ${libp2p.getPeers().length}`);
		}, 5000);

		// libp2p.addEventListener('peer:discovery', (evt) => {
		// 	console.log(`Discovered peer ${evt.detail.id.toString()} peer: ${libp2p.getPeers().length}`);
		// });
		// libp2p.addEventListener('peer:connect', (evt) => {
		// 	console.log(`Connected to ${evt.detail.toString()} peer: ${libp2p.getPeers().length}`);
		// });
		// libp2p.addEventListener('peer:disconnect', (evt) => {
		// 	console.log(`Disconnected from ${evt.detail.toString()} peer: ${libp2p.getPeers().length}`);
		// });
	} catch (err) {
		console.error(err);
	}
}

TREM.on("activate", () => {
	if (MainWindow === null)
		createWindow();
	else if (MainWindow.isMinimized())
		MainWindow.restore();
	else if (!MainWindow.isVisible())
		MainWindow.show();
});

autoUpdater.on("update-available", (info) => {
	if (TREM.Configuration.data["update.mode"] != "never") {
		new Notification({
			title : TREM.Localization.getString("Notification_Update_Title"),
			body  : TREM.Localization.getString("Notification_Update_Body").format(get_Version, info.version),
			icon  : "TREM.ico",
		}).on("click", () => {
			logger.info(info);
			shell.openExternal(`https://github.com/yayacat/TREM/releases/tag/v${info.version}`);
		}).show();

		switch (TREM.Configuration.data["update.mode"]) {
			case "install": {
				downloadUpdate(info.cancellationToken);
				break;
			}

			case "download": {
				downloadUpdate(info.cancellationToken);
				break;
			}

			case "notify": {
				emitAllWindow("update-available-Notification", info.version, get_Version, info);
				break;
			}

			default:
				break;
		}
	}
});

autoUpdater.on("update-not-available", (info) => {
	// logger.info(info.version);
	// logger.info("No new updates found");
	if (TREM.Configuration.data["update.mode"] != "never") {
		new Notification({
			title : TREM.Localization.getString("Notification_No_Update_Title"),
			body  : TREM.Localization.getString("Notification_No_Update_Body").format(get_Version, info.version),
			icon  : "TREM.ico",
		}).show();
		emitAllWindow("update-not-available-Notification", info.version, get_Version);
	}
});

autoUpdater.on("error", (err) => {
	logger.error(err);
});

autoUpdater.on("download-progress", (progressObj) => {
	if (MainWindow)
		MainWindow.setProgressBar(progressObj.percent);
});

autoUpdater.on("update-downloaded", (info) => {
	if (MainWindow)
		MainWindow.setProgressBar(0);

	if (TREM.Configuration.data["update.mode"] == "install")
		autoUpdater.quitAndInstall();
});

TREM.on("before-quit", () => {
	if (tray)
		tray.destroy();
});

TREM.on("render-process-gone", (e, w, d) => {
	if (d.reason == "crashed")
		w.reload();
});

ipcMain.on("toggleFullscreen", () => {
	if (MainWindow)
		MainWindow.setFullScreen(!MainWindow.isFullScreen());
});

ipcMain.on("openDevtool", () => {
	if (_devMode) {
		const currentWindow = BrowserWindow.getFocusedWindow();

		if (currentWindow)
			currentWindow.webContents.openDevTools({ mode: "detach" });
	}
});

ipcMain.on("openDevtoolF10", () => {
	const currentWindow = BrowserWindow.getFocusedWindow();

	if (currentWindow)
		currentWindow.webContents.openDevTools({ mode: "detach" });
});

ipcMain.on("reloadpage", () => {
	// restart();
	const currentWindow = BrowserWindow.getFocusedWindow();

	if (currentWindow == MainWindow)
		MainWindow.webContents.send("app-before-reload");
});

ipcMain.on("Mainreloadpage", () => {
	MainWindow.reload();
});

ipcMain.on("openFileWindow", (event, arg) => {
	dialog.showOpenDialog(MainWindow, {
		properties: ["openFile"],
	}).then(result => {
		console.log(result.canceled);
		console.log(result.filePaths);

		if (result.canceled)
			dialog.showMessageBox(MainWindow, {
				title   : "取消???",
				message : "你為什麼點取消???",
				type    : "error",
			});
		else
			if (MainWindow) MainWindow.webContents.send("readReplayFile", result.filePaths);
	}).catch(err => {
		console.log(err);
	});
});


ipcMain.on("openChildWindow", async (event, arg) => {
	await createSettingWindow();
});

ipcMain.on("openRTSWindow", async (event, arg) => {
	await createRTSWindow();
});

ipcMain.on("openIntensityWindow", async (event, arg) => {
	await createIntensityWindow();
});

ipcMain.on("saveSetting", (event, arg) => {
	fs.unlinkSync(path.join(TREM.getPath("userData"), "settings.json"));
	fs.unlinkSync(path.join(TREM.getPath("userData"), "config.json"));
});

ipcMain.on("openScreenshotsFolder", (event, arg) => {
	if (!fs.existsSync(path.join(TREM.getPath("userData"), "Screenshots"))) fs.mkdirSync(path.join(TREM.getPath("userData"), "Screenshots"));

	shell.openPath(path.join(TREM.getPath("userData"), "Screenshots"));
});

ipcMain.on("openEEWScreenshotsFolder", (event, arg) => {
	if (!fs.existsSync(path.join(TREM.getPath("userData"), "EEW"))) fs.mkdirSync(path.join(TREM.getPath("userData"), "EEW"));

	shell.openPath(path.join(TREM.getPath("userData"), "EEW"));
});

ipcMain.on("openUpdateFolder", (event, arg) => {
	const homedir = os.homedir();
	let result;

	if (process.platform === "win32")
		result = process.env.LOCALAPPDATA || path.join(homedir, "AppData", "Local");
	else if (process.platform === "darwin")
		result = path.join(homedir, "Library", "Application Support", "Caches");
	else
		result = process.env.XDG_CACHE_HOME || path.join(homedir, ".cache");

	shell.openPath(path.join(result, `${process.env.npm_package_name}-updater`));
});

ipcMain.on("openreplayFolder", (event, arg) => {
	if (!fs.existsSync(path.join(TREM.getPath("userData"), "replay_data"))) fs.mkdirSync(path.join(TREM.getPath("userData"), "replay_data"));

	shell.openPath(path.join(TREM.getPath("userData"), "replay_data"));
});

ipcMain.on("openexportFolder", (event, arg) => {
	if (!fs.existsSync(path.join(TREM.getPath("userData"), "export"))) fs.mkdirSync(path.join(TREM.getPath("userData"), "export"));

	shell.openPath(path.join(TREM.getPath("userData"), "export"));
});

ipcMain.on("reset", (event, arg) => {
	TREM.quit();
});

ipcMain.on("restart", () => {
	restart();
});

ipcMain.on("hide", () => {
	const currentWindow = BrowserWindow.getFocusedWindow();

	if (currentWindow == MainWindow) MainWindow.hide();

	if (currentWindow == IntensityWindow) IntensityWindow.hide();
});

ipcMain.on("openFolder", (event, url) => {
	if (url === "logs")
		shell.openPath(TREM.getPath("logs"));
	else
		shell.openPath(url);
});

ipcMain.on("openURL", (event, url) => {
	if (url === "releases")
		shell.openExternal(`https://github.com/yayacat/TREM/releases/tag/v${get_Version}`);
	else
		shell.openExternal(url);
});

ipcMain.on("rtw", (event, data) => {
	if (RTSWindow != null)
		if (RTSWindow.isVisible())
			RTSWindow.webContents.send("rtw", data);
});

ipcMain.on("apikey", (event, data) => {
	MainWindow.webContents.send("apikey", data);
});

ipcMain.on("p2p", (event, data, server_ips) => {
	if (SettingWindow != null)
		if (SettingWindow.isVisible())
			SettingWindow.webContents.send("p2p", data, server_ips);
});

ipcMain.on("p2p6", (event, data, server_ips) => {
	if (SettingWindow != null)
		if (SettingWindow.isVisible())
			SettingWindow.webContents.send("p2p6", data, server_ips);
});

ipcMain.on("TREMIntensityhandle", (event, json) => {
	if (IntensityWindow != null)
		if (IntensityWindow.isVisible())
			IntensityWindow.webContents.send("TREMIntensityhandle", json);
});

ipcMain.on("TREMIntensityload", (event, json) => {
	if (IntensityWindow != null)
		if (IntensityWindow.isVisible())
			IntensityWindow.webContents.send("TREMIntensityload", json);
});

ipcMain.on("TREMIntensitylog2", (event, log) => {
	if (IntensityWindow != null)
		if (IntensityWindow.isVisible())
			IntensityWindow.webContents.send("TREMIntensitylog2", log);
});

ipcMain.on("ReportTREM", () => {
	MainWindow.webContents.send("ReportTREM");
});

ipcMain.on("Olddatabase_report", (event, json) => {
	MainWindow.webContents.send("Olddatabase_report", json);
});

// ipcMain.on("setting_btn_remove_hide", () => {
// 	emitAllWindow("setting_btn_remove_hide");
// });

ipcMain.on("start", () => {
	emitAllWindow("start");
});

ipcMain.on("testoldEEW", () => {
	emitAllWindow("testoldEEW");
});

ipcMain.on("testoldtimeEEW", (event, oldtime) => {
	emitAllWindow("testoldtimeEEW", oldtime);
});

ipcMain.on("testoldtremEEW", (event, oldtrem) => {
	emitAllWindow("testoldtremEEW", oldtrem);
});

ipcMain.on("testoldtime", (event, oldtime) => {
	emitAllWindow("testoldtime", oldtime);
});

ipcMain.on("testreplaytime", (event, oldtime) => {
	emitAllWindow("testreplaytime", oldtime);
});

ipcMain.on("sleep", (event, mode) => {
	emitAllWindow("sleep", mode);
});

ipcMain.on("report-Notification", (event, report) => {
	emitAllWindow("report-Notification", report);
});

ipcMain.on("intensity-Notification", (event, intensity) => {
	emitAllWindow("intensity-Notification", intensity);
});

ipcMain.on("testEEW", (event, list = []) => {
	emitAllWindow("testEEW", list);
});

ipcMain.on("Olddatabase_eew", (event, json) => {
	emitAllWindow("Olddatabase_eew", json);
});

ipcMain.on("test_eew", (event, json) => {
	emitAllWindow("test_eew", json);
});

ipcMain.on("Olddatabase_tsunami", (event, json) => {
	emitAllWindow("Olddatabase_tsunami", json);
});

ipcMain.on("startPushReceiver", (event, arg) => {
	pushReceiver.setup(MainWindow.webContents);
});

ipcMain.on("linkpathtest", (event, cmdPath, cmdStr) => {
	const workerProcess = cp.spawn(cmdStr, { cwd: cmdPath, shell: true });

	workerProcess.stdout.on("data", (data) => {
		console.log("stdout: " + data);
	});

	workerProcess.stderr.on("data", (data) => {
		console.log("stderr: " + data);
	});

	workerProcess.on("close", (code) => {
		console.log("out code:" + code);
	});
});

ipcMain.on("config:value", (event, key, value) => {
	switch (key) {
		case "map.tw_fault":
		case "map.cn":
		case "map.jp":
		case "map.sk":
		case "map.nk":
		case "map.ph":
		case "map.NZ":
		case "map.in":
		case "map.TU":
		case "map.ta":
		case "map.papua":
		case "map.panama":
		case "map.va":
		case "map.ec":
		case "map.af":
		case "map.ru":
		case "map.cl":
		case "map.ar":
		case "map.gu": {
			emitAllWindow("config:maplayer", key.slice(4), value);
			MainWindow.reload();
			break;
		}

		case "audio.tts": {
			MainWindow.reload();
			break;
		}

		case "audio.tts.voices": {
			MainWindow.reload();
			SettingWindow.close();
			break;
		}

		case "theme.color": {
			emitAllWindow("config:theme", value);
			break;
		}

		case "theme.dark": {
			emitAllWindow("config:dark", value);
			break;
		}

		case "theme.customColor": {
			emitAllWindow("config:color", value);
			break;
		}

		case "general.locale": {
			TREM.Localization.setLocale(value);

			if (MainWindow) MainWindow.setTitle(TREM.Localization.getString("Application_Title"));

			if (SettingWindow) SettingWindow.setTitle(TREM.Localization.getString("Setting_Title"));

			if (RTSWindow) RTSWindow.setTitle(TREM.Localization.getString("Setting_Title"));
			trayIcon();
			emitAllWindow("config:locale", value);
			break;
		}

		case "location.town": {
			emitAllWindow("config:location", value);
			break;
		}

		case "windows.startup": {
			TREM.setLoginItemSettings({
				openAtLogin : value,
				name        : "TREM",
				args        : TREM.Configuration.data["windows.minimize"] ? ["--start"] : [],
			});
			break;
		}

		case "windows.minimize": {
			TREM.setLoginItemSettings({
				openAtLogin : TREM.Configuration.data["windows.startup"],
				name        : "TREM",
				args        : value ? ["--start"] : [],
			});
			break;
		}

		case "windows.tray": {
			TREM.isQuiting = value;
			break;
		}

		case "map.animation": {
			emitAllWindow("config:mapanimation", value);
			break;
		}

		case "cache.report": {
			TREM.Configuration.data["cache.report"] = value;
			emitAllWindow("setting", TREM.Configuration._data);

			if (MainWindow) MainWindow.webContents.send("ReportGET");
			break;
		}

		case "report.getInfo": {
			TREM.Configuration.data["report.getInfo"] = value;
			emitAllWindow("setting", TREM.Configuration._data);

			if (MainWindow) MainWindow.webContents.send("ReportGET");
			break;
		}

		case "report.trem": {
			TREM.Configuration.data["report.trem"] = value;
			emitAllWindow("setting", TREM.Configuration._data);
			ipcMain.emit("ReportTREM");
			break;
		}

		case "report.tremeew": {
			TREM.Configuration.data["report.tremeew"] = value;
			emitAllWindow("setting", TREM.Configuration._data);
			ipcMain.emit("ReportTREM");
			break;
		}

		case "exptech.key": {
			TREM.Configuration.data["exptech.key"] = value;
			emitAllWindow("setting", TREM.Configuration._data);
			emitAllWindow("apikey");
			break;
		}

		default:
			break;
	}

	if (key.startsWith("theme.int"))
		emitAllWindow("config:color", key, value);

	TREM.Configuration.data[key] = value;
	emitAllWindow("setting", TREM.Configuration._data);
});

ipcMain.on("config:open", () => {
	shell.openPath(TREM.Configuration.path);
});

ipcMain.on("screenshotEEW", async (event, json) => {
	// return;
	const folder = path.join(TREM.getPath("userData"), "EEW");

	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	// const list = fs.readdirSync(folder);
	// for (let index = 0; index < list.length; index++) {
	// 	const date = fs.statSync(`${folder}/${list[index]}`);
	// 	if (Date.now() - date.ctimeMs > 3600000) fs.unlinkSync(`${folder}/${list[index]}`);
	// }
	const filename = `${json.Function}_${json.ID}_${json.Version}_${json.Time}_${json.Shot}.png`;
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());

	if (RTSWindow && json.Function != "replay_eew") {
		const filenameRTS = `${json.Function}_${json.ID}_${json.Version}_${json.Time}_${json.Shot}_RTS.png`;
		fs.writeFileSync(path.join(folder, filenameRTS), (await RTSWindow.webContents.capturePage()).toPNG());
	}
});

ipcMain.on("screenshotEEWI", async (event, json) => {
	// return;
	const folder = path.join(TREM.getPath("userData"), "EEW");

	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const filename = `${json.Function}_${json.ID}_${json.Version}_${json.Time}_${json.Shot}.png`;
	fs.writeFileSync(path.join(folder, filename), (await IntensityWindow.webContents.capturePage()).toPNG());
});

ipcMain.on("screenshot", async () => {
	const currentWindow = BrowserWindow.getFocusedWindow();

	if (currentWindow) {
		const folder = path.join(TREM.getPath("userData"), "Screenshots");

		if (!fs.existsSync(folder))
			fs.mkdirSync(folder);
		const filename = "screenshot" + Date.now() + ".png";
		fs.writeFileSync(path.join(folder, filename), (await currentWindow.webContents.capturePage()).toPNG());
		shell.showItemInFolder(path.join(folder, filename));
	}
});

ipcMain.on("app-quit-response", () => {
	TREM.exit(0);
});

ipcMain.on("app-quit-reload", () => {
	MainWindow.webContents.reload();
});

TREM.Configuration.on("update", (data) => {
	emitAllWindow("setting", data);
	emitAllWindow("config:color", data["theme.customColor"]);
});

TREM.Configuration.on("detect-locale", (data) => {
	const detectedLocale = TREM.Localization.matchLocale(TREM.getLocale());
	ipcMain.emit("config:value", "general.locale", detectedLocale);
});

TREM.Configuration.on("error", (error) => {
	emitAllWindow("settingError", error);
});

function restart() {
	TREM.relaunch();
	TREM.exit(0);
}

function emitAllWindow(channel, ...args) {
	for (const [key, win] of TREM.Window[Symbol.iterator]())
		if (win instanceof BrowserWindow)
			try {
				win.webContents.send(channel, ...args);
			} catch (error) {
				console.error(channel);
				console.error(...args);
				console.error(error);
			}
}

function changelocale(value) {
	TREM.Configuration.data["general.locale"] = value;
	TREM.Localization.setLocale(value);

	if (MainWindow)
		MainWindow.setTitle(TREM.Localization.getString("Application_Title"));

	if (SettingWindow)
		SettingWindow.setTitle(TREM.Localization.getString("Setting_Title"));

	if (RTSWindow)
		RTSWindow.setTitle(TREM.Localization.getString("Setting_Title"));

	trayIcon();

	if (!SettingWindow) {
		createSettingWindow();
		emitAllWindow("config:locale", value);
		SettingWindow.close();
	}

	if (!RTSWindow) {
		createRTSWindow();
		emitAllWindow("config:locale", value);
		RTSWindow.close();
	} else {
		emitAllWindow("config:locale", value);
	}
}

function trayIcon() {
	if (tray) {
		tray.destroy();
		tray = null;
	}

	const iconPath = path.join(__dirname, process.platform === "win32" ? "TREM.ico" : "TREM.png");
	tray = new Tray(nativeImage.createFromPath(iconPath));


	tray.setIgnoreDoubleClickEvents(true);
	tray.on("click", (e) => {
		if (MainWindow != null)
			if (MainWindow.isVisible())
				MainWindow.hide();
			else
				MainWindow.show();
	});
	const contextMenu = Menu.buildFromTemplate([
		{
			label : `TREMV v${get_Version}`,
			type  : "normal",
			click : () => {
				shell.openExternal("https://github.com/yayacat/TREM");
			},
		},
		{
			type: "separator",
		},
		{
			label : TREM.Localization.getString("Tray_Show"),
			type  : "normal",
			click : () => {
				MainWindow.show();
			},
		},
		{
			label : TREM.Localization.getString("Tray_Hide"),
			type  : "normal",
			click : () => {
				MainWindow.hide();
			},
		},
		{
			label : TREM.Localization.getString("RTS_Open"),
			type  : "normal",
			click : () => {
				BrowserWindow.fromId(process.env.window * 1).setAlwaysOnTop(false);
				BrowserWindow.fromId(process.env.intensitywindow * 1).setAlwaysOnTop(false);
				ipcMain.emit("openRTSWindow");
			},
		},
		{
			label : TREM.Localization.getString("Intensity_Open"),
			type  : "normal",
			click : () => {
				BrowserWindow.fromId(process.env.window * 1).setAlwaysOnTop(false);
				BrowserWindow.fromId(process.env.intensitywindow * 1).setAlwaysOnTop(false);
				ipcMain.emit("openIntensityWindow");
			},
		},
		{
			label : TREM.Localization.getString("FileWindow_Open"),
			type  : "normal",
			click : () => {
				BrowserWindow.fromId(process.env.window * 1).setAlwaysOnTop(false);
				BrowserWindow.fromId(process.env.intensitywindow * 1).setAlwaysOnTop(false);
				ipcMain.emit("openFileWindow");
			},
		},
		{
			label   : TREM.Localization.getString("Setting"),
			type    : "submenu",
			submenu : [
				{
					label : TREM.Localization.getString("Setting_Open"),
					type  : "normal",
					click : () => {
						BrowserWindow.fromId(process.env.window * 1).setAlwaysOnTop(false);
						BrowserWindow.fromId(process.env.intensitywindow * 1).setAlwaysOnTop(false);
						ipcMain.emit("openChildWindow");
					},
				},
				{
					label   : TREM.Localization.getString("general_locale"),
					submenu : [

						{
							label : "繁體中文 (zh-TW)",
							click : () => {
								changelocale("zh-TW");
							},
						},
						{
							label : "English (en)",
							click : () => {
								changelocale("en");
							},
						},
						{
							label : "日本語 (ja)",
							click : () => {
								changelocale("ja");
							},
						},
						{
							label : "한국어 (kr)",
							click : () => {
								changelocale("kr");
							},
						},
						{
							label : "Русский (ru)",
							click : () => {
								changelocale("ru");
							},
						},
						{
							label : "简体中文 (zh-CN)",
							click : () => {
								changelocale("zh-CN");
							},
						},
					],
				},
				{
					label : TREM.Localization.getString("check_For_Updates"),
					type  : "normal",
					click : () => {
						checkForUpdates(false);
					},
				},
				{
					label : TREM.Localization.getString("open_Devtool_F10"),
					type  : "normal",
					click : () => {
						MainWindow.webContents.openDevTools({ mode: "detach" });
					},
				},
			],
		},
		{
			label : TREM.Localization.getString("Tray_Reload"),
			type  : "normal",
			click : () => {
				MainWindow.reload();
			},
		},
		{
			label : TREM.Localization.getString("Tray_Restart"),
			type  : "normal",
			click : () => {
				restart();
			},
		},
		{
			label : TREM.Localization.getString("Tray_Exit"),
			type  : "normal",
			click : () => {
				TREM.exit(0);
			},
		},
	]);
	tray.setToolTip(TREM.Localization.getString("Application_Title"));

	if (process.platform === "darwin")
		TREM.dock.setMenu(contextMenu);

	tray.setContextMenu(contextMenu);

}


// #region override prototype
if (!Date.prototype.format)
	Date.prototype.format

	/**
	 * Format DateTime into string with provided formatting string.
	 * @param {string} format The formatting string to use.
	 * @returns {string} The formatted string.
	 */
	= function(format) {

			/**
			 * @type {Date}
			 */
			const me = this;
			return format.replace(/a|A|Z|S(SS)?|ss?|mm?|HH?|hh?|D{1,2}|M{1,2}|YY(YY)?|'([^']|'')*'/g, (str) => {
				let c1 = str.charAt(0);
				const ret = str.charAt(0) == "'"
					? (c1 = 0) || str.slice(1, -1).replace(/''/g, "'")
					: str == "a"
						? (me.getHours() < 12 ? "am" : "pm")
						: str == "A"
							? (me.getHours() < 12 ? "AM" : "PM")
							: str == "Z"
								? (("+" + -me.getTimezoneOffset() / 60).replace(/^\D?(\D)/, "$1").replace(/^(.)(.)$/, "$10$2") + "00")
								: c1 == "S"
									? me.getMilliseconds()
									: c1 == "s"
										? me.getSeconds()
										: c1 == "H"
											? me.getHours()
											: c1 == "h"
												? (me.getHours() % 12) || 12
												: c1 == "D"
													? me.getDate()
													: c1 == "m"
														? me.getMinutes()
														: c1 == "M"
															? me.getMonth() + 1
															: ("" + me.getFullYear()).slice(-str.length);
				return c1 && str.length < 4 && ("" + ret).length < str.length
					? ("00" + ret).slice(-str.length)
					: ret;
			});
		};

if (!String.prototype.format)
	String.prototype.format = function() {
		const args = arguments;
		return this.replace(/{(\d+)}/g, (match, number) => typeof args[number] != "undefined"
			? args[number]
			: match,
		);
	};
// #endregion