require("leaflet");
require("leaflet-edgebuffer");
require("leaflet-geojson-vt");
const { BrowserWindow } = require("@electron/remote");

const MapData = {};
const Station = {};

const folder = path.join(app.getPath("userData"), "data");

MapData.tw_county = require(path.join(__dirname, "../Resources/GeoJSON", "tw_county.json"));
MapData.tw_town = require(path.join(__dirname, "../Resources/GeoJSON", "tw_town.json"));

/**
 * @type {{main: L.Map, report: maplibregl.Map}}
 */
const Maps = { intensity: null };

/**
 * @type { {[key: string]: Map<string, maplibregl.StyleLayer>} }
 */
const MapBases = { intensity: new Map() };

TREM.Detector = {
	canvas : !!window.CanvasRenderingContext2D,
	webgl  : (function() {
		try {
			const canvas = document.createElement("canvas");
			return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
		} catch (e) {
			return false;
		}
	})(),
};

TREM.Audios = {
	palert: new Audio("../audio/palert.wav"),
};

TREM.win = BrowserWindow.fromId(process.env.intensitywindow * 1);

const color = function color(Intensity) {
	return setting["theme.customColor"] ? setting[`theme.int.${Intensity}`]
		: [
			"#757575",
			"#757575",
			"#2774C2",
			"#7BA822",
			"#E8D630",
			"#E68439",
			"#DB641F",
			"#F55647",
			"#DB1F1F",
			"#862DB3",
		][Intensity];
	// return ["#666666", "#0165CC", "#01BB02", "#EBC000", "#FF8400", "#E06300", "#FF0000", "#B50000", "#68009E"][Intensity ? Intensity - 1 : Intensity];
};

async function init() {
	TREM.Colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);

	if (!Maps.intensity) {
		Maps.intensity = L.map("map-intensity",
			{
				attributionControl : false,
				closePopupOnClick  : false,
				maxBounds          : [[30, 130], [10, 100]],
				preferCanvas       : true,
				zoomSnap           : 0.25,
				zoomDelta          : 0.5,
				zoomAnimation      : true,
				fadeAnimation      : setting["map.animation"],
				zoomControl        : false,
				doubleClickZoom    : false,
				keyboard           : false,
			})
			.fitBounds([[25.35, 119.4], [21.9, 122.22]], {
				paddingTopLeft: [document.getElementById("map-intensity").offsetWidth / 2, 0],
			})
			.on("contextmenu", () => TREM.Intensity._focusMap())
			.on("click", () => TREM.Intensity._focusMap());
		Maps.intensity._zoomAnimated = setting["map.animation"];
	}

	if (!MapBases.intensity.length)
		MapBases.intensity.set("tw_county",
			L.geoJson.vt(MapData.tw_county, {
				minZoom   : 7.5,
				maxZoom   : 10,
				tolerance : 20,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight      : 0.8,
					color       : TREM.Colors.primary,
					fillColor   : TREM.Colors.surfaceVariant,
					fillOpacity : 1,
				},
			}).addTo(Maps.intensity));

	const resizeHandler = (ev) => {
		if (ev && ev.propertyName != "margin-top") return;

		Maps.intensity.resize();
		TREM.Intensity._focusMap();
	};

	document.getElementById("view").addEventListener("transitionend", resizeHandler);

	try {
		if (setting["intensity.cwa"] != "") {
			const json_cwb = require(path.resolve(folder, `${setting["intensity.cwa"]}.json`));
			ipcRenderer.send("TREMIntensityload", json_cwb);
		}
	} catch (err) {
		console.error(`解析檔案 ${setting["intensity.cwa"]}.json 時發生錯誤:`, err);
	}

	try {
		if (setting["intensity.palert"] != "") {
			const json_palert = require(path.resolve(folder, `${setting["intensity.palert"]}.json`));
			ipcRenderer.send("TREMIntensityload", json_palert);
		}
	} catch (err) {
		console.error(`解析檔案 ${setting["intensity.palert"]}.json 時發生錯誤:`, err);
	}

	try {
		if (setting["intensity.trem"] != "") {
			const json_trem = require(path.resolve(folder, `${setting["intensity.trem"]}.json`));
			ipcRenderer.send("TREMIntensityload", json_trem);
		}
	} catch (err) {
		console.error(`解析檔案 ${setting["intensity.trem"]}.json 時發生錯誤:`, err);
	}
}

TREM.Intensity = {
	isTriggered : false,
	alertTime   : 0,
	intensities : new Map(),
	geojson     : null,
	cwa         : {},
	palert      : {},
	trem        : {},
	timer       : {},

	/**
	 * @type {maplibregl.Marker[]}
	 */
	_markers   : null,
	_raw       : null,
	_lastFocus : [],
	get _mapPaddingLeft() {
		return document.getElementById("map-intensity").offsetWidth / 2;
	},

	_focusMap(...args) {
		if (args.length) {
			this._lastFocus = [...args];
			Maps.intensity.fitBounds(...args);
		} else if (this._lastFocus.length) {
			Maps.intensity.fitBounds(...this._lastFocus);
		} else {
			this._lastFocus = [[[25.35, 119.4], [21.9, 122.22]], { paddingTopLeft: [this._mapPaddingLeft, 0] }];
			Maps.intensity.fitBounds(...this._lastFocus);
		}
	},

	handle(rawIntensityData) {
		console.debug(rawIntensityData);

		if (rawIntensityData.raw != undefined) {
			let unit = rawIntensityData.unit;
			const raw = rawIntensityData.raw;
			const raw_intensity_Data = raw.intensity;
			const raw_info_Data = raw.info;
			const PLoc = {};
			const int = new Map();
			// console.log(raw_info_Data);

			// 判斷是否存在經緯度顛倒
			if (raw_info_Data.lat >= -90 && raw_info_Data.lat <= 90 && raw_info_Data.lon >= -180 && raw_info_Data.lon <= 180) {
				console.debug("經緯度正確");
			} else {
				console.debug("經緯度顛倒");

				// 修正經緯度顛倒
				const temp = raw_info_Data.lat;
				raw_info_Data.lat = raw_info_Data.lon;
				raw_info_Data.lon = temp;

				console.debug("修正後的經緯度:", raw_info_Data);
			}

			if (unit == "cwb")
				TREM.Intensity.cwa = rawIntensityData;
			else if (unit == "palert")
				TREM.Intensity.palert = rawIntensityData;
			else if (unit == "trem")
				TREM.Intensity.trem = rawIntensityData;

			if (this._raw != null) this.clear();

			if (unit == "cwb") unit = "CWA";

			if (unit == "palert") unit = "P-Alert";

			if (unit == "trem") unit = "TREM";

			for (let index = 0, keys = Object.keys(raw_intensity_Data), n = keys.length; index < n; index++) {
				const intensity = Number(keys[index]);
				const ids = raw_intensity_Data[intensity];

				for (const city in TREM.Resources.region)
					for (const town in TREM.Resources.region[city]) {
						const loc = TREM.Resources.region[city][town];

						for (const id of ids)
							if (loc.id == id) {
								int.set(loc.code, intensity);
								PLoc[loc.code] = intensity;
							}
					}
			}

			if (this.geojson != null) {
				this.geojson.remove();
				this.geojson = null;
			}

			if (this._markers != null) {
				this._markers.remove();
				this._markers = null;
			}

			if (int.size) {
				log(`Total ${int.size} triggered area`, 1, "Intensity", "handle");
				dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

				this._raw = raw;

				document.getElementById("intensity-overview").style.visibility = "visible";
				document.getElementById("intensity-overview").classList.add("show");
				document.getElementById("intensity-overview-unit").innerText = unit;
				document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
				const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
				document.getElementById("intensity-overview-time").innerText = this.timeformat(time);
				document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
				document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
				document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
				document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";
				document.getElementById("intensity-overview-number").innerText = rawIntensityData.number ? rawIntensityData.number : "1";

				this._markers = L.marker(
					[raw_info_Data.lat, raw_info_Data.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [32, 32],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					}).addTo(Maps.intensity);

				this.geojson = L.geoJson.vt(MapData.tw_town, {
					minZoom   : 7.5,
					maxZoom   : 10,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 5,
					style     : (properties) => {
						const name = properties.TOWNCODE;

						if (PLoc[name] == 0 || PLoc[name] == undefined)
							return {
								color       : "transparent",
								weight      : 0,
								opacity     : 0,
								fillColor   : "transparent",
								fillOpacity : 0,
							};
						return {
							color       : TREM.Colors.secondary,
							weight      : 0.8,
							fillColor   : color(PLoc[name]),
							fillOpacity : 1,
						};
					},
				}).addTo(Maps.intensity);
			} else {
				log(`Total ${int.size} triggered area`, 1, "Intensity", "handle");
				dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

				this._raw = raw;

				document.getElementById("intensity-overview").style.visibility = "visible";
				document.getElementById("intensity-overview").classList.add("show");
				document.getElementById("intensity-overview-unit").innerText = unit;
				document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
				const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
				document.getElementById("intensity-overview-time").innerText = this.timeformat(time);
				document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
				document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
				document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
				document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";
				document.getElementById("intensity-overview-number").innerText = rawIntensityData.number ? rawIntensityData.number : "1";

				this._markers = L.marker(
					[raw_info_Data.lat, raw_info_Data.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [32, 32],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					}).addTo(Maps.intensity);
			}

			if (!this.isTriggered) {
				this.isTriggered = true;

				if (setting["intensity.show"]) {
					if (setting["Real-time.show"]) TREM.win.showInactive();

					if (setting["Real-time.cover"]) TREM.win.moveTop();

					if (!TREM.win.isFocused()) TREM.win.flashFrame(true);

					if (setting["audio.PAlert"]) TREM.Audios.palert.play();
				}
			}

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
				this.timer = setTimeout(() => this.clear, 60_000);
			} else {
				this.timer = setTimeout(() => this.clear, 60_000);
			}
		}
	},

	load(rawIntensityData) {
		console.debug(rawIntensityData);

		if (rawIntensityData.raw != undefined) {
			let unit = rawIntensityData.unit;
			const raw = rawIntensityData.raw;
			const raw_intensity_Data = raw.intensity;
			const raw_info_Data = raw.info;
			const PLoc = {};
			const int = new Map();
			// console.log(raw_info_Data);

			if (!raw_info_Data) {
				console.error("資料錯誤");
				return;
			}

			// 判斷是否存在經緯度顛倒
			if (raw_info_Data.lat >= -90 && raw_info_Data.lat <= 90 && raw_info_Data.lon >= -180 && raw_info_Data.lon <= 180) {
				console.debug("經緯度正確");
			} else {
				console.debug("經緯度顛倒");

				// 修正經緯度顛倒
				const temp = raw_info_Data.lat;
				raw_info_Data.lat = raw_info_Data.lon;
				raw_info_Data.lon = temp;

				console.debug("修正後的經緯度:", raw_info_Data);
			}

			if (this._raw != null) this.clear();

			if (unit == "cwb") unit = "CWA";

			if (unit == "palert") unit = "P-Alert";

			if (unit == "trem") unit = "TREM";

			for (let index = 0, keys = Object.keys(raw_intensity_Data), n = keys.length; index < n; index++) {
				const intensity = Number(keys[index]);
				const ids = raw_intensity_Data[intensity];

				for (const city in TREM.Resources.region)
					for (const town in TREM.Resources.region[city]) {
						const loc = TREM.Resources.region[city][town];

						for (const id of ids)
							if (loc.id == id) {
								int.set(loc.code, intensity);
								PLoc[loc.code] = intensity;
							}
					}
			}

			if (this.geojson != null) {
				this.geojson.remove();
				this.geojson = null;
			}

			if (this._markers != null) {
				this._markers.remove();
				this._markers = null;
			}

			if (int.size) {
				log(`Total ${int.size} triggered area`, 1, "Intensity", "load");
				dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

				this._raw = raw;

				document.getElementById("intensity-overview").style.visibility = "visible";
				document.getElementById("intensity-overview").classList.add("show");
				document.getElementById("intensity-overview-unit").innerText = unit;
				document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
				const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
				document.getElementById("intensity-overview-time").innerText = this.timeformat(time);
				document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
				document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
				document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
				document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";
				document.getElementById("intensity-overview-number").innerText = rawIntensityData.number ? rawIntensityData.number : "1";

				this._markers = L.marker(
					[raw_info_Data.lat, raw_info_Data.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [32, 32],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					}).addTo(Maps.intensity);

				this.geojson = L.geoJson.vt(MapData.tw_town, {
					minZoom   : 7.5,
					maxZoom   : 10,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 5,
					style     : (properties) => {
						const name = properties.TOWNCODE;

						if (PLoc[name] == 0 || PLoc[name] == undefined)
							return {
								color       : "transparent",
								weight      : 0,
								opacity     : 0,
								fillColor   : "transparent",
								fillOpacity : 0,
							};
						return {
							color       : TREM.Colors.secondary,
							weight      : 0.8,
							fillColor   : color(PLoc[name]),
							fillOpacity : 1,
						};
					},
				}).addTo(Maps.intensity);
			} else {
				log(`Total ${int.size} triggered area`, 1, "Intensity", "load");
				dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

				this._raw = raw;

				document.getElementById("intensity-overview").style.visibility = "visible";
				document.getElementById("intensity-overview").classList.add("show");
				document.getElementById("intensity-overview-unit").innerText = unit;
				document.getElementById("intensity-time").innerText = raw_info_Data.time != 0 ? "發震時間" : "接收時間";
				const time = new Date(raw_info_Data.time != 0 ? raw_info_Data.time : rawIntensityData.timestamp);
				document.getElementById("intensity-overview-time").innerText = this.timeformat(time);
				document.getElementById("intensity-overview-latitude").innerText = raw_info_Data.lat != 0 ? raw_info_Data.lat : "未知";
				document.getElementById("intensity-overview-longitude").innerText = raw_info_Data.lon != 0 ? raw_info_Data.lon : "未知";
				document.getElementById("intensity-overview-magnitude").innerText = raw_info_Data.scale != 0 ? raw_info_Data.scale : "未知";
				document.getElementById("intensity-overview-depth").innerText = raw_info_Data.depth != 0 ? raw_info_Data.depth : "未知";
				document.getElementById("intensity-overview-number").innerText = rawIntensityData.number ? rawIntensityData.number : "1";

				this._markers = L.marker(
					[raw_info_Data.lat, raw_info_Data.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [32, 32],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					}).addTo(Maps.intensity);
			}

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
				this.timer = setTimeout(() => this.clear, 60_000);
			} else {
				this.timer = setTimeout(() => this.clear, 60_000);
			}
		}
	},

	clear() {
		log("Clearing Intensity map", 1, "Intensity", "clear");
		dump({ level: 0, message: "Clearing Intensity map", origin: "Intensity" });

		if (this.intensities.size) {
			document.getElementById("intensity-overview").style.visibility = "none";
			document.getElementById("intensity-overview").classList.remove("show");
			delete this.intensities;
			this.intensities = new Map();
			this.alertTime = 0;
			this.isTriggered = false;
			this._raw = null;
			this._lastFocus = [];
			this._focusMap();

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
			}
		}
	},

	timeformat(time) {
		return new Date(time.toLocaleString("en-US", { hourCycle: "h23", timeZone: "Asia/Taipei" })).format("YYYY/MM/DD HH:mm:ss");
	},
};

TREM.Old_database = {
	cache                    : new Map(),
	olddatabaseListElement   : document.getElementById("report-list-container"),
	_olddatabaseItemTemplate : document.getElementById("template-old-database-list-item"),
	init() {
		document.getElementById("intensity-detail").style.display = "none";
		document.getElementById("old-database-detail").style.display = "";
		document.getElementById("old-database-overview").style.visibility = "visible";
		document.getElementById("old-database-overview").classList.add("show");
	},
	exit() {
		document.getElementById("intensity-detail").style.display = "";
		document.getElementById("old-database-detail").style.display = "none";
	},
	search() {
		this.cache.clear();

		// 讀取資料夾中的檔案
		fs.readdir(folder, (err, files) => {
			if (err) {
				console.error(err);
				return;
			}

			// 定義要搜尋的時間範圍
			// const startTime = new Date("2023-06-11 00:00:00").getTime(); // 起始時間（毫秒數）
			// const endTime = new Date("2023-06-12 00:00:00").getTime(); // 結束時間（毫秒數）

			const startTime = new Date(document.getElementById("old-database-filter-startdate-value").value + " " + document.getElementById("old-database-filter-starttime-value").value).getTime();
			const endTime = new Date(document.getElementById("old-database-filter-enddate-value").value + " " + document.getElementById("old-database-filter-endtime-value").value).getTime();
			console.debug(document.getElementById("old-database-filter-startdate-value").value + " " + document.getElementById("old-database-filter-starttime-value").value);
			console.debug(document.getElementById("old-database-filter-enddate-value").value + " " + document.getElementById("old-database-filter-endtime-value").value);
			console.debug(startTime);
			console.debug(endTime);

			// 過濾出符合時間範圍的檔案
			const filteredFiles = files.filter((file) => {
				const filename = path.parse(file).name;
				const fileTime = parseInt(filename);

				return !isNaN(fileTime) && fileTime >= startTime && fileTime <= endTime;
			});

			// 讀取符合條件的檔案
			const num = filteredFiles.filter((file) => {
				const filePath = path.join(folder, file);

				try {
					// 確認檔案是 JSON 檔案
					if (path.extname(filePath) === ".json") {
						const fileContent = fs.readFileSync(filePath, "utf8");
						const fileData = JSON.parse(fileContent);

						const type = fileData.type;

						if (type === "intensity")
							return this.setcache(file, type, fileData);
						else if (type === "eew-cwb")
							return this.setcache(file, type, fileData);
						else if (type === "eew-jma")
							return this.setcache(file, type, fileData);
						else if (type === "eew-nied")
							return this.setcache(file, type, fileData);
						else if (type === "eew-fjdzj")
							return this.setcache(file, type, fileData);
						else if (type === "eew-scdzj")
							return this.setcache(file, type, fileData);
						else if (type === "eew-kma")
							return this.setcache(file, type, fileData);
						else if (type === "report")
							return this.setcache(file, type, fileData);
						else if (type === "pws")
							return this.setcache(file, type, fileData);
						else if (type === "tsunami")
							return this.setcache(file, type, fileData);
						else if (type === "tsunami-test")
							return this.setcache(file, type, fileData);
						else if (type === "eew")
							return this.setcache(file, type, fileData);
						//  else {
						// 	return this.setcache(file, type, fileData);
						// }

						// return true;
					}
				} catch (err) {
					console.error(`解析檔案 ${file} 時發生錯誤:`, err);
					// 刪除檔案
					// fs.unlink(filePath, (unlinkErr) => {
					// 	if (unlinkErr) {
					// 		console.error(`刪除檔案 ${file} 時發生錯誤:`, unlinkErr);
					// 	} else {
					// 		console.log(`已成功刪除檔案 ${file}`);
					// 	}
					// });
				}

				return false;
			}).length;

			console.debug(`檔案總共 ${num} 個`);
			document.getElementById("old-database-label-search-value").innerText = `查詢檔案共 ${num} 個`;
			this.refreshList();
			// console.log(filteredFiles);
		});
	},
	setcache(file, type, fileData) {
		console.debug(`檔案 ${file} 的 type 屬性為: ${type}`);
		console.debug(fileData);
		this.cache.set(fileData.timestamp, fileData);
		return true;
	},
	unloadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) this.olddatabaseListElement.replaceChildren();
	},
	loadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) {
			const fragment = new DocumentFragment();
			const reports = Array.from(this.cache, ([k, v]) => v);

			for (const report of reports) {
				const element = this._createOlddatabaseItem(report);
				fragment.appendChild(element);
			}

			this.olddatabaseListElement.appendChild(fragment);
		}
	},
	_createOlddatabaseItem(Olddatabase) {
		const el = document.importNode(this._olddatabaseItemTemplate.content, true).querySelector(".report-list-item");
		const type = Olddatabase.type;
		let unit = Olddatabase.unit ? Olddatabase.unit : Olddatabase.type;
		let scale = "?";
		let number = Olddatabase.number ? Olddatabase.number : "1";

		if (unit == "cwb") unit = "CWA";

		if (unit == "palert") unit = "P-Alert";

		if (unit == "trem") unit = "TREM";

		if (unit == "eew-cwb") unit = "eew-cwa";

		if (Olddatabase.raw)
			if (Olddatabase.raw.info?.scale == 0) scale = "0.0";
			else if (Olddatabase.raw.info?.scale) scale = Olddatabase.raw.info.scale.toFixed(1);

		if (Olddatabase.scale) scale = Olddatabase.scale;

		if (Olddatabase.eq) {
			scale = Olddatabase.eq.mag;
			number = Olddatabase.serial;
		}

		if (unit == "intensity" && scale == "?") unit = "intensity" + " 資料有很大的機率無法顯示";
		// el.id = report.identifier;
		// el.className += ` ${IntensityToClassString(report.data[0]?.areaIntensity)}`;
		el.querySelector(".report-list-item-location").innerText = unit;
		el.querySelector(".report-list-item-id").innerText = number;
		el.querySelector(".report-list-item-Magnitude").innerText = scale;
		el.querySelector(".report-list-item-time").innerText = TREM.Intensity.timeformat(new Date(Olddatabase.timestamp));

		el.querySelector("button").value = Olddatabase.timestamp;
		el.querySelector("button").addEventListener("click", () => {
			if (type === "intensity") {
				TREM.Intensity.load(Olddatabase);
				TREM.Old_database.exit();
			} else if (type === "report") {
				ipcRenderer.send("Olddatabase_report", Olddatabase.raw);
			} else if (type === "pws") {
				console.debug(Olddatabase);
			} else if (type === "tsunami") {
				ipcRenderer.send("Olddatabase_tsunami", Olddatabase);
			} else if (type === "tsunami-test") {
				console.debug(Olddatabase);
				ipcRenderer.send("Olddatabase_tsunami", Olddatabase);
			} else {
				ipcRenderer.send("Olddatabase_eew", Olddatabase);
			}
		});
		ripple(el.querySelector("button"));

		return el;
	},
	refreshList() {
		this.unloadReports(true);
		this.loadReports(true);
	},
};

ipcRenderer.on("TREMIntensityhandle", (event, json) => {
	if (TREM.Intensity.isTriggered)
		TREM.Intensity.clear();
	TREM.Intensity.handle(json);
});

ipcRenderer.on("TREMIntensityload", (event, json) => {
	if (TREM.Intensity.isTriggered)
		TREM.Intensity.clear();

	const unit = json.unit;

	if (unit == "cwb")
		TREM.Intensity.cwa = json;
	else if (unit == "palert")
		TREM.Intensity.palert = json;
	else if (unit == "trem")
		TREM.Intensity.trem = json;

	TREM.Intensity.load(json);
});

ipcRenderer.on("TREMIntensitytime2", (event, time) => {
	const time2 = document.getElementById("time2");
	time2.innerText = time;
});

ipcRenderer.on("TREMIntensitylog2", (event, log) => {
	const time2 = document.getElementById("log2");
	time2.innerText = log;
});

ipcRenderer.on("TREMIntensityappversion2", (event, version) => {
	const time2 = document.getElementById("app-version2");
	time2.innerText = version;
});