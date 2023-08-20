const { getCurrentWindow, shell } = require("@electron/remote");
const axios = require("axios");
const os = require("node:os");
const win = getCurrentWindow();
TREM.Constants = require(path.resolve(__dirname, "../Constants/Constants.js"));

document.onreadystatechange = () => {
	if (document.readyState == "complete")
		handleWindowControls();
};

window.onbeforeunload = async () => {
	await $(document.body).fadeOut(100).promise();
	win.removeAllListeners();
	win.destroy();
};

function handleWindowControls() {
	// Make minimise/maximise/restore/close buttons work when they are clicked
	document.getElementById("min-button").addEventListener("click", () => {
		win.minimize();
	});

	document.getElementById("max-button").addEventListener("click", () => {
		win.maximize();
	});

	document.getElementById("restore-button").addEventListener("click", () => {
		win.unmaximize();
	});

	document.getElementById("close-button").addEventListener("click", () => {
		win.close();
	});

	toggleMaxRestoreButtons();
	win.on("maximize", toggleMaxRestoreButtons);
	win.on("unmaximize", toggleMaxRestoreButtons);

	function toggleMaxRestoreButtons() {
		if (win.isMaximized())
			document.body.classList.add("maximized");
		else
			document.body.classList.remove("maximized");
	}
}

document.getElementById("client-version").innerText = `${app.getVersion()}`;
document.getElementById("client-os").innerText = `${os.version()} (${os.release()})`;
document.getElementById("client-uuid").title = `rts-TREM-${localStorage.UUID_rts}`;

const openURL = url => {
	shell.openExternal(url);
};

ipcRenderer.on("setting", (event, data) => {
	if (document.getElementsByClassName("dialog").length)
		closeDialog({ target: { id: "dialog" } });
});

ipcMain.on("RTSUnlock", (event, Unlock) => {
	if (Unlock) {
		document.getElementById("RTSUnlock").classList.remove("hide");
		document.getElementById("RTSUnlock1").classList.remove("hide");
	} else {
		document.getElementById("RTSUnlock").classList.add("hide");
		document.getElementById("RTSUnlock1").classList.add("hide");
	}
});

ipcRenderer.on("settingError", (event, error) => {
	is_setting_disabled = error;
	showDialog(
		"error",
		Localization[setting["general.locale"]]?.Setting_Dialog_Error_Title || Localization["zh-TW"].Setting_Dialog_Error_Title,
		(Localization[setting["general.locale"]]?.Setting_Dialog_Error_Description || Localization["zh-TW"].Setting_Dialog_Error_Description).format(error),
	);
	init();
});

let station;

/**
 * 初始化設定
 */
function init() {
	log("Initializing", 1, "Setting", "init");
	dump({ level: 0, message: "Initializing", origin: "Setting" });

	if (is_setting_disabled) {
		win.flashFrame(true);
		document.querySelectorAll(".setting-button").forEach((node) => node.disabled = true);
		document.body.classList.add("settingDisabled");
	} else {
		win.flashFrame(false);
		document.querySelectorAll(".setting-button").forEach((node) => node.disabled = false);
		document.body.classList.remove("settingDisabled");
	}

	const utc = new Date();
	const NOW = new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000 + 60 * 60 * 8 * 1000);
	const now = new Date(NOW.getTime() - 20000);
	const Now0 = now.getFullYear()
	+ "-" + (now.getMonth() + 1)
	+ "-" + now.getDate()
	+ " " + now.getHours()
	+ ":" + now.getMinutes()
	+ ":" + now.getSeconds();
	document.getElementById("Time").value = Now0;
	const now1 = new Date(NOW.getTime());
	const Now1 = now1.getFullYear()
	+ "-" + (now1.getMonth() + 1)
	+ "-" + now1.getDate()
	+ " " + now1.getHours()
	+ ":" + now1.getMinutes()
	+ ":" + now1.getSeconds();
	document.getElementById("TimeStamp").value = Now1;

	Object.keys(setting).forEach(id => {
		switch (TREM.Constants.Default_Configurations[id].type) {
			case "toggle": {
				const element = document.getElementById(id);

				if (element) {
					element.checked = setting[id];

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;

					if (id == "stream.mode")
						stream_mode(setting[id]);

					if (id == "theme.customColor")
						if (setting[id])
							$("#intensity-palette-container").removeClass("hide");
						else
							$("#intensity-palette-container").addClass("hide");

					if (id == "api.key.Hide")
						if (setting[id])
							document.getElementById("api.key").type = "password";
						else
							document.getElementById("api.key").type = "text";

					if (id == "rtw.api.key.Hide")
						if (setting[id])
							document.getElementById("rtw.api.key").type = "password";
						else
							document.getElementById("rtw.api.key").type = "text";

					if (id == "exptech.name.Hide")
						if (setting[id])
							document.getElementById("exptech.name").type = "password";
						else
							document.getElementById("exptech.name").type = "text";

					if (id == "exptech.email.Hide")
						if (setting[id])
							document.getElementById("exptech.email").type = "password";
						else
							document.getElementById("exptech.email").type = "text";

					if (id == "exptech.pass.Hide")
						if (setting[id])
							document.getElementById("exptech.pass").type = "password";
						else
							document.getElementById("exptech.pass").type = "text";
				}

				if (id == "dev.mode")
					if (setting[id])
						document.getElementById("Test").classList.remove("hide");
					else
						document.getElementById("Test").classList.add("hide");
				break;
			}

			case "string": {
				const element = document.getElementById(id);

				if (element) {
					// if (id == "api.key")
					// 	element.placeholder = "•".repeat(setting[id].length);
					// else
					element.value = setting[id];

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			case "select": {

				/**
				 * @type {HTMLSelectElement}
				 */
				const element = document.getElementById(id);

				if (element) {
					if (id == "location.town") {
						const town = document.getElementById("location.town");
						town.replaceChildren();

						for (const key of Object.keys(TREM.Resources.region[setting["location.city"]])) {
							const option = document.createElement("option");
							option.text = key;
							option.value = key;
							town.appendChild(option);
						}
					}

					for (let i = 0; i < element.options.length; i++)
						if (element.options[i].value == setting[id])
							element.options[i].selected = true;

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			case "color": {

				/**
				 * @type {HTMLSelectElement}
				 */
				const element = document.getElementById(id);

				if (element) {
					element.value = setting[id];

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				const wrapper = document.getElementById(id.replace(/\./g, "-"));
				console.log(wrapper);

				if (wrapper)
					wrapper.style.backgroundColor = setting[id];
				break;
			}

			case "range": {
				const element = document.getElementById(id);

				if (element) {
					element.value = setting[id];
					$(element).siblings("span.slider-value").text(() => ~~(setting[id] * 100));

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			case "choice": {
				const element = document.getElementById(id);

				if (element) {
					$(element).children("label").children(`input[value=${setting[id]}]`)[0].checked = true;

					if (is_setting_disabled) element.disabled = true;
					else element.disabled = false;
				}

				break;
			}

			default:
				break;
		}
	});

	const value = setting["update.mode"];
	const element1 = document.getElementById("update.time");

	if (value == "never")
		element1.disabled = true;
	else if (value == "notify")
		element1.disabled = false;
	else if (value == "download")
		element1.disabled = false;
	else if (value == "install")
		element1.disabled = false;

	// #region 選單
	(() => {
		const el = document.getElementById("location.city");

		for (const key of Object.keys(TREM.Resources.region)) {
			const option = document.createElement("option");
			option.text = key;
			option.value = key;

			if (setting["location.city"] == key)
				option.selected = true;
			el.appendChild(option);
		}
	})();

	(async () => {
		if (setting["Real-time.local"]) station = require(path.resolve(__dirname, "../station.json"));
		else station = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();

		if (!station) station = await (await fetch("https://cdn.jsdelivr.net/gh/ExpTechTW/API@master/Json/earthquake/station.json")).json();

		if (!station) station = await (await fetch("https://exptech.com.tw/api/v1/file?path=/resource/station.json")).json();

		const el = document.getElementById("Real-time.station");
		const el1 = document.getElementById("Real-time.station.1");
		const el2 = document.getElementById("Real-time.station.2");
		const el3 = document.getElementById("Real-time.station.3");
		const el4 = document.getElementById("Real-time.station.4");
		const el5 = document.getElementById("Real-time.station.5");
		const stations = {};

		for (const key of Object.keys(station)) {
			if (!stations[station[key].Loc.split(" ")[0]]) stations[station[key].Loc.split(" ")[0]] = {};
			stations[station[key].Loc.split(" ")[0]][key] = station[key].Loc;
		}

		for (const city of Object.keys(stations)) {
			const optgroup = document.createElement("optgroup");
			const optgroup1 = document.createElement("optgroup");
			const optgroup2 = document.createElement("optgroup");
			const optgroup3 = document.createElement("optgroup");
			const optgroup4 = document.createElement("optgroup");
			const optgroup5 = document.createElement("optgroup");
			optgroup.label = city;
			optgroup1.label = city;
			optgroup2.label = city;
			optgroup3.label = city;
			optgroup4.label = city;
			optgroup5.label = city;

			for (const stationKey of Object.keys(stations[city])) {
				const option = document.createElement("option");
				option.text = `${stations[city][stationKey]} ${stationKey}`;
				option.value = stationKey;

				if (setting["Real-time.station"] == stationKey)
					option.selected = true;
				optgroup.appendChild(option);
				const option1 = document.createElement("option");
				option1.text = `${stations[city][stationKey]} ${stationKey}`;
				option1.value = stationKey;

				if (setting["Real-time.station.1"] == stationKey)
					option1.selected = true;
				optgroup1.appendChild(option1);
				const option2 = document.createElement("option");
				option2.text = `${stations[city][stationKey]} ${stationKey}`;
				option2.value = stationKey;

				if (setting["Real-time.station.2"] == stationKey)
					option2.selected = true;
				optgroup2.appendChild(option2);
				const option3 = document.createElement("option");
				option3.text = `${stations[city][stationKey]} ${stationKey}`;
				option3.value = stationKey;

				if (setting["Real-time.station.3"] == stationKey)
					option3.selected = true;
				optgroup3.appendChild(option3);
				const option4 = document.createElement("option");
				option4.text = `${stations[city][stationKey]} ${stationKey}`;
				option4.value = stationKey;

				if (setting["Real-time.station.4"] == stationKey)
					option4.selected = true;
				optgroup4.appendChild(option4);
				const option5 = document.createElement("option");
				option5.text = `${stations[city][stationKey]} ${stationKey}`;
				option5.value = stationKey;

				if (setting["Real-time.station.5"] == stationKey)
					option5.selected = true;
				optgroup5.appendChild(option5);
			}

			el.appendChild(optgroup);
			el1.appendChild(optgroup1);
			el2.appendChild(optgroup2);
			el3.appendChild(optgroup3);
			el4.appendChild(optgroup4);
			el5.appendChild(optgroup5);
		}
	})();

	(async () => {
		await TREM.speech.init().then(data => {
			const el = document.getElementById("audio.tts.voices");
			TREM.voices = data.voices;

			for (const key of Object.keys(data.voices)) {
				const option = document.createElement("option");
				option.text = data.voices[key].name;
				option.value = data.voices[key].name;

				if (setting["audio.tts.voices"] == data.voices[key].name)
					option.selected = true;
				el.appendChild(option);
			}
		}).catch(e => {
			console.error("An error occured while initializing : ", e);
		});
	})();

	// #endregion

	document.getElementById("client-uuid").addEventListener("click", () => {
		navigator.clipboard.writeText(`rts-TREM-${localStorage.UUID_rts}`).then(() => {
			console.debug(`rts-TREM-${localStorage.UUID_rts}`);
			console.debug("複製成功");
		});
	});

	stream_mode(setting["stream.mode"]);
}

function SelectSave(id) {
	const select = document.getElementById(id);
	const value = select.options[select.selectedIndex].value;
	log(`Value Changed ${id}: ${setting[id]} -> ${value}`, 1, "Setting", "SelectSave");
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);

	if (id == "audio.tts.voices")
		for (const key of Object.keys(TREM.voices))
			if (TREM.voices[key].name == value) {
				TREM.speech.setLanguage(TREM.voices[key].lang);
				TREM.speech.setVoice(value);
				console.debug("Voices changed", TREM.voices[key]);
			}

	if (id == "update.time")
		$("#UDReloadButton").fadeIn(100);

	if (id == "location.city") {
		const town = document.getElementById("location.town");
		town.replaceChildren();

		for (const key of Object.keys(TREM.Resources.region[value])) {
			const option = document.createElement("option");
			option.text = key;
			option.value = key;
			town.appendChild(option);
		}

		ipcRenderer.send("config:value", "location.town", town.options[town.selectedIndex].value);
	}

	for (let i = 0; i < Object.keys(station).length; i++)
		if (Object.keys(station)[i] == value)
			for (let index = 1; index < 6; index++)
				if (id == "Real-time.station." + index) {
					const text = document.getElementById("Real-time.station." + index + ".text");
					text.innerHTML = `即時測站波形圖${index} 已設定 ${Object.keys(station)[i]}`;
					text.style = "margin-top: 4px; color: rgb(var(--md-sys-color-on-background));";
				}

	if (id == "location.city" || id == "location.town") {
		const city = document.getElementById("location.city");
		const town = document.getElementById("location.town");
		const Loc = TREM.Resources.region[city.options[city.selectedIndex].value][town.options[town.selectedIndex].value];
		let stamp = 0;
		let loc = "";

		for (let index = 0; index < Object.keys(station).length; index++) {
			const num = Math.abs(Loc.latitude - station[Object.keys(station)[index]].Lat, 2) + Math.pow(Loc.longitude - station[Object.keys(station)[index]].Long, 2);

			if (stamp == 0) {
				stamp = num;
				loc = Object.keys(station)[index];
			} else if (stamp > num) {
				stamp = num;
				loc = Object.keys(station)[index];
			}
		}

		ipcRenderer.send("config:value", "Real-time.station", loc);
	}
}

let runconsti = 0;
let Real_time_alert;

function Real_time_alert_run() {
	Real_time_alert_showDialog(runconsti);

	if (runconsti > 2) {
		clearTimeout(Real_time_alert);
	} else if (runconsti < 2) {
		runconsti += 1;
		Real_time_alert = setTimeout(() => {
			document.getElementById("Real-time.alert").checked = true;
			Real_time_alert_run();
		}, 30_000);
	}
}

function Real_time_alert_showDialog(runconstij) {
	showDialog("warn",
		TREM.Localization.getString("Setting_Dialog_Real_time_alert_Title"),
		TREM.Localization.getString("Setting_Dialog_Real_time_alert_Description"),
		1, "warning", () => {
			if (runconstij == 2) ipcRenderer.send("config:value", "Real-time.alert", true);
			else document.getElementById("Real-time.alert").checked = false;
		}, "確認", "取消", () => {
			document.getElementById("Real-time.alert").checked = false;
		});
}

let runconstk = 0;
let trem_eq_Notification;

function trem_eq_Notification_run() {
	trem_eq_Notification_showDialog(runconstk);

	if (runconstk > 2) {
		clearTimeout(trem_eq_Notification);
	} else if (runconstk < 2) {
		runconstk += 1;
		trem_eq_Notification = setTimeout(() => {
			document.getElementById("trem-eq.Notification").checked = true;
			trem_eq_Notification_run();
		}, 30_000);
	}
}

function trem_eq_Notification_showDialog(runconstil) {
	showDialog("warn",
		TREM.Localization.getString("Setting_Dialog_trem_eq_Notification_Title"),
		TREM.Localization.getString("Setting_Dialog_trem_eq_Notification_Description"),
		1, "warning", () => {
			if (runconstil == 2) {
				const element = document.getElementById("trem-eq.alert.Notification");
				element.checked = false;

				if (is_setting_disabled) element.disabled = true;
				else element.disabled = false;

				ipcRenderer.send("config:value", "trem-eq.alert.Notification", false);
				log(`Value Changed trem-eq.alert.Notification: ${setting["trem-eq.alert.Notification"]} -> false`, 1, "Setting", "CheckSave");
				dump({ level: 0, message: `Value Changed trem-eq.alert.Notification: ${setting["trem-eq.alert.Notification"]} -> false`, origin: "Setting" });
				ipcRenderer.send("config:value", "trem-eq.Notification", true);
			} else {
				document.getElementById("trem-eq.Notification").checked = false;
			}
		}, "確認", "取消", () => {
			document.getElementById("trem-eq.Notification").checked = false;
		});
}

function stream_mode(value) {
	if (value) {
		document.getElementById("report.changeView").checked = false;
		document.getElementById("report.changeView").disabled = true;
		ipcRenderer.send("config:value", "report.changeView", false);
		document.getElementById("report.onlycwbchangeView").checked = true;
		document.getElementById("report.onlycwbchangeView").disabled = true;
		ipcRenderer.send("config:value", "report.onlycwbchangeView", true);
		document.getElementById("report.getInfo").checked = false;
		document.getElementById("report.getInfo").disabled = true;
		ipcRenderer.send("config:value", "report.getInfo", false);
		document.getElementById("report.trem").checked = false;
		document.getElementById("report.trem").disabled = true;
		ipcRenderer.send("config:value", "report.trem", false);
		document.getElementById("Real-time.alert").checked = false;
		document.getElementById("Real-time.alert").disabled = true;
		ipcRenderer.send("config:value", "Real-time.alert", false);
		document.getElementById("trem.ps").checked = false;
		document.getElementById("trem.ps").disabled = true;
		ipcRenderer.send("config:value", "trem.ps", false);
		document.getElementById("accept.eew.trem").checked = false;
		document.getElementById("accept.eew.trem").disabled = true;
		ipcRenderer.send("config:value", "accept.eew.trem", false);
	} else if (!value) {
		document.getElementById("report.changeView").disabled = false;
		document.getElementById("report.onlycwbchangeView").disabled = false;
		document.getElementById("report.getInfo").disabled = false;
		document.getElementById("report.trem").disabled = false;
		document.getElementById("Real-time.alert").disabled = false;
		document.getElementById("trem.ps").disabled = false;
		document.getElementById("accept.eew.trem").disabled = false;
	}
}

function CheckSave(id) {
	const value = document.getElementById(id).checked;
	log(`Value Changed ${id}: ${setting[id]} -> ${value}`, 1, "Setting", "CheckSave");
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });

	if (id == "Real-time.alert" && value) {
		runconsti = 0;
		Real_time_alert_run();
	} else if (id == "alert" && !value) {
		clearTimeout(Real_time_alert);
		ipcRenderer.send("config:value", id, value);
	} else if (id == "trem-eq.Notification" && value) {
		runconstk = 0;
		trem_eq_Notification_run();
	} else if (id == "trem-eq.Notification" && !value) {
		clearTimeout(trem_eq_Notification);
		ipcRenderer.send("config:value", id, value);
	} else {
		ipcRenderer.send("config:value", id, value);
	}

	if (id == "sleep.mode" && value)
		ipcRenderer.send("sleep", value);

	if (id == "sleep.mode" && !value)
		ipcRenderer.send("sleep", value);

	if (id == "report.onlycwbchangeView" && value) {
		document.getElementById("report.changeView").checked = false;
		ipcRenderer.send("config:value", "report.changeView", false);
	}

	if (id == "report.changeView" && value) {
		document.getElementById("report.onlycwbchangeView").checked = false;
		ipcRenderer.send("config:value", "report.onlycwbchangeView", false);
	}

	if (id == "trem-eq.alert.Notification") {
		const element = document.getElementById("trem-eq.Notification");
		element.checked = false;

		if (is_setting_disabled) element.disabled = true;
		else element.disabled = false;

		ipcRenderer.send("config:value", "trem-eq.Notification", false);
		log(`Value Changed trem-eq.Notification: ${setting["trem-eq.Notification"]} -> false`, 1, "Setting", "CheckSave");
		dump({ level: 0, message: `Value Changed trem-eq.Notification: ${setting["trem-eq.Notification"]} -> false`, origin: "Setting" });
	}

	if (id == "Real-time.local")
		ipcRenderer.send("Mainreloadpage");

	if (
		id == "map.jp"
		|| id == "map.cn"
		|| id == "map.sk"
		|| id == "map.nk"
		|| id == "map.ph"
		|| id == "map.NZ"
		|| id == "map.in"
		|| id == "map.TU"
		|| id == "map.ta"
		|| id == "map.papua"
		|| id == "map.panama"
		|| id == "map.va"
		|| id == "map.ec"
		|| id == "map.af"
		|| id == "map.ru"
		|| id == "map.cl"
		|| id == "map.ar"
		|| id == "map.gu")
		$("#MAPReloadButton").fadeIn(100);

	if (id == "compatibility.hwaccel")
		$("#HAReloadButton").fadeIn(100);

	if (id == "compatibility.3DAPI")
		$("#3DReloadButton").fadeIn(100);

	if (id == "p2p.mode")
		$("#P2PReloadButton").fadeIn(100);

	if (id == "stream.mode")
		stream_mode(value);

	if (id == "theme.customColor")
		if (value)
			$("#intensity-palette-container").fadeIn(100).removeClass("hide");
		else
			$("#intensity-palette-container").fadeOut(100).addClass("hide");
}

function CheckHide(id) {
	const value = document.getElementById(id).checked;

	if (id == "api.key.Hide")
		if (value)
			document.getElementById("api.key").type = "password";
		else
			document.getElementById("api.key").type = "text";

	if (id == "rtw.api.key.Hide")
		if (value)
			document.getElementById("rtw.api.key").type = "password";
		else
			document.getElementById("rtw.api.key").type = "text";

	if (id == "exptech.name.Hide")
		if (value)
			document.getElementById("exptech.name").type = "password";
		else
			document.getElementById("exptech.name").type = "text";

	if (id == "exptech.email.Hide")
		if (value)
			document.getElementById("exptech.email").type = "password";
		else
			document.getElementById("exptech.email").type = "text";

	if (id == "exptech.pass.Hide")
		if (value)
			document.getElementById("exptech.pass").type = "password";
		else
			document.getElementById("exptech.pass").type = "text";
	ipcRenderer.send("config:value", id, value);
}

function TextSave(id) {
	const value = document.getElementById(id).value;
	log(`Value Changed ${id}: ${setting[id]} -> ${value}`, 1, "Setting", "TextSave");
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });

	if (id == "api.key")
		if (value.length <= 0)
			return;
		else
			setTimeout(() => {
				ipcRenderer.send("apikey");
			}, 1_000);
	ipcRenderer.send("config:value", id, value);
}

function KeyTextSave(id) {
	const value = document.getElementById(id).value;
	log(`Value Changed ${id}: ${setting[id]} -> ${value}`, 1, "Setting", "KeyTextSave");
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);
}

function ChoiceSave(id, el) {
	const value = el.value;
	log(`Value Changed ${id}: ${setting[id]} -> ${value}`, 1, "Setting", "ChoiceSave");
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, value);

	if (id == "update.mode") {
		const element = document.getElementById("update.time");
		$("#UDReloadButton").fadeIn(100);

		if (value == "never")
			element.disabled = true;
		else if (value == "notify")
			element.disabled = false;
		else if (value == "download")
			element.disabled = false;
		else if (value == "install")
			element.disabled = false;
	}
}

function RangeSave(id) {
	const value = document.getElementById(id).value;
	log(`Value Changed ${id}: ${setting[id]} -> ${value}`, 1, "Setting", "RangeSave");
	dump({ level: 0, message: `Value Changed ${id}: ${setting[id]} -> ${value}`, origin: "Setting" });
	ipcRenderer.send("config:value", id, +value);
}


/**
 * 切換設定分類
 * @param {string} args 設定分類
 * @param {HTMLElement} el 觸發事件的物件
 * @param {Event} event 事件
 * @returns {void}
 */
function setList(args, el, event) {
	if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ")
		return;

	log(`Changed view to ${args}`, 1, "Setting", "setList");
	dump({ level: 0, message: `Changed view to ${args}`, origin: "Setting" });
	const currentel = $(".show");
	const changeel = $(`#${args}`);

	if (changeel.attr("id") == currentel.attr("id")) return;

	const currentnav = $(".active");
	currentnav.removeClass("active");
	$(el).addClass("active");

	changeel.children("div").each((i, e) => {
		if (![
			"P2PReloadButton",
			"HAReloadButton",
			"3DReloadButton",
			"MEReloadButton",
			"MAPReloadButton",
			"UDReloadButton",
		].includes(e.id))
			$(e).css("opacity", "0");
		$(e).children().each((i2, e2) => {
			if (![
				"P2PReloadButton",
				"HAReloadButton",
				"3DReloadButton",
				"MEReloadButton",
				"MAPReloadButton",
				"UDReloadButton",
			].includes(e2.id))
				$(e2).css("opacity", "0");
		});
	});
	changeel.hide().delay(100).addClass("show").fadeIn(200);
	currentel.fadeOut(100).removeClass("show").show();
	$("#list").delay(100)[0].scrollTo(0, 0);

	const changeelchild = $(`#${args} > div`);

	let delay = 0;

	for (let i = 0; i < changeelchild.length; i++) {
		$(changeelchild[i]).delay(delay + 30 * i).fadeTo(100, is_setting_disabled ? 0.6 : 1).delay(100)
			.queue(function(next) {
				$(this).css("opacity", "");
				next();
			});
		delay += 15;
		const child = changeelchild[i].children;

		if (child.length)
			for (let j = 0; j < child.length; j++)
				if (![
					"P2PReloadButton",
					"HAReloadButton",
					"3DReloadButton",
					"MEReloadButton",
					"MAPReloadButton",
					"UDReloadButton",
				].includes(child[j].id)) {
					if (!child[j].lang || (child[j].lang == setting["general.locale"]))
						$(child[j]).delay(delay).fadeTo(100, is_setting_disabled ? 0.6 : 1).delay(100)
							.queue(function(next) {
								$(this).css("opacity", "");
								next();
							});
					delay += 15;
				}

	}

	if (args == "Test1") {
		if (document.getElementById("intensitybtn").checked) {
			document.getElementById("intensity.div").style.display = "";
			document.getElementById("test.text").style.display = "none";
			document.getElementById("ID.text").style.display = "none";
			document.getElementById("Location.text").style.display = "none";
		}

		if (!document.getElementById("intensitybtn").checked) {
			document.getElementById("intensity.div").style.display = "none";
			document.getElementById("test.text").style.display = "";
			document.getElementById("ID.text").style.display = "";
			document.getElementById("Location.text").style.display = "";
		}

		if (!document.getElementById("tsunamialertbtn").checked) document.getElementById("tsunami.div").style.display = "none";

		if (!document.getElementById("tsunami.EN.open").checked) document.getElementById("tsunami.EN").disabled = true;

		if (!document.getElementById("tsunami.E.open").checked) document.getElementById("tsunami.E").disabled = true;

		if (!document.getElementById("tsunami.ES.open").checked) document.getElementById("tsunami.ES").disabled = true;

		if (!document.getElementById("tsunami.N.open").checked) document.getElementById("tsunami.N").disabled = true;

		if (!document.getElementById("tsunami.W.open").checked) document.getElementById("tsunami.W").disabled = true;

		if (!document.getElementById("tsunami.WS.open").checked) document.getElementById("tsunami.WS").disabled = true;
	}
}

function tsunamialertbtn(checked) {
	if (document.getElementById("intensitybtn").checked) {
		document.getElementById("intensitybtn").checked = false;
		document.getElementById("intensity.div").style.display = "none";
		document.getElementById("test.text").style.display = "";
		document.getElementById("ID.text").style.display = "";
		document.getElementById("Location.text").style.display = "";
	}

	if (checked)
		document.getElementById("tsunami.div").style.display = "";
	else
		document.getElementById("tsunami.div").style.display = "none";
}

function intensitybtn(checked) {
	if (document.getElementById("tsunamialertbtn").checked) {
		document.getElementById("tsunamialertbtn").checked = false;
		document.getElementById("tsunami.div").style.display = "none";
	}

	if (checked) {
		document.getElementById("intensity.div").style.display = "";
		document.getElementById("test.text").style.display = "none";
		document.getElementById("ID.text").style.display = "none";
		document.getElementById("Location.text").style.display = "none";
	} else {
		document.getElementById("intensity.div").style.display = "none";
		document.getElementById("test.text").style.display = "";
		document.getElementById("ID.text").style.display = "";
		document.getElementById("Location.text").style.display = "";
	}
}

function tsunamiopen(checked, name) {
	const element = document.getElementById("tsunami." + name);

	if (checked)
		element.disabled = false;
	else
		element.disabled = true;
}

function send() {
	let data = {};
	let Unit_type = "eew-test";
	const testtext_value = document.getElementById("testtext").value;

	if (testtext_value == "中央氣象局") Unit_type = "eew-cwb";

	if (testtext_value == "防災科学技術研究所") Unit_type = "eew-nied";

	if (testtext_value == "日本氣象廳") Unit_type = "eew-jma";

	if (testtext_value == "韓國氣象廳") Unit_type = "eew-kma";

	if (testtext_value == "福建省地震局") Unit_type = "eew-fjdzj";

	if (testtext_value == "四川省地震局") Unit_type = "eew-scdzj";

	if (testtext_value == "NSSPE") Unit_type = "trem-eew";

	let unit_name = "";
	let raw = {};

	if (document.getElementById("intensitybtn").checked) {
		Unit_type = "intensity";
		unit_name = document.getElementById("intensity.unit").options[document.getElementById("intensity.unit").selectedIndex].value;
		raw = {
			info: {
				depth : document.getElementById("Depth").value,
				lat   : document.getElementById("NorthLatitude").value,
				lon   : document.getElementById("EastLongitude").value,
				scale : parseFloat(document.getElementById("Scale").value),
				time  : new Date(document.getElementById("Time").value).getTime(),
			},
			intensity: JSON.parse(document.getElementById("intensitytext").value),
		};

		if (document.getElementById("UUID").value != "")
			data = {
				APIkey        : "https://github.com/ExpTechTW",
				Function      : "Send",
				Type          : "test",
				FormatVersion : 1,
				UUID          : document.getElementById("UUID").value,
				Value         : {
					type      : Unit_type,
					timestamp : new Date(document.getElementById("TimeStamp").value).getTime(),
					unit      : unit_name,
					raw       : raw,
					number    : parseInt(document.getElementById("Version").value),
				},
			};
		else
			data = {
				APIkey        : "https://github.com/ExpTechTW",
				Function      : "Send",
				Type          : "test",
				FormatVersion : 1,
				UUID          : `rts-TREM-${localStorage.UUID_rts}`,
				Value         : {
					type      : Unit_type,
					timestamp : new Date(document.getElementById("TimeStamp").value).getTime(),
					unit      : unit_name,
					raw       : raw,
					number    : parseInt(document.getElementById("Version").value),
				},
			};
	} else if (!document.getElementById("tsunamialertbtn").checked) {
		if (document.getElementById("UUID").value != "")
			data = {
				APIkey        : "https://github.com/ExpTechTW",
				Function      : "Send",
				Type          : "test",
				FormatVersion : 1,
				UUID          : document.getElementById("UUID").value,
				Value         : {
					Function      : "earthquake",
					Type          : "data",
					type          : Unit_type,
					time          : new Date(document.getElementById("Time").value).getTime(),
					lon           : document.getElementById("EastLongitude").value,
					lat           : document.getElementById("NorthLatitude").value,
					depth         : document.getElementById("Depth").value,
					scale         : parseFloat(document.getElementById("Scale").value),
					FormatVersion : 1,
					timestamp     : new Date(document.getElementById("TimeStamp").value).getTime(),
					"UTC+8"       : document.getElementById("Time").value,
					number        : parseInt(document.getElementById("Version").value),
					id            : document.getElementById("ID").value,
					Test          : document.getElementById("testbtn").checked,
					Unit          : document.getElementById("testtext").value,
					unit          : unit_name,
					raw           : raw,
					location      : document.getElementById("Location").value,
					Alert         : document.getElementById("alertbtn").checked,
					final         : document.getElementById("finalbtn").checked,
					cancel        : document.getElementById("cancelbtn").checked,
				},
			};
		else
			data = {
				APIkey        : "https://github.com/ExpTechTW",
				Function      : "Send",
				Type          : "test",
				FormatVersion : 1,
				UUID          : `rts-TREM-${localStorage.UUID_rts}`,
				Value         : {
					Function      : "earthquake",
					Type          : "data",
					type          : Unit_type,
					time          : new Date(document.getElementById("Time").value).getTime(),
					lon           : document.getElementById("EastLongitude").value,
					lat           : document.getElementById("NorthLatitude").value,
					depth         : document.getElementById("Depth").value,
					scale         : parseFloat(document.getElementById("Scale").value),
					FormatVersion : 1,
					timestamp     : new Date(document.getElementById("TimeStamp").value).getTime(),
					"UTC+8"       : document.getElementById("Time").value,
					number        : parseInt(document.getElementById("Version").value),
					id            : document.getElementById("ID").value,
					Test          : document.getElementById("testbtn").checked,
					Unit          : document.getElementById("testtext").value,
					unit          : unit_name,
					raw           : raw,
					location      : document.getElementById("Location").value,
					Alert         : document.getElementById("alertbtn").checked,
					final         : document.getElementById("finalbtn").checked,
					cancel        : document.getElementById("cancelbtn").checked,
				},
			};
	} else {
		const tsunamiEN = document.getElementById("tsunami.EN").options[document.getElementById("tsunami.EN").selectedIndex].value;
		const tsunamiE = document.getElementById("tsunami.E").options[document.getElementById("tsunami.E").selectedIndex].value;
		const tsunamiES = document.getElementById("tsunami.ES").options[document.getElementById("tsunami.ES").selectedIndex].value;
		const tsunamiN = document.getElementById("tsunami.N").options[document.getElementById("tsunami.N").selectedIndex].value;
		const tsunamiW = document.getElementById("tsunami.W").options[document.getElementById("tsunami.W").selectedIndex].value;
		const tsunamiWS = document.getElementById("tsunami.WS").options[document.getElementById("tsunami.WS").selectedIndex].value;

		const tsunamiENopen = document.getElementById("tsunami.EN.open").checked;
		const tsunamiEopen = document.getElementById("tsunami.E.open").checked;
		const tsunamiESopen = document.getElementById("tsunami.ES.open").checked;
		const tsunamiNopen = document.getElementById("tsunami.N.open").checked;
		const tsunamiWopen = document.getElementById("tsunami.W.open").checked;
		const tsunamiWSopen = document.getElementById("tsunami.WS.open").checked;

		if (document.getElementById("UUID").value != "")
			data = {
				APIkey        : "https://github.com/ExpTechTW",
				Function      : "Send",
				Type          : "test",
				FormatVersion : 1,
				UUID          : document.getElementById("UUID").value,
				Value         : {
					Function      : "earthquake",
					Type          : "data",
					type          : "tsunami",
					lon           : document.getElementById("EastLongitude").value,
					lat           : document.getElementById("NorthLatitude").value,
					scale         : parseFloat(document.getElementById("Scale").value),
					FormatVersion : 1,
					timestamp     : new Date(document.getElementById("TimeStamp").value).getTime(),
					number        : parseInt(document.getElementById("Version").value),
					area          : [
						tsunamiENopen ? { areaName: "東北沿海地區", waveHeight: tsunamiEN, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiEopen ? { areaName: "東部沿海地區", waveHeight: tsunamiE, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiESopen ? { areaName: "東南沿海地區", waveHeight: tsunamiES, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiNopen ? { areaName: "北部沿海地區", waveHeight: tsunamiN, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiWopen ? { areaName: "海峽沿海地區", waveHeight: tsunamiW, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiWSopen ? { areaName: "西南沿海地區", waveHeight: tsunamiWS, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
					],
					final  : document.getElementById("finalbtn").checked,
					cancel : document.getElementById("cancelbtn").checked,
				},
			};
		else
			data = {
				APIkey        : "https://github.com/ExpTechTW",
				Function      : "Send",
				Type          : "test",
				FormatVersion : 1,
				UUID          : `rts-TREM-${localStorage.UUID_rts}`,
				Value         : {
					Function      : "earthquake",
					Type          : "data",
					type          : "tsunami",
					lon           : document.getElementById("EastLongitude").value,
					lat           : document.getElementById("NorthLatitude").value,
					scale         : parseFloat(document.getElementById("Scale").value),
					FormatVersion : 1,
					timestamp     : new Date(document.getElementById("TimeStamp").value).getTime(),
					number        : parseInt(document.getElementById("Version").value),
					area          : [
						tsunamiENopen ? { areaName: "東北沿海地區", waveHeight: tsunamiEN, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiEopen ? { areaName: "東部沿海地區", waveHeight: tsunamiE, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiESopen ? { areaName: "東南沿海地區", waveHeight: tsunamiES, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiNopen ? { areaName: "北部沿海地區", waveHeight: tsunamiN, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiWopen ? { areaName: "海峽沿海地區", waveHeight: tsunamiW, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
						tsunamiWSopen ? { areaName: "西南沿海地區", waveHeight: tsunamiWS, arrivalTime: new Date(document.getElementById("Time").value).getTime() } : {},
					],
					final  : document.getElementById("finalbtn").checked,
					cancel : document.getElementById("cancelbtn").checked,
				},
			};
	}

	axios.post("https://exptech.com.tw/api/v1/et", data)
		.then((response) => {
			if (response.data.response == "State Close") {
				document.getElementById("sendState").innerHTML = "設備未連接至伺服器";
				console.log("設備未連接至伺服器");
			} else if (response.data.response == "Device Not Found") {
				document.getElementById("sendState").innerHTML = "找不到此 UUID 的設備";
				console.log("找不到此 UUID 的設備");
			} else {
				document.getElementById("sendState").innerHTML = "發送成功，第" + data.Value.number + "報";
				console.log("發送成功 請刷新網頁");
			}

			document.getElementById("Version").value = Number(document.getElementById("Version").value) + 1;
			const utc = new Date();
			const NOW = new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000 + 60 * 60 * 8 * 1000);
			const now = new Date(NOW.getTime() - 20000);
			const Now1 = now.getFullYear()
			+ "-" + (now.getMonth() + 1)
			+ "-" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes()
			+ ":" + now.getSeconds();
			document.getElementById("Time").value = Now1;
			const now1 = new Date(NOW.getTime());
			const Now2 = now1.getFullYear()
			+ "-" + (now1.getMonth() + 1)
			+ "-" + now1.getDate()
			+ " " + now1.getHours()
			+ ":" + now1.getMinutes()
			+ ":" + now1.getSeconds();
			document.getElementById("TimeStamp").value = Now2;
		});
}

function resend() {
	document.getElementById("intensitybtn").checked = false;
	document.getElementById("testbtn").checked = true;
	document.getElementById("alertbtn").checked = true;
	document.getElementById("tsunamialertbtn").checked = false;
	document.getElementById("finalbtn").checked = false;
	document.getElementById("cancelbtn").checked = false;
	document.getElementById("tsunami.EN").options[0].selected = true;
	document.getElementById("tsunami.E").options[0].selected = true;
	document.getElementById("tsunami.ES").options[0].selected = true;
	document.getElementById("tsunami.N").options[0].selected = true;
	document.getElementById("tsunami.W").options[0].selected = true;
	document.getElementById("tsunami.WS").options[0].selected = true;
	document.getElementById("tsunami.EN.open").checked = false;
	document.getElementById("tsunami.E.open").checked = false;
	document.getElementById("tsunami.ES.open").checked = false;
	document.getElementById("tsunami.N.open").checked = false;
	document.getElementById("tsunami.W.open").checked = false;
	document.getElementById("tsunami.WS.open").checked = false;

	if (!document.getElementById("tsunami.EN.open").checked) document.getElementById("tsunami.EN").disabled = true;

	if (!document.getElementById("tsunami.E.open").checked) document.getElementById("tsunami.E").disabled = true;

	if (!document.getElementById("tsunami.ES.open").checked) document.getElementById("tsunami.ES").disabled = true;

	if (!document.getElementById("tsunami.N.open").checked) document.getElementById("tsunami.N").disabled = true;

	if (!document.getElementById("tsunami.W.open").checked) document.getElementById("tsunami.W").disabled = true;

	if (!document.getElementById("tsunami.WS.open").checked) document.getElementById("tsunami.WS").disabled = true;
	tsunamialertbtn(false);
	intensitybtn(false);
	document.getElementById("testtext").value = "測試模式";
	document.getElementById("ID").value = "111000";
	const utc = new Date();
	const NOW = new Date(utc.getTime() + utc.getTimezoneOffset() * 60 * 1000 + 60 * 60 * 8 * 1000);
	const now = new Date(NOW.getTime() - 20000);
	const Now3 = now.getFullYear()
		+ "-" + (now.getMonth() + 1)
		+ "-" + now.getDate()
		+ " " + now.getHours()
		+ ":" + now.getMinutes()
		+ ":" + now.getSeconds();
	document.getElementById("Time").value = Now3;
	const now1 = new Date(NOW.getTime());
	const Now4 = now1.getFullYear()
		+ "-" + (now1.getMonth() + 1)
		+ "-" + now1.getDate()
		+ " " + now1.getHours()
		+ ":" + now1.getMinutes()
		+ ":" + now1.getSeconds();
	document.getElementById("TimeStamp").value = Now4;
	document.getElementById("EastLongitude").value = "120.7";
	document.getElementById("NorthLatitude").value = "22.2";
	document.getElementById("Location").value = "未知區域";
	document.getElementById("Depth").value = "10";
	document.getElementById("Scale").value = "5.0";
	document.getElementById("Version").value = "1";
	document.getElementById("UUID").value = "";
	document.getElementById("sendState").innerHTML = "已重置";
}

function testEEW() {
	ipcRenderer.send("testEEW");
	ipcRenderer.send("closeChildWindow");
}

function testoldtimeEEW() {
	const oldtime = new Date(document.getElementById("oldtime").value).getTime();
	ipcRenderer.send("testoldtimeEEW", oldtime);
}

function testreplaytime() {
	let replaytime = document.getElementById("replaytime").value;

	// 刪除字串中所有非數字的字符
	replaytime = replaytime.replace(/\D/g, "");

	// 確認replaytime是13位數，不足的話在後面補0
	replaytime = parseInt(replaytime.padEnd(13, "0"));

	console.debug(replaytime);
	ipcRenderer.send("testreplaytime", replaytime);
}

function testoldtremEEW() {
	const oldtrem = document.getElementById("oldtrem").value;
	ipcRenderer.send("testoldtremEEW", oldtrem);
}

function linkpathtest() {
	ipcRenderer.send("linkpathtest", setting["link.path"], setting["link.name"]);
}

function reset() {
	showDialog("warn",
		TREM.Localization.getString("Setting_Dialog_Reset_Title"),
		TREM.Localization.getString("Setting_Dialog_Reset_Description"),
		1, "device_reset", () => {
			setting = {};
			localStorage.clear();
			ipcRenderer.send("saveSetting");
			restart();
		});
}

function openLogFolder() {
	shell.openPath(app.getPath("logs"));
}

function openScreenshotsFolder() {
	ipcRenderer.send("openScreenshotsFolder");
}

function openEEWScreenshotsFolder() {
	ipcRenderer.send("openEEWScreenshotsFolder");
}

function openUpdateFolder() {
	ipcRenderer.send("openUpdateFolder");
}

function openreplayFolder() {
	ipcRenderer.send("openreplayFolder");
}

function openexportFolder() {
	ipcRenderer.send("openexportFolder");
}

function export_report() {
	let _report_data = [];
	_report_data = storage.getItem("report_data");
	// 轉換成格式化的 JSON 字串
	const jsonString = JSON.stringify(_report_data, null, 2);

	// 指定匯出檔案的路徑和檔案名稱
	const folder = path.join(app.getPath("userData"), "export");
	const exportPath = folder + "\\export_report.json";

	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	// 將 JSON 字串寫入檔案
	fs.writeFile(exportPath, jsonString, "utf8", (err) => {
		if (err) {
			showDialog("error", "匯出地震報告(資訊)", `無法匯出檔案:\n${err}`);
			console.error("無法匯出檔案:", err);
		} else {
			showDialog("success",
				"匯出地震報告(資訊)",
				"匯出地震報告(資訊) JSON 檔案已成功匯出！");
		}
	});
}

function export_trem_report() {
	let _report_trem_data = [];
	_report_trem_data = storage.getItem("report_trem_data");
	// 轉換成格式化的 JSON 字串
	const jsonString = JSON.stringify(_report_trem_data, null, 2);

	// 指定匯出檔案的路徑和檔案名稱
	const folder = path.join(app.getPath("userData"), "export");
	const exportPath = folder + "\\export_trem_report.json";

	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	// 將 JSON 字串寫入檔案
	fs.writeFile(exportPath, jsonString, "utf8", (err) => {
		if (err) {
			showDialog("error", "匯出TREM地震報告(資訊)", `無法匯出檔案:\n${err}`);
			console.error("無法匯出檔案:", err);
		} else {
			showDialog("success",
				"匯出TREM地震報告(資訊)",
				"匯出TREM地震報告(資訊) JSON 檔案已成功匯出！");
		}
	});
}

function import_report() {
	// 指定匯入檔案的路徑和檔案名稱
	const folder = path.join(app.getPath("userData"), "export");
	const importPath = folder + "\\export_report.json";

	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	// 讀取 JSON 檔案
	fs.readFile(importPath, "utf8", (err, data) => {
		if (err) {
			showDialog("error", "匯入地震報告(資訊)", `無法讀取檔案:\n${err}`);
			console.error("無法讀取檔案:", err);
		} else {
			try {
				// 解析 JSON 字串為 JavaScript 物件
				const json = JSON.parse(data);
				storage.setItem("report_data", json);
				showDialog("success",
					"匯入地震報告(資訊)",
					"匯入地震報告(資訊) JSON 檔案已成功匯入！");

				// 在這裡您可以使用 json 物件，例如將其存儲到本地或進行其他處理
				console.log("匯入的 JSON:", json);
			} catch (parseError) {
				showDialog("error", "匯入地震報告(資訊)", `JSON 解析失敗:\n${parseError}`);
				console.error("JSON 解析失敗:", parseError);
			}
		}
	});
}

function import_trem_report() {
	// 指定匯入檔案的路徑和檔案名稱
	const folder = path.join(app.getPath("userData"), "export");
	const importPath = folder + "\\export_trem_report.json";

	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	// 讀取 JSON 檔案
	fs.readFile(importPath, "utf8", (err, data) => {
		if (err) {
			showDialog("error", "匯入TREM地震報告(資訊)", `無法讀取檔案:\n${err}`);
			console.error("無法讀取檔案:", err);
		} else {
			try {
				// 解析 JSON 字串為 JavaScript 物件
				const json = JSON.parse(data);
				storage.setItem("report_trem_data", json);
				showDialog("success",
					"匯入TREM地震報告(資訊)",
					"匯入TREM地震報告(資訊) JSON 檔案已成功匯入！");

				// 在這裡您可以使用 json 物件，例如將其存儲到本地或進行其他處理
				console.log("匯入的 JSON:", json);
			} catch (parseError) {
				showDialog("error", "匯入TREM地震報告(資訊)", `JSON 解析失敗:\n${parseError}`);
				console.error("JSON 解析失敗:", parseError);
			}
		}
	});
}

function openSettingFile() {
	ipcRenderer.send("config:open");
}

function openreleases() {
	ipcRenderer.send("openreleases");
}

const restart = () => {
	ipcRenderer.send("restart");
};

const testAudioState = {
	audio      : new Audio(),
	is_playing : false,
	Listener() {
		testAudioState.audio.addEventListener("ended", () => {
			testAudioState.is_playing = false;
			testAudioBtn.style.removeProperty("--progress");
			testAudioBtn.childNodes[1].textContent = "play_arrow";
			testAudioBtn.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
		});
		testAudioState.audio.addEventListener("timeupdate", () => {
			console.log(testAudioState.audio.currentTime);
			console.log(testAudioState.audio.duration);
			testAudioBtn.style.setProperty("--progress", (testAudioState.audio.currentTime / (testAudioState.audio.duration - 0.25)) || 0);
		});
	},
};

let testAudioBtn;

/**
 * @param {string} audioString
 * @param {HTMLElement} el
 */
const testAudio = (audioString, el) => {
	if (el != testAudioBtn && testAudioBtn != undefined) {
		testAudioState.audio.pause();
		testAudioState.audio.currentTime = 0;
		testAudioState.is_playing = false;
		testAudioBtn.style.removeProperty("--progress");
		testAudioBtn.childNodes[1].textContent = "play_arrow";
		testAudioBtn.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
	}

	testAudioBtn = el;

	if (!testAudioState.is_playing) {
		testAudioState.audio = new Audio("../audio/" + audioString + ".wav");
		testAudioState.Listener();
		testAudioState.audio.play();
		testAudioState.is_playing = true;
		el.childNodes[1].textContent = "pause";
		el.childNodes[3].textContent = TREM.Localization.getString("Audio_TestStop");
	} else {
		testAudioState.audio.pause();
		testAudioState.audio.currentTime = 0;
		testAudioState.is_playing = false;
		testAudioBtn.style.removeProperty("--progress");
		el.childNodes[1].textContent = "play_arrow";
		el.childNodes[3].textContent = TREM.Localization.getString("Audio_Test");
	}
};

const testAudioTTS = () => {
	const speecd_use = setting["audio.tts"] ?? false;

	if (speecd_use) TREM.speech.speak({ text: "This is a test voice sent by TREM" });
};

const webhook = async () => {
	if (setting["webhook.url"].length == 0)
		return showDialog("error",
			TREM.Localization.getString("Webhook_Dialog_Error_Title"),
			TREM.Localization.getString("Webhook_Dialog_Error_Empty"),
		);

	const url = setting["webhook.url"].match(
		// eslint-disable-next-line no-useless-escape
		/^https?:\/\/(?:canary|ptb)?\.?discord\.com\/api\/webhooks(?:\/v[0-9]\d*)?\/([^\/]+)\/([^\/]+)/i,
	);

	if (!url || url.length <= 1)
		return showDialog("error",
			TREM.Localization.getString("Webhook_Dialog_Error_Title"),
			TREM.Localization.getString("Webhook_Dialog_Error_Invalid"));

	const { EmbedBuilder, WebhookClient } = require("discord.js");

	const embeds = [
		new EmbedBuilder()
			.setDescription("這是一則由 TREM 發送的測試訊息")
			.setColor("Blue")
			.setFooter({ text: "ExpTech Studio", iconURL: "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png" })
			.setTimestamp(),
	];

	await new WebhookClient({ url: setting["webhook.url"] })
		.send({ embeds, username: "TREM | 臺灣即時地震監測", avatarURL: "https://cdn.discordapp.com/attachments/976452418114048051/976469802644291584/received_1354357138388018.webp", content: setting["tts.Notification"] ? "這是一則由 TREM 發送的測試訊息" : "", tts: setting["tts.Notification"] })
		.then(m => {
			showDialog("success",
				TREM.Localization.getString("Webhook_Dialog_Title"),
				TREM.Localization.getString("Webhook_Dialog_Success").format(m.id, m.channel_id));
		}).catch(error => {
			showDialog("error", "Webhook 測試", `Webhook 發送測試訊息時發生錯誤\n${error}`);
			log(error, 3, "Setting", "webhook");
			dump({ level: 2, message: error });
		});
};

const colorUpdate = (el) => {
	document.getElementById(el.id.replace(/\./g, "-")).style.backgroundColor = el.value;
};

const showError = () => {
	showDialog("error",
		TREM.Localization.getString("Setting_Dialog_Error_Title"),
		TREM.Localization.getString("Setting_Dialog_Error_Description").format(is_setting_disabled));
};

$("input[type=range]").on("input", function() {
	const value = this.value;
	$(this).siblings("span.slider-value").text(function() {
		return this.className.includes("percentage") ? ~~(value * 100) : value;
	});
})
	.on("mousedown", () => window.getSelection().removeAllRanges());

const stepLockRange = (e) => {
	if (e.shiftKey)
		$("input[type=range]")[0].step = 0.1;
};

const stepUnlockRange = (e) => {
	if (!e.shiftKey)
		$("input[type=range]")[0].step = 0.01;
};

ipcMain.on("p2p", (event, data, server_ips) => {
	// console.log(data);
	// console.log(server_ips);
	const p2p_server = document.getElementById("p2p_server");
	const p2p_server_num = document.getElementById("p2p_server_num");
	const p2p_in = document.getElementById("p2p_in");
	const p2p_in_num = document.getElementById("p2p_in_num");
	const p2p_out = document.getElementById("p2p_out");
	const p2p_out_num = document.getElementById("p2p_out_num");
	p2p_server.innerText = "";
	p2p_server_num.innerText = "";
	p2p_in.innerText = "";
	p2p_in_num.innerText = "";
	p2p_out.innerText = "";
	p2p_out_num.innerText = "";
	p2p_server.style.width = "75%";
	p2p_in.style.width = "75%";
	p2p_out.style.width = "75%";

	for (let i = 0; i < data.server.length; i++) {
		// console.log(data.server[i]);
		const p2p_server_list = document.createElement("span");
		p2p_server_list.style.display = "flex";
		p2p_server_list.style.justifycontent = "flex-end";
		p2p_server_list.style.flexWrap = "wrap";
		p2p_server_list.style.color = "white";
		p2p_server_list.style.textAlign = "right";
		let p2p_server_time = 0;
		let p2p_server_name = "";

		for (let index = 0, keys = Object.keys(data.time.server), n = keys.length; index < n; index++)
			if (data.server[i] == keys[index])
				p2p_server_time = data.time.server[keys[index]];

		for (let index = 0, keys = Object.keys(server_ips), n = keys.length; index < n; index++) {
			const server_ip = data.server[i].split(":");

			if (server_ip[0] == server_ips[keys[index]]) {
				const server_url = keys[index].split(".");
				p2p_server_name = server_url[0];
			}
		}

		const now = new Date(p2p_server_time);
		const Now = now.getFullYear()
			+ "-" + (now.getMonth() + 1)
			+ "-" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes()
			+ ":" + now.getSeconds();
		p2p_server_list.innerText = `${p2p_server_name} (最後連接時間 : ${Now})`;
		p2p_server.append(p2p_server_list);
	}

	const p2p_server_num_span = document.createElement("span");
	p2p_server_num_span.innerText = `P2P伺服器在線數 : ${data.server.length}`;
	p2p_server_num.append(p2p_server_num_span);

	for (let i = 0; i < data.in.length; i++) {
		// console.log(data.in[i]);
		const p2p_in_list = document.createElement("span");
		p2p_in_list.style.display = "flex";
		p2p_in_list.style.flexWrap = "wrap";
		p2p_in_list.style.color = "white";
		p2p_in_list.style.textAlign = "right";
		let p2p_in_time = 0;

		for (let index = 0, keys = Object.keys(data.time.in), n = keys.length; index < n; index++)
			if (data.in[i] == keys[index])
				p2p_in_time = data.time.in[keys[index]];

		const now = new Date(p2p_in_time);
		const Now = now.getFullYear()
			+ "-" + (now.getMonth() + 1)
			+ "-" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes()
			+ ":" + now.getSeconds();
		p2p_in_list.innerText = `${data.in[i]} (最後連接時間 : ${Now})`;
		p2p_in.append(p2p_in_list);
	}

	const p2p_in_num_span = document.createElement("span");
	p2p_in_num_span.innerText = `P2P接收連接數 : ${data.in.length}`;
	p2p_in_num.append(p2p_in_num_span);

	for (let i = 0; i < data.out.length; i++) {
		// console.log(data.out[i]);
		const p2p_out_list = document.createElement("span");
		p2p_out_list.style.display = "flex";
		p2p_out_list.style.flexWrap = "wrap";
		p2p_out_list.style.color = "white";
		p2p_out_list.style.textAlign = "right";
		let p2p_out_time = 0;

		for (let index = 0, keys = Object.keys(data.time.out), n = keys.length; index < n; index++)
			if (data.out[i] == keys[index])
				p2p_out_time = data.time.out[keys[index]];

		const now = new Date(p2p_out_time);
		const Now = now.getFullYear()
			+ "-" + (now.getMonth() + 1)
			+ "-" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes()
			+ ":" + now.getSeconds();
		p2p_out_list.innerText = `${data.out[i]} (最後連接時間 : ${Now})`;
		p2p_out.append(p2p_out_list);
	}

	const p2p_out_num_span = document.createElement("span");
	p2p_out_num_span.innerText = `P2P發送連接數 : ${data.out.length}`;
	p2p_out_num.append(p2p_out_num_span);
});

/*
// register the handler
document.addEventListener("keydown", stepLockRange, false);
document.addEventListener("keyup", stepUnlockRange, false);
*/