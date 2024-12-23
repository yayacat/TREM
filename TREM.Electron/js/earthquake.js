/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable no-undef */
require("leaflet");
require("leaflet-edgebuffer");
require("leaflet-geojson-vt");
require("expose-gc");
const { BrowserWindow, shell } = require("@electron/remote");
const { default: turfCircle } = require("@turf/circle");
const { setTimeout, setInterval, clearTimeout, clearInterval } = require("node:timers");
const axios = require("axios");
const bytenode = require("bytenode");
const Route = require("../js/route.js");
const route = new Route();

const JSZip = require("jszip");

TREM.Audios = {
	pga1   : new Audio("../audio/PGA1.wav"),
	pga2   : new Audio("../audio/PGA2.wav"),
	int0   : new Audio("../audio/Shindo0.wav"),
	int1   : new Audio("../audio/Shindo1.wav"),
	int2   : new Audio("../audio/Shindo2.wav"),
	eew    : new Audio("../audio/EEW.wav"),
	note   : new Audio("../audio/Note.wav"),
	update : new Audio("../audio/Update.wav"),
	areav2 : new Audio("../audio/1/update.wav"),
	palert : new Audio("../audio/palert.wav"),
};
TREM.AudioContext = new AudioContext({});
TREM.Constants = require(path.resolve(__dirname, "../Constants/Constants.js"));
TREM.Earthquake = new EventEmitter();
TREM.EEW = new Map();
TREM.Utils = require(path.resolve(__dirname, "../Utils/Utils.js"));
localStorage.dirname = __dirname;

const speecd_use = setting["audio.tts"] ?? false;

// #region 變數
const posturl = "https://exptech.com.tw/api/v1/trem/";
const MapData = {};
const Timers = {};
let Stamp = 0;
let rts_remove_eew = false;
let UserLocationLat = 25.0421407;
let UserLocationLon = 121.5198716;
let arrive = "";
const audio = { main: [], minor: [], main_lock: false, minor_lock: false };
const EarthquakeList = {};
let marker = null;
let marker_report = null;

/**
 * @type {{main: L.Map, mini: L.Map, report: L.Map, intensity: L.Map}}
 */
const Maps = { main: null, mini: null, report: null, intensity: null };

/**
 * @type { {[key: string]: Map<string, maplibregl.StyleLayer>} }
 */
let MapBases = { main: new Map(), mini: new Map(), report: new Map(), intensity: new Map() };
const Station = {};
const detected_box_list = {};
const detected_list = {};
let Cancel = false;
let Canceltime = 0;
let RMT = 1;
let PGALimit = 0;
let PGAtag = -1;
let intensitytag = -1;
let MAXPGA = { pga: 0, station: "NA", level: 0 };
let IMAXdata = {};
let level_list = {};
let Info = { Notify: [], Warn: [], Focus: [] };
const Focus = [
	23.608428,
	121.699168,
	7.75,
];
let INFO = [];
let TINFO = 0;
let Report = 0;
let server_timestamp;

try {
	server_timestamp = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "server.json")).toString());
} catch (error) {
	server_timestamp = [];
}

let Location;
let region;
const station = {};
let station_data = {};
let palert_geojson = null;
let areav2_geojson = null;
let investigation = false;
let ReportTag = 0;
let EEWshot = 0;
let EEWshotC = 0;
let Response = {};
let replay = 0;
let replayT = 0;
let replayD = false;
let replayF = false;
let replayTemp = 0;
let replaydir = 0;
let replaytestEEW = 0;
TREM.toggleNavTime = 0;
let mapLock = false;
let eew = {};
const eewt = { id: 0, time: 0 };
let TSUNAMI = {};
let Ping = "N/A";
let EEWAlert = false;
let PGACancel = false;
let report_get_timestamp = Date.now();
let map_move_back = false;
TREM.set_report_overview = 0;
let rtstation1 = "";
let MaxIntensity1 = 0;
let MaxIntensity2 = -1;
let testEEWerror = false;
TREM.win = BrowserWindow.fromId(process.env.window * 1);
let stationnow = 0;
let stationnowall = 0;
let RMTpgaTime = 0;
let type_Unit = "";
let link_on = false;
let p2p_mode_status = false;
let rts_url = 0;
let HTTP = false;
// #endregion

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

TREM.MapIntensity = {
	isTriggered : false,
	trem        : false,
	alertTime   : 0,
	MaxI        : -1,
	intensities : new Map(),
	description : "",
	palert(rawPalertData) {
		console.debug(rawPalertData);

		if (rawPalertData.intensity?.length && !replay) {
			if (rawPalertData.timestamp != this.alertTime) {
				this.alertTime = rawPalertData.timestamp;
				this.MaxI = -1;
				const PLoc = {};
				const int = new Map();

				for (const palertEntry of rawPalertData.intensity) {
					const [countyName, townName] = palertEntry.loc.split(" ");
					const towncode = TREM.Resources.region[countyName]?.[townName]?.code;

					if (!towncode) continue;
					int.set(towncode, palertEntry.intensity);
					PLoc[towncode] = palertEntry.intensity;

					if (palertEntry.intensity > this.MaxI) {
						this.trem = false;
						this.MaxI = palertEntry.intensity;
						Report = rawPalertData.time;
						Report_GET();
					}
				}

				if (speecd_use && rawPalertData.final) {
					const now = timeconvert(new Date(rawPalertData.time)).format("YYYY/MM/DD HH:mm:ss");
					let intensity_index0 = 0;
					let description0 = "";

					for (let index = this.MaxI; index > 0; index--) {
						const intensity0 = `${IntensityI(index)}級`;
						let countyName_index0 = "";

						for (const palertEntry of rawPalertData.intensity) {
							const [countyName, townName] = palertEntry.loc.split(" ");

							if (palertEntry.intensity == index) {
								if (countyName_index0 == "") {
									description0 += `${countyName} `;

									if (rawPalertData.intensity.length != intensity_index0)
										description0 += `${intensity0.replace("-級", "弱").replace("+級", "強")}\n`;
								} else if (countyName_index0 == countyName) {
									continue;
								} else {
									description0 += `\n${countyName} `;

									if (rawPalertData.intensity.length != intensity_index0)
										description0 += `${intensity0.replace("-級", "弱").replace("+級", "強")}\n`;
								}

								countyName_index0 = countyName;
								intensity_index0 += 1;
							}
						}
					}

					TREM.speech.speak({ text: "震度速報"
					+ "資料來源PAlert(最終報)"
					+ "時間" + now
					+ "觸發測站" + rawPalertData.tiggered + "台震度分布"
					+ description0 });
				}

				if (setting["webhook.url"] != "" && setting["palert.Notification"]) {
					log("Posting Notification palert Webhook", 1, "Webhook", "palert");
					dump({ level: 0, message: "Posting Notification palert Webhook", origin: "Webhook" });
					this.description = "";
					let intensity_index = 0;

					for (let index = this.MaxI; index > 0; index--) {
						const intensity = `${IntensityI(index)}級`;

						if (rawPalertData.intensity.length != intensity_index)
							this.description += `${intensity.replace("-級", "弱").replace("+級", "強")}\n`;
						let countyName_index = "";

						for (const palertEntry of rawPalertData.intensity) {
							const [countyName, townName] = palertEntry.loc.split(" ");

							if (palertEntry.intensity == index) {
								if (countyName_index == "")
									this.description += `${palertEntry.loc} `;
								else if (countyName_index == countyName)
									this.description += `${townName} `;
								else
									this.description += `\n${palertEntry.loc} `;
								countyName_index = countyName;
								intensity_index += 1;
							}
						}

						this.description += "\n";
					}

					// console.log(this.description);
					const now = timeconvert(new Date(rawPalertData.time)).format("YYYY/MM/DD HH:mm:ss");
					const msg = {
						username   : "TREMV | 臺灣即時地震監測變體",
						avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
						content    : setting["tts.Notification"] ? ((rawPalertData.final ? "PAlert最終報" : "PAlert") + "時間" + now + "觸發測站" + rawPalertData.tiggered + "台" + this.description) : "PAlert",
						tts        : setting["tts.Notification"],
						embeds     : [
							{
								author: {
									name     : rawPalertData.final ? "PAlert(最終報)" : "PAlert",
									url      : rawPalertData.link,
									icon_url : undefined,
								},
								description : this.description,
								fields      : [
									{
										name   : "時間",
										value  : now,
										inline : true,
									},
									{
										name   : "觸發測站",
										value  : `${rawPalertData.tiggered}台`,
										inline : true,
									},
								],
							},
						],
					};
					fetch(setting["webhook.url"], {
						method  : "POST",
						headers : { "Content-Type": "application/json" },
						body    : JSON.stringify(msg),
					}).catch((error) => {
						log(error, 3, "Webhook", "palert");
						dump({ level: 2, message: error, origin: "Webhook" });
					});
				}

				if (palert_geojson == null) {
					this.isTriggered = true;
					changeView("main", "#mainView_btn");

					if (setting["Real-time.show"]) win.showInactive();

					if (setting["Real-time.cover"])
						if (!win.isFullScreen()) {
							win.setAlwaysOnTop(true);
							win.focus();
							win.setAlwaysOnTop(false);
						}

					if (!win.isFocused()) win.flashFrame(true);

					if (setting["audio.PAlert"]) {
						log("Playing Audio > palert", 1, "Audio", "palert");
						dump({ level: 0, message: "Playing Audio > palert", origin: "Audio" });
						TREM.Audios.palert.play();
					}
				} else {
					palert_geojson.remove();
				}

				palert_geojson = L.geoJson.vt(MapData.tw_town, {
					minZoom   : 4,
					maxZoom   : 15,
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
							fillColor   : TREM.color(PLoc[name]),
							fillOpacity : 1,
						};
					},
				}).addTo(Maps.main);
				setTimeout(() => {
					ipcRenderer.send("screenshotEEW", {
						Function : "palert",
						ID       : 1,
						Version  : 1,
						Time     : NOW().getTime(),
						Shot     : 1,
					});
				}, 1250);
			}

			if (this.timer)
				this.timer.refresh();
			else
				this.timer = setTimeout(this.clear, 600_000);
		}
	},
	expected(expected) {
		const int = new Map();
		const PLoc = {};

		for (const [towncode, exp] of expected) {
			int.set(towncode, exp.intensity.value);
			PLoc[towncode] = exp.intensity.value;
		}

		if (palert_geojson != null)
			palert_geojson.remove();

		palert_geojson = L.geoJson.vt(MapData.tw_town, {
			minZoom   : 4,
			maxZoom   : 15,
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
					fillColor   : TREM.color(PLoc[name]),
					fillOpacity : 1,
				};
			},
		}).addTo(Maps.main);
	},
	clear() {
		log("Clearing P-Alert map", 1, "P-Alert", "palert");
		dump({ level: 0, message: "Clearing P-Alert map", origin: "P-Alert" });

		this.alertTime = 0;
		this.MaxI = -1;
		this.isTriggered = false;
		this.description = "";

		if (palert_geojson != null) {
			palert_geojson.remove();
			palert_geojson = null;
		}
	},
};

TREM.PWS = {
	cache: new Map(),
	addPWS(rawPWSData) {
		const id = rawPWSData.link.href.slice(15);

		if (!id.length) return;
		const pws = {
			id,
			title       : rawPWSData.title,
			sender      : rawPWSData.sender.value,
			description : rawPWSData.description.$t,
			area        : rawPWSData.area.areaDesc,
			areaCodes   : TREM.Utils.findRegions(rawPWSData.area.areaDesc),
			sentTime    : new Date(rawPWSData.sent.slice(0, rawPWSData.sent.length - 3)),
			expireTime  : new Date(rawPWSData.expires.slice(0, rawPWSData.expires.length - 3)),
			url         : rawPWSData.link.href,
			timer       : null,
			marker      : {},
			areav2      : {},
		};
		log(`${pws.description}`, 1, "PWS", "addPWS");
		dump({ level: 0, message: `${pws.description}`, origin: "PWS" });

		if (Date.now() > pws.expireTime.getTime()) return;

		let areaconst = 0;

		for (const area of pws.areaCodes)
			if (area.town) {
				pws.marker[areaconst] = L.marker([area.latitude, area.longitude], {
					icon     : L.divIcon({ html: "<img src=\"../image/warn.png\" height=\"32\" width=\"32\"></img>" }),
					keyboard : false,
				})
					.addTo(Maps.main)
					.bindPopup(`<div><strong>${pws.title}</strong>\n發報單位：${pws.sender}\n內文：${pws.description}\n發報時間：${timeconvert(pws.sentTime).format("YYYY/MM/DD HH:mm:ss")}\n失效時間：${timeconvert(pws.expireTime).format("YYYY/MM/DD HH:mm:ss")}\n\n<span class="url" onclick="openURL('${pws.url}')">報告連結</span></div>`, {
						offset    : [8, 0],
						permanent : false,
						className : "marker-popup pws-popup",
					});
				pws.areav2[areaconst] = L.geoJson.vt(MapData.tw_town, {
					minZoom   : 4,
					maxZoom   : 15,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 5,
					style     : (properties) => {
						const name = properties.TOWNCODE;

						if (area.code != name)
							return {
								color       : "transparent",
								weight      : 0,
								opacity     : 0,
								fillColor   : "transparent",
								fillOpacity : 0,
							};
						return {
							color       : "#efcc00",
							weight      : 3,
							fillColor   : "transparent",
							fillOpacity : 0,
						};
					},
				}).addTo(Maps.main);
				areaconst += 1;
			}

		pws.timer = setTimeout(TREM.PWS.clear, pws.expireTime.getTime() - Date.now(), id);

		TREM.PWS.cache.set(id, pws);
	},
	clear(pwsId) {
		if (pwsId) {
			const pws = TREM.PWS.cache.get(pwsId);

			if (!pws) return;
			log(`Clearing PWS id ${pwsId}`, 1, "PWS", "clear");
			dump({ level: 0, message: `Clearing PWS id ${pwsId}`, origin: "PWS" });
			let areaconst = 0;

			for (const area of pws.areaCodes)
				if (area.town && pws.marker) {
					pws.marker[areaconst].remove();
					delete pws.marker[areaconst];
					pws.areav2[areaconst].remove();
					delete pws.areav2[areaconst];
					areaconst += 1;
				}

			if (pws.timer) {
				clearTimeout(pws.timer);
				delete pws.timer;
			}

			TREM.PWS.cache.delete(pwsId);
		} else if (TREM.PWS.cache.size) {
			log("Clearing PWS map", 1, "PWS", "clear");
			dump({ level: 0, message: "Clearing PWS map", origin: "PWS" });

			for (const [id, pws] of TREM.PWS.cache)
				if (pws.timer) {
					clearTimeout(pws.timer);
					delete pws.timer;
				}

			TREM.PWS.cache = new Map();
		}
	},
};

TREM.MapArea = {
	cache      : new Map(),
	isVisible  : false,
	blinkTimer : null,
	setArea(id, intensity) {
		if (this.cache.get(id) == intensity) return;
		Maps.main.setFeatureState({
			source: "Source_area",
			id,
		}, { intensity });
		this.cache.set(id, intensity);
		this.show();

		if (!this.blinkTimer)
			this.blinkTimer = setInterval(() => {
				if (this.isVisible)
					this.hide();
				else
					this.show();
			}, 500);
	},
	clear(id) {
		if (id) {
			Maps.main.removeFeatureState({ source: "Source_area", id });
			this.cache.delete(id);
		} else {
			Maps.main.removeFeatureState({ source: "Source_area" });
			delete this.cache;
			this.cache = new Map();
		}

		if (!this.cache.size) {
			if (this.blinkTimer)
				clearTimeout(this.blinkTimer);
			delete this.blinkTimer;
			this.hide();
		}
	},
	show() {
		Maps.main.setLayoutProperty("Layer_area", "visibility", "visible");
		this.isVisible = true;
	},
	hide() {
		Maps.main.setLayoutProperty("Layer_area", "visibility", "none");
		this.isVisible = false;
	},
};

TREM.MapArea2 = {
	cache       : new Map(),
	isVisible   : false,
	isTriggered : false,
	blinkTimer  : null,
	timer       : null,
	PLoc        : {},
	setArea(Json) {
		// console.log(Json);

		const max_intensity_list = {};

		for (let index = 0, keys = Object.keys(station), n = keys.length; index < n; index++) {
			const uuid = keys[index];
			const current_station_data = station[uuid];
			const current_data = Json[uuid.split("-")[2]];
			const Alert = current_data?.alert ?? false;

			if (Alert) {
				max_intensity_list[current_station_data.area] ??= Math.round(current_data.i);

				if (max_intensity_list[current_station_data.area] < Math.round(current_data.i)) {
					max_intensity_list[current_station_data.area] = Math.round(current_data.i);
					this.cache.set(current_station_data.area, Math.round(current_data.i));
				} else if (!max_intensity_list[current_station_data.area]) {
					max_intensity_list[current_station_data.area] = Math.round(current_data.i);
					this.cache.set(current_station_data.area, Math.round(current_data.i));
				} else {
					this.cache.set(current_station_data.area, max_intensity_list[current_station_data.area]);
				}
			}
		}

		if (Object.keys(this.PLoc).length) this.PLoc = {};

		if (areav2_geojson != null) {
			areav2_geojson.remove();
			areav2_geojson = null;
		}

		for (const areav2 of Json.area) {
			const intensity = this.cache.get(areav2) ?? 1;

			for (let id = 0; id < Object.keys(TREM.Resources.areav2).length; id++) {
				const key = Object.keys(TREM.Resources.areav2)[id];

				if (areav2 == key)
					for (let id1 = 0; id1 < Object.keys(TREM.Resources.areav2[key]).length; id1++)
						this.PLoc[TREM.Resources.areav2[key][id1]] = intensity;
			}
		}

		areav2_geojson = L.geoJson.vt(MapData.tw_town, {
			minZoom   : 4,
			maxZoom   : 15,
			tolerance : 20,
			buffer    : 256,
			debug     : 0,
			zIndex    : 5,
			style     : (properties) => {
				const name = properties.TOWNCODE;

				if (this.PLoc[name] == 0 || this.PLoc[name] == undefined)
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
					fillColor   : TREM.color(this.PLoc[name]),
					fillOpacity : 1,
				};
			},
		}).addTo(Maps.main);

		this.isTriggered = true;

		if (this.timer)
			this.timer.refresh();
		else
			this.timer = setTimeout(this.clear, 10_000);
	},
	clear(id) {
		if (id) {
			this.cache.delete(id);
		} else {
			delete this.cache;
			this.cache = new Map();
		}

		if (this.timer) {
			clearTimeout(this.timer);
			delete this.timer;
		}

		// if (!this.cache.size) {
		// 	if (this.blinkTimer)
		// 		clearTimeout(this.blinkTimer);
		// 	delete this.blinkTimer;
		// }

		if (areav2_geojson != null) {
			areav2_geojson.remove();
			areav2_geojson = null;
			this.PLoc = {};
		}

		this.isTriggered = false;
		this.isVisible = false;
	},
	show() {
		this.isVisible = true;
	},
	hide() {
		this.isVisible = false;
	},
};

class WaveCircle {

	/**
	 * @param {string} id
	 * @param {maplibregl.Map} map
	 * @param {maplibregl.LngLatLike} lnglat
	 * @param {number} radius
	 * @param {boolean} alert
	 * @param {maplibregl.LayerSpecification} layerOptions
	 */
	constructor(id, map, lnglat, radius, alert, layerOptions) {
		this.map = map;
		this.lnglat = lnglat;
		this.radius = radius;
		this.alert = alert;

		/**
		 * @type {maplibregl.GeoJSONSource}
		 */
		this.source = map.addSource(`Source_${id}`, {
			type : "geojson",
			data : turfCircle(lnglat, radius, { units: "meters" }),
		}).getSource(`Source_${id}`);
		this.layer = map.addLayer({
			...layerOptions,
			id     : `Layer_${id}`,
			source : `Source_${id}`,
		}).getLayer(`Layer_${id}`);

		if (layerOptions.type == "fill")
			this.layerBorder = map.addLayer({
				...layerOptions,
				type   : "line",
				id     : `Layer_${id}_Border`,
				source : `Source_${id}`,
				paint  : {
					"line-width" : 3,
					"line-color" : layerOptions.paint["fill-color"],
				},
			}).getLayer(`Layer_${id}_Border`);
	}

	setLngLat(lnglat) {
		if (this.lnglat[0] == lnglat[0] && this.lnglat[1] == lnglat[1]) return;
		this.lnglat = lnglat;
		this.source.setData(turfCircle(this.lnglat, this.radius, { units: "meters" }));
	}

	setRadius(radius) {
		if (this.radius == radius) return;
		this.radius = radius;
		this.source.setData(turfCircle(this.lnglat, this.radius, { units: "meters" }));
	}

	setAlert(state) {
		if (this.alert == state) return;
		this.alert = state;
		this.layer.setPaintProperty("fill-color", this.alert ? "#FF0000" : "#FFA500");
		this.layerBorder.setPaintProperty("line-color", this.alert ? "#FF0000" : "#FFA500");
	}

	setStyle(id, value) {
		if (this.layer.paint[id] == value) return;
		this.layer.setPaintProperty(id, value);
	}

	remove() {
		this.map.removeLayer(this.layer.id);
		delete this.layer;

		if (this.layerBorder) {
			this.map.removeLayer(this.layerBorder.id);
			delete this.layerBorder;
		}

		this.map.removeSource(this.source.id);
		delete this.source;
		return null;
	}
}

class EEW {
	constructor(data) {
		this.#fromJson(data);
	}

	get full() {
		return (
			this.id != undefined
			&& this.depth != undefined
			&& this.epicenter != undefined
			&& this.location != undefined
			&& this.magnitude != undefined
			&& this.source != undefined
			&& (this.location && this.location != "未知區域")
		) ? true : false;
	}

	get local() {
		return this._expected.get(this._local.code);
	}

	get arrivalTime() {
		return (this.local.distance - (Date.now() - this.eventTime.getTime() * this._wavespeed.s)) / this._wavespeed.s;
	}

	#fromJson(data) {
		this.id = data.id;
		this.depth = data.depth;
		this.epicenter = { latitude: data.lat, longitude: data.lon };
		this.location = data.location;
		this.magnitude = data.scale;
		this.source = data.Unit;

		if (data.number > (this.version || 0)) {
			this._expected = new Map();
			this.#evalExpected();
		}

		this.version = data.number;

		this.eventTime = new Date(data.time);
		this.apiTime = new Date(data.timeStamp);

		this._alert = data.Alert;
		this._from = data.data_unit;
		this._receiveTime = new Date(data.timestamp);
		this._replay = data.replay_time;
	}

	#evalExpected() {
		for (const city in TREM.Resources.region)
			for (const town in TREM.Resources.region[city]) {
				const l = TREM.Resources.region[city][town];
				const d = TREM.Utils.twoSideDistance(
					TREM.Utils.twoPointDistance(
						{ lat: l.latitude, lon: l.longitude },
						{ lat: this.epicenter.latitude, lon: this.epicenter.longitude },
					),
					this.depth,
				);
				const pga = TREM.Utils.pga(
					this.magnitude,
					d,
					setting["earthquake.siteEffect"] ? l.siteEffect : undefined,
				);
				const i = TREM.Utils.PGAToIntensity(pga);

				if (setting["location.city"] == city && setting["location.town"] == town)
					this._local = l;

				this._expected.set(l.code, { distance: d, intensity: i, pga });
			}
	}

	update(data) {
		this.#fromJson(data);
	}
}

// function dynamicLoadJs(url, callback) {
// 	const head = document.getElementsByTagName("footer")[0];
// 	const script = document.createElement("script");
// 	script.type = "text/javascript";
// 	script.src = `../js/${url}`;

// 	if (typeof (callback) == "function")
// 		script.onload = script.onreadystatechange = function() {
// 			if (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") {
// 				callback();
// 				script.onload = script.onreadystatechange = null;
// 			}
// 		};

// 	head.appendChild(script);
// }

// #region 初始化
// const _unlock = fs.existsSync(path.join(app.getPath("userData"), "unlock.tmp"));

// try {
// 	dynamicLoadJs("server.js", () => {
// 		console.log("OK");
// 	});
// } catch (err) {
// 	console.error(err);
// }

const folder = path.join(app.getPath("userData"), "data");

if (!fs.existsSync(folder))
	fs.mkdirSync(folder);

const win = TREM.win;
const roll = document.getElementById("rolllist");
win.setAlwaysOnTop(false);

let fullscreenTipTimeout;
win.on("enter-full-screen", () => {
	$("#fullscreen-notice").addClass("show");

	if (fullscreenTipTimeout) clearTimeout(fullscreenTipTimeout);

	fullscreenTipTimeout = setTimeout(() => {
		$("#fullscreen-notice").removeClass("show");
	}, 3_000);
});

win.on("leave-full-screen", () => {
	$("#fullscreen-notice").removeClass("show");

	if (fullscreenTipTimeout) clearTimeout(fullscreenTipTimeout);
});

async function init() {
	const progressbar = document.getElementById("loading_progress");
	const progressStep = 5;
	// report_get_timestamp = 0;

	// TREM.MapRenderingEngine = setting["map.engine"];

	if (!window.navigator.onLine)
		return showDialog(
			"error",
			TREM.Localization.getString("Initialization_No_Connection_Title"),
			TREM.Localization.getString("Initialization_No_Connection_Description"),
			0, "wifi_off", () => {
				ipcRenderer.send("restart");
			},
		);

	// Connect to server
	try {
		if (process.platform === "win32") {
			bytenode.runBytecodeFile(path.resolve(__dirname, "../js/winserver.jar"));
		} else if (process.platform === "darwin") {
			if (process.arch === "x64")
				bytenode.runBytecodeFile(path.resolve(__dirname, "../js/macos_x64_server.jar"));
			else if (process.arch === "arm64")
				bytenode.runBytecodeFile(path.resolve(__dirname, "../js/macos_arm64_server.jar"));
		} else if (process.platform === "linux") {
			if (process.arch === "x64")
				bytenode.runBytecodeFile(path.resolve(__dirname, "../js/linux_x64_server.jar"));
			else if (process.arch === "arm64")
				bytenode.runBytecodeFile(path.resolve(__dirname, "../js/linux_arm64_server.jar"));
		}

		$("#loading").text(TREM.Localization.getString("Application_Connecting"));
		log("Trying to connect to the server...", 1, "ResourceLoader", "init");
		dump({ level: 0, message: "Trying to connect to the server...", origin: "ResourceLoader" });
		progressbar.value = (1 / progressStep) * 1;
	} catch (e) {
		log(e, 3, "ResourceLoader", "init");
		dump({ level: 2, message: e });
	}

	// Timers
	(() => {
		$("#loading").text(TREM.Localization.getString("Application_Loading"));
		const time = document.getElementById("time");
		const time1 = document.getElementById("time1");

		const now_format = (time_now) => timeconvert(time_now).format("YYYY/MM/DD HH:mm:ss");

		// clock
		log("Initializing clock", 1, "Clock", "init");
		dump({ level: 0, message: "Initializing clock", origin: "Clock" });

		if (!Timers.clock)
			Timers.clock = setInterval(() => {
				if (TimerDesynced && replayTemp == 0 && replay == 0) {
					if (!time.classList.contains("desynced"))
						time.classList.add("desynced");
					const now_f = now_format(NOW());
					time.innerText = `${now_f}`;
					time1.innerText = `${now_f}`;
				} else if (replayTemp) {
					if (!time.classList.contains("replay"))
						time.classList.add("replay");
					time.innerText = `${now_format(new Date(replayTemp))}`;

					// if (NOW().getTime() - replayT > 180_000 && !Object.keys(eew).length) {
					if ((replayTemp - replay) > 300_000) {
						replayTemp = 0;
						stopReplay();
					}
				} else if (replay) {
					if (!time.classList.contains("replay"))
						time.classList.add("replay");
					time.innerText = `${now_format(new Date(replay + (NOW().getTime() - replayT)))}`;

					// if (NOW().getTime() - replayT > 180_000 && !Object.keys(eew).length) {
					if (NOW().getTime() - replayT > 300_000) {
						replayT = 0;
						stopReplay();
					}
				} else {
					if (time.classList.contains("replay"))
						time.classList.remove("replay");

					if (time.classList.contains("desynced"))
						time.classList.remove("desynced");

					const now_f = now_format(NOW());
					time.innerText = `${now_f}`;
					time1.innerText = `${now_f}`;

					if (replaytestEEW != 0 && NOW().getTime() - replaytestEEW > 300_000) {
						testEEWerror = false;
						replaytestEEW = 0;
						stopReplay();
					}

					if (TREM.toggleNavTime != 0 && NOW().getTime() - TREM.toggleNavTime > 5_000) {
						toggleNav(false);
						globalgc();
					}
				}

				let GetDataState = "";
				let Warn = "";

				if (!HTTP) Warn += "0";

				if (!WS) Warn += `1(${ws_num})`;

				// if (!WS_backup) Warn += `2(${ws_num_bk})`;

				if (!FCM) Warn += "3";

				if (setting["p2p.mode"])
					try {
						if (!info.server.length) Warn += "7";
					} catch (e) {
						Warn += "6";
					}
				else
					Warn += "5";

				if (!WS_yayacat) Warn += "9";

				Warn = ((Warn == "") ? "" : ` | 📛 ${Warn}`);

				if (Warn == "") Warn = ` | ⬆: ${info.in.length + info6.in.length} ⬇: ${info.out.length + info6.out.length}`;

				if (type_Unit == "http") GetDataState += "🟩 Http";

				else if (type_Unit == "p2p") GetDataState += "🟦 P2P";

				else if (type_Unit == "p2pv6") GetDataState += "🟦 P2Pv6";

				else if (type_Unit == "websocket_yayacat") GetDataState += "⬜ WSY";

				else if (type_Unit == "websocket") GetDataState += "⬜ WS";

				else if (type_Unit == "websocket_backup") GetDataState += "⬜ WSB";

				else if (type_Unit == "fcm") GetDataState += "🟥 FCM";

				else if (type_Unit == "cache") GetDataState += "🟩 Cache";

				type_Unit = "";

				if (setting["stream.mode"]) GetDataState += "⏺";

				// if (GetData_time) {
				// 	GetData_time = false;
				// 	GetDataState += "⏰";
				// }

				// win.on("show", () => sleep(false));
				// win.on("hide", () => sleep(true));
				// win.on("minimize", () => sleep(true));
				// win.on("restore", () => sleep(false));

				// const stationall = Object.keys(station).length;
				const stationPercentage = Math.round(stationnow / stationnowall * 1000) / 10;

				// const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
				const memoryData = process.memoryUsage();
				const rss = `${(((memoryData.rss / 1024) / 1024) / 1024).toFixed(2)} GB`;
				// const warn = (Warn) ? "⚠️" : "";
				const error = (testEEWerror) ? "❌" : "";
				// const unlock = (Unlock) ? "⚡" : "";
				$("#log").text(`${stationnow}/${stationnowall} | ${stationPercentage}% | LB(${ws_num},${route.random_global_url}) | ${rss}`);
				$("#log1").text(`${stationnow}/${stationnowall} | ${stationPercentage}% | LB(${ws_num},${route.random_global_url}) | ${rss}`);
				ipcRenderer.send("TREMIntensitylog2", { time: now_format(NOW()), log: `${stationnow}/${stationnowall} | ${stationPercentage}% | ${rss}`, ver: `${app.getVersion()} ${Ping} ${GetDataState} ${Warn} ${error}` });
				$("#app-version").text(`${app.getVersion()} ${Ping} ${GetDataState} ${Warn} ${error}`);
				$("#app-version1").text(`${app.getVersion()} ${Ping} ${GetDataState} ${Warn} ${error}`);
			}, 500);

		if (!Timers.tsunami)
			Timers.tsunami = setInterval(() => {
				if (investigation) {
					if (NOW().getTime() - Report > 600_000) {
						investigation = false;
						roll.removeChild(roll.children[0]);

						if (!replay) {
							Report = 0;
							TREM.MapIntensity.MaxI = -1;
						}

						if (TREM.MapIntensity.isTriggered && TREM.MapIntensity.intensities.size != undefined)
							TREM.MapIntensity.clear();

						globalgc();
					}
				} else
					if (Date.now() - report_get_timestamp > 180_000) {
						ReportGET();
						globalgc();
					}

				if (ReportTag != 0 && NOW().getTime() - ReportTag > 30_000) {
					console.debug("ReportTag end: ", NOW().getTime());
					ReportTag = 0;
					console.debug("ReportTag: ", ReportTag);
					TREM.Report.setView("report-list");
					changeView("main", "#mainView_btn");
					stopReplay();
				}
			}, 1_000);

		progressbar.value = (1 / progressStep) * 2;
	})();

	// Audios
	(() => {
		const gainNode = TREM.AudioContext.createGain();

		for (const key in TREM.Audios) {
			const audioSource = TREM.AudioContext.createMediaElementSource(TREM.Audios[key]);
			audioSource.connect(gainNode).connect(TREM.AudioContext.destination);
		}

		progressbar.value = (1 / progressStep) * 3;
	})();

	// Colors and Map
	await (async () => {
		TREM.Colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);

		log("Loading Map Data...", 1, "ResourceLoader", "init");
		log("Starting timer...", 0, "Timer", "init");
		dump({ level: 0, message: "Loading Map Data...", origin: "ResourceLoader" });
		dump({ level: 3, message: "Starting timer...", origin: "Timer" });
		let perf_GEOJSON_LOAD = process.hrtime();
		fs.readdirSync(path.join(__dirname, "../Resources/GeoJSON")).forEach((file, i, arr) => {
			try {
				MapData[path.parse(file).name] = require(path.join(__dirname, "../Resources/GeoJSON", file));
				log(`Loaded ${file}`, 0, "ResourceLoader", "init");
				dump({ level: 3, message: `Loaded ${file}`, origin: "ResourceLoader" });
				progressbar.value = (1 / progressStep) * 3.6 + (((1 / progressStep) / arr.length) * (i + 1));
			} catch (error) {
				log(`An error occurred while loading file ${file}`, 3, "ResourceLoader", "init");
				log(error, 3, "ResourceLoader", "init");
				dump({ level: 2, message: `An error occurred while loading file ${file}`, origin: "ResourceLoader" });
				dump({ level: 2, message: error, origin: "ResourceLoader" });
				console.error(error);
				log(`Skipping ${file}`, 0, "ResourceLoader", "init");
				dump({ level: 3, message: `Skipping ${file}`, origin: "ResourceLoader" });
			}
		});
		perf_GEOJSON_LOAD = process.hrtime(perf_GEOJSON_LOAD);
		log(`ResourceLoader took ${perf_GEOJSON_LOAD[0]}.${perf_GEOJSON_LOAD[1]}s`, 0, "Timer", "init");
		dump({ level: 3, message: `ResourceLoader took ${perf_GEOJSON_LOAD[0]}.${perf_GEOJSON_LOAD[1]}s`, origin: "Timer" });

		// #region Maps

		TREM.MapData = MapData;

		log("Initializing map", 0, "Map", "init");
		dump({ level: 3, message: "Initializing map", origin: "Map" });

		if (!Maps.main) {
			Maps.main = L.map("map",
				{
					edgeBufferTiles    : 1,
					attributionControl : false,
					closePopupOnClick  : false,
					maxBounds          : [[60, 50], [10, 180]],
					preferCanvas       : true,
					zoomSnap           : 0.25,
					zoomDelta          : 0.5,
					zoomAnimation      : true,
					fadeAnimation      : setting["map.animation"],
					doubleClickZoom    : false,
					zoomControl        : false,
				})
				.on("click", () => {
					mapLock = false;
					Mapsmainfocus();
				})
				.on("contextmenu", () => {
					Mapsmainfocus();
				})
				.on("drag", () => mapLock = true)
				.on("zoomend", () => {
					if (Maps.main.getZoom() >= 13.5)
						for (const key in Station) {
							const tooltip = Station[key].getTooltip();

							if (tooltip) {
								Station[key].unbindTooltip();
								tooltip.options.permanent = true;
								Station[key].bindTooltip(tooltip);
							}
						}
					else
						for (const key in Station) {
							const tooltip = Station[key].getTooltip();

							if (tooltip && !Station[key].keepTooltipAlive) {
								Station[key].unbindTooltip();
								tooltip.options.permanent = false;
								Station[key].bindTooltip(tooltip);
							}
						}
				});
			Maps.main._fadeAnimated = setting["map.animation"];
			Maps.main._zoomAnimated = setting["map.animation"];
		}

		if (!Maps.mini)
			Maps.mini = L.map("map-tw",
				{
					attributionControl : false,
					zoomControl        : false,
					closePopupOnClick  : false,
					preferCanvas       : true,
					zoomAnimation      : false,
					fadeAnimation      : false,
					dragging           : false,
					touchZoom          : false,
					doubleClickZoom    : false,
					scrollWheelZoom    : false,
					boxZoom            : false,
					keyboard           : false,
				})
				.setView([23.608428, 120.799168], 7)
				.on("zoom", () => Maps.mini.setView([23.608428, 120.799168], 7));

		if (!Maps.report) {
			Maps.report = L.map("map-report",
				{
					attributionControl : false,
					closePopupOnClick  : false,
					// maxBounds          : [[30, 130], [10, 100]],
					preferCanvas       : true,
					zoomSnap           : 0.25,
					zoomDelta          : 0.5,
					zoomAnimation      : true,
					fadeAnimation      : setting["map.animation"],
					zoomControl        : false,
					doubleClickZoom    : false,
					keyboard           : false,
					worldCopyJump      : true,
				})
				.fitBounds([[25.35, 119.4], [21.9, 122.22]], {
					paddingTopLeft: [document.getElementById("map-report").offsetWidth / 2, 0],
				})
				.on("contextmenu", () => TREM.Report._focusMap())
				.on("click", () => TREM.Report._focusMap());
			Maps.report._fadeAnimated = setting["map.animation"];
			Maps.report._zoomAnimated = setting["map.animation"];
		}

		MapBases = { main: [], mini: [], report: [], intensity: [] };

		if (!MapBases.main.length) {
			for (const mapName of [
				"cn",
				"jp",
				"sk",
				"nk",
				"ph",
			])
				if (setting["map." + mapName])
					MapBases.main.push(`${mapName}`, L.geoJson.vt(MapData[mapName], {
						edgeBufferTiles : 2,
						minZoom         : 4,
						maxZoom         : 15,
						tolerance       : 20,
						buffer          : 256,
						debug           : 0,
						style           : {
							weight      : 0.8,
							color       : TREM.Colors.secondary,
							fillColor   : TREM.Colors.surfaceVariant,
							fillOpacity : 0.5,
						},
					}).addTo(Maps.main));
			MapBases.main.push("tw_county", L.geoJson.vt(MapData.tw_county, {
				edgeBufferTiles : 2,
				minZoom         : 4,
				maxZoom         : 15,
				tolerance       : 20,
				buffer          : 256,
				debug           : 0,
				style           : {
					weight      : 0.8,
					color       : TREM.Colors.secondary,
					fillColor   : TREM.Colors.surfaceVariant,
					fillOpacity : 0.5,
				},
			}).addTo(Maps.main));

			if (setting["map.tw_fault"])
				MapBases.main.push("tw_fault",
					L.geoJson.vt(MapData.tw_fault, {
						edgeBufferTiles : 2,
						minZoom         : 4,
						maxZoom         : 15,
						tolerance       : 20,
						buffer          : 256,
						debug           : 0,
						style           : {
							weight      : 1.8,
							color       : "red",
							fillColor   : TREM.Colors.surfaceVariant,
							fillOpacity : 3,
						},
					}).addTo(Maps.main));
		}

		if (!MapBases.mini.length)
			MapBases.mini.push("tw_county",
				L.geoJson.vt(MapData.tw_county, {
					minZoom   : 7,
					maxZoom   : 7,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 10,
					style     : {
						weight      : 0.8,
						color       : TREM.Colors.primary,
						fillColor   : "transparent",
						fillOpacity : 0,
					},
				}).addTo(Maps.mini));

		if (!MapBases.report.length) {
			for (const mapName of [
				"cn",
				"jp",
				"sk",
				"nk",
				"ph",
				"NZ",
				"in",
				"TU",
				"ta",
				"papua",
				"panama",
				"va",
				"ec",
				"af",
				"ru",
				"cl",
				"ar",
				"gu",
			])
				if (setting["map." + mapName])
					MapBases.report.push(`${mapName}`, L.geoJson.vt(MapData[mapName], {
						minZoom   : 1,
						maxZoom   : 12,
						tolerance : 20,
						buffer    : 256,
						debug     : 0,
						style     : {
							weight      : 0.8,
							color       : TREM.Colors.primary,
							fillColor   : TREM.Colors.surfaceVariant,
							fillOpacity : 1,
						},
					}).addTo(Maps.report));
			MapBases.report.push("tw_county",
				L.geoJson.vt(MapData.tw_county, {
					minZoom   : 1,
					maxZoom   : 12,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					style     : {
						weight      : 0.8,
						color       : TREM.Colors.primary,
						fillColor   : TREM.Colors.surfaceVariant,
						fillOpacity : 1,
					},
				}).addTo(Maps.report));

			if (setting["map.tw_fault"])
				MapBases.report.push("tw_fault",
					L.geoJson.vt(MapData.tw_fault, {
						minZoom   : 1,
						maxZoom   : 12,
						tolerance : 20,
						buffer    : 256,
						debug     : 0,
						style     : {
							weight      : 1.8,
							color       : "red",
							fillColor   : TREM.Colors.surfaceVariant,
							fillOpacity : 3,
						},
					}).addTo(Maps.report));
		}
	})().catch(e => {
		log(e, 3, "Colors&Map", "init");
		dump({ level: 2, message: e });
	});
	progressbar.value = (1 / progressStep) * 4;

	// Files
	await (async () => {
		await fetchFiles();

		if (!Timers.fetchFiles)
			Timers.fetchFiles = setInterval(fetchFiles, 10 * 60 * 1000);
	})().catch(e => {
		log(e, 3, "Files", "init");
		dump({ level: 2, message: e });
	});

	progressbar.value = 1;

	setUserLocationMarker(setting["location.town"]);
	$("#loading").text(TREM.Localization.getString("Application_Welcome"));
	$("#load").delay(1000).fadeOut(1000);
	Mapsmainfocus();
	setInterval(() => {
		if (mapLock || !setting["map.autoZoom"]) return;

		if (Object.keys(eew).length != 0) {
			for (let index = 0; index < Object.keys(eew).length; index++)
				if (eewt.id == 0 || eewt.id == eew[Object.keys(eew)[index]].id || NOW().getTime() - eew[Object.keys(eew)[index]].time >= 10000) {
					eewt.id = eew[Object.keys(eew)[index]].id;
					let Zoom = 9;
					// const X = 0;
					const km = (NOW().getTime() - eew[Object.keys(eew)[index]].Time) * 4;

					if (km > 50000)
						Zoom = 8.5;

					if (km > 100000)
						Zoom = 8;

					if (km > 150000)
						Zoom = 7.75;

					if (km > 200000)
						Zoom = 7.5;

					if (km > 250000)
						Zoom = 7.25;

					if (km > 300000)
						Zoom = 7;
					const num = Math.sqrt(Math.pow(23.608428 - eew[Object.keys(eew)[index]].lat, 2) + Math.pow(120.799168 - eew[Object.keys(eew)[index]].lon, 2));

					if (num >= 5)
						TREM.Earthquake.emit("focus", { center: [eew[Object.keys(eew)[index]].lat, eew[Object.keys(eew)[index]].lon], zoom: Zoom });
					else
						TREM.Earthquake.emit("focus", { center: [eew[Object.keys(eew)[index]].lat, eew[Object.keys(eew)[index]].lon], zoom: Zoom });
					eew[Object.keys(eew)[index]].time = NOW().getTime();
				}

		} else if (Object.keys(detected_box_list).length >= 1) {
			if (Object.keys(detected_box_list).length == 1) {
				const X1 = (TREM.Resources.area[Object.keys(detected_list)[0].toString()][0][0] + (TREM.Resources.area[Object.keys(detected_list)[0].toString()][2][0] - TREM.Resources.area[Object.keys(detected_list)[0].toString()][0][0]) / 2);
				const Y1 = (TREM.Resources.area[Object.keys(detected_list)[0].toString()][0][1] + (TREM.Resources.area[Object.keys(detected_list)[0].toString()][1][1] - TREM.Resources.area[Object.keys(detected_list)[0].toString()][0][1]) / 2);
				TREM.Earthquake.emit("focus", { center: [X1, Y1], zoom: 9.5 });
			} else if (Object.keys(detected_box_list).length >= 2) {
				let detected_list_length = 0;
				let xl = 0;
				let yl = 1;
				let focusScale = 9;

				let X1 = (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][0] + (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][2][0] - TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][0]) / 2);
				let Y1 = (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][1] + (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][1][1] - TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][1]) / 2);
				let X2 = (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][0] + (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][2][0] - TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][0]) / 2);
				let Y2 = (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][1] + (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][1][1] - TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][1]) / 2);

				if (Object.keys(detected_box_list).length == 2) {
					const num = Math.sqrt(Math.pow(X1 - X2, 2) + Math.pow(Y1 - Y2, 2));

					if (num > 0.6) focusScale = 9;

					if (num > 1) focusScale = 8.5;

					if (num > 1.5) focusScale = 8;

					if (num > 2.8) focusScale = 7;
				} else {
					if (Object.keys(detected_box_list).length >= 4) focusScale = 8;

					if (Object.keys(detected_box_list).length >= 6) focusScale = 7.5;

					if (Object.keys(detected_box_list).length >= 8) focusScale = 7;
				}

				for (let index = 0; index < Object.keys(detected_list).length; index++)
					if (Object.keys(detected_list)[index].toString() == "7735548") {
						focusScale = 5;
						xl = index;
					} else if (Object.keys(detected_list)[index].toString() == "13379360") {
						focusScale = 5;
						yl = index;
					} else {
						detected_list_length += 1;
					}

				if (xl != 0 || yl != 1) {
					X1 = (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][0] + (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][2][0] - TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][0]) / 2);
					Y1 = (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][1] + (TREM.Resources.area[Object.keys(detected_list)[xl].toString()][1][1] - TREM.Resources.area[Object.keys(detected_list)[xl].toString()][0][1]) / 2);
					X2 = (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][0] + (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][2][0] - TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][0]) / 2);
					Y2 = (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][1] + (TREM.Resources.area[Object.keys(detected_list)[yl].toString()][1][1] - TREM.Resources.area[Object.keys(detected_list)[yl].toString()][0][1]) / 2);
				}

				if (detected_list_length === 43) Mapsmainfocus();
				else TREM.Earthquake.emit("focus", { center: [(X1 + X2) / 2, (Y1 + Y2) / 2], zoom: focusScale });
			}

			map_move_back = true;
		} else
			if (map_move_back) {
				map_move_back = false;
				Mapsmainfocus();
			}
	}, 500);
	// const userJSON = require(path.resolve(__dirname, "../js/1669484541389.json"));
	// TREM.Intensity.handle(userJSON);
	// ipcRenderer.send("intensity-Notification", userJSON);
	// const userJSON = require(path.resolve(__dirname, "../js/1681965624647.json"));
	// TREM.MapIntensity.palert(userJSON);
	// const userJSON1 = require(path.resolve(__dirname, "../js/1681965685264.json"));
	// TREM.MapIntensity.palert(userJSON1);
	// const userJSON2 = require(path.resolve(__dirname, "../js/1674419931238.json"));
	// TREM.MapIntensity.palert(userJSON2);
	// const userJSON2 = require(path.resolve(__dirname, "../js/1667356513251.json"));
	// handler(userJSON2);
	// const userJSON3 = require(path.resolve(__dirname, "../js/1674021360000.json"));
	// const userJSON = {};
	// const userJSON1_iconUrl = "../image/cross.png";
	// const userJSON2_epicenterIcon = L.icon({
	// 	userJSON1_iconUrl,
	// 	iconSize  : [30, 30],
	// 	className : "epicenterIcon",
	// });
	// if (TREM.Detector.webgl || TREM.MapRenderingEngine == "mapbox-gl")
	// 	userJSON = new maplibregl.Marker(
	// 		{
	// 			element: $(`<img class="epicenterIcon" height="40" width="40" src="${userJSON1_iconUrl}"></img>`)[0],
	// 		})
	// 		.setLngLat([+userJSON3.lon, +userJSON3.lat])
	// 		.addTo(Maps.main);
	// else if (TREM.MapRenderingEngine == "leaflet")
	// 	userJSON = L.marker([+userJSON3.lat, +userJSON3.lon],
	// 		{
	// 			icon: userJSON2_epicenterIcon,
	// 		})
	// 		.addTo(Maps.main);
	// TREM.Earthquake.emit("eew", userJSON3);
	// const userJSON = require(path.resolve(__dirname, "../js/1675531439780.json"));
	// TREM.Earthquake.emit("trem-eq", userJSON);
	// const userJSON1 = require(path.resolve(__dirname, "../js/1674382618201.json"));
	// TREM.Earthquake.emit("trem-eq", userJSON1);
	// const userJSON = require(path.resolve(__dirname, "../js/1669621178753.json"));
	// FCMdata(userJSON, type = "websocket");
	// const userJSON1 = require(path.resolve(__dirname, "../js/test.json"));
	// TREM.MapArea2.setArea(userJSON1);
	// setTimeout(() => {
	// 	ipcRenderer.send("screenshotEEWI", {
	// 		Function : "intensity",
	// 		ID       : 1,
	// 		Version  : 1,
	// 		Time     : NOW().getTime(),
	// 		Shot     : 1,
	// 	});
	// }, 1250);
	// const userJSON = require(path.resolve(__dirname, "../js/123.json"));
	// const userJSON1 = require(path.resolve(__dirname, "../js/2.json"));
	// const userJSON2 = require(path.resolve(__dirname, "../js/1.json"));
	// ipcRenderer.send("TREMIntensityhandle", userJSON);
	// ipcRenderer.send("TREMIntensityhandle", userJSON1);
	// ipcRenderer.send("TREMIntensityhandle", userJSON2);
	// TREM.Intensity.handle(userJSON1);
	// TREM.Intensity.handle(userJSON2);
	// ipcRenderer.send("intensity-Notification", userJSON);
	// ipcRenderer.send("intensity-Notification", userJSON1);
	// const userJSON = require(path.resolve(__dirname, "../js/1688811850345.json"));
	// TREM.PWS.addPWS(userJSON.raw);

	// setTimeout(() => {
	// 	const test_json = {
	// 		type: 'eew',
	// 		author: 'nied',
	// 		id: '20240130001930',
	// 		serial: 5,
	// 		status: 0,
	// 		final: 1,
	// 		eq: {
	// 		  time: 1706571830000,
	// 		  lon: 142.4,
	// 		  lat: 42,
	// 		  depth: 80,
	// 		  mag: 4.2,
	// 		  loc: '浦河沖',
	// 		  max: 0,
	// 		  status: 0
	// 		},
	// 		timestamp: 1706571830385
	// 	}
	// 	const test_Unit = "websocket";
	// 	FCMdata(test_json, test_Unit);
	// }, 5000);

	// const ans0 = [
	// 	{
	// 		author : "cwa",
	// 		id     : "1130669",
	// 		serial : 2,
	// 		status : 0,
	// 		final  : 0,
	// 		eq     : {
	// 			time  : 1714137688000,
	// 			lon   : 121.52,
	// 			lat   : 23.82,
	// 			depth : 10,
	// 			mag   : 5,
	// 			loc   : "花蓮縣壽豐鄉",
	// 			max   : 4,
	// 		},
	// 		time: 1714137688000,
	// 	},
	// ];

	// if (ans0.length != 0)
	// 	for (const e of ans0) {
	// 		e.type = "eew";
	// 		e.timestamp = Date.now();
	// 		FCMdata(e, ServerType = "http");
	// 	}

	document.getElementById("rt-station-local").addEventListener("click", () => {
		navigator.clipboard.writeText(document.getElementById("rt-station-local-id").innerText).then(() => {
			console.debug(document.getElementById("rt-station-local-id").innerText);
			console.debug("複製成功");
		});
	});

	if (localStorage.cwb_to_cwa == undefined) {
		localStorage.cwb_to_cwa = true;
		ipcRenderer.send("config:value", "accept.eew.CWA", setting["accept.eew.CWB"]);
		ipcRenderer.send("config:value", "report.onlycwachangeView", setting["report.onlycwbchangeView"]);
		ipcRenderer.send("config:value", "intensity.cwa", setting["intensity.cwb"]);
	}

	const loadDiv = document.getElementById("load");

	if (loadDiv)
		loadDiv.remove();

	globalgc();
}
// #endregion

function PGAMain() {
	log("Starting PGA timer", 1, "PGATimer", "PGAMain");
	dump({ level: 0, message: "Starting PGA timer", origin: "PGATimer" });

	if (Timers.rts_clock) clearInterval(Timers.rts_clock);

	if (Timers.eew_clock) clearInterval(Timers.eew_clock);

	if (replayD) {
		Timers.rts_clock = setInterval(() => {
			try {
				const ReplayTimed = replayTemp += 1000;
				const ReplayTimeD = ReplayTimed - 1000;
				const gettime = ReplayTimeD / 1000;
				const userJSON = JSON.parse(fs.readFileSync(`${path.join(path.join(app.getPath("userData"), "replay_data"), String(replaydir))}/${gettime}.trem`).toString());
				const ans_eew = userJSON.eew;
				Ping = "🔁 cache";
				handler(userJSON.rts);

				for (let i = 0; i < ans_eew.eew.length; i++) {
					console.debug(ans_eew.eew[i]);
					ans_eew.eew[i].replay_timestamp = ans_eew.eew[i].timestamp;
					ans_eew.eew[i].replay_time = ans_eew.eew[i].time;
					ans_eew.eew[i].time = NOW().getTime() - (ans_eew.eew[i].timestamp - ans_eew.eew[i].time);
					ans_eew.eew[i].timestamp = NOW().getTime();
					FCMdata(ans_eew.eew[i], "cache");
				}
			} catch (err) {
				console.log(err);
				// TimerDesynced = true;
				PGAMainbkup();
			}
		}, 1_000);
	} else if (!replayF) {
		Timers.eew_clock = setInterval(() => {
			const ReplayTime = (replay == 0) ? 0 : replay + (NOW().getTime() - replayT);

			if (ReplayTime != 0 && TREM.Report.replayHttp) {
				const controller1 = new AbortController();
				setTimeout(() => {
					controller1.abort();
				}, 2500);
				fetch(route.eewReplay(1, ReplayTime), { signal: controller1.signal }).then((res2) => {
					if (res2.ok) {
						res2.json().then(res3 => {
							if (controller1.signal.aborted || res3 == undefined)
								console.debug("api_eq_undefined");
							else
								for (let i = 0; i < res3.length; i++) {
									if (!EarthquakeList[res3[i].id]) {
										res3[i].replay_timestamp = ReplayTime;
										res3[i].replay_time = res3[i].time;
										res3[i].time = NOW().getTime() - (ReplayTime - res3[i].time);
										res3[i].timestamp = NOW().getTime();
										res3[i].type = "eew";
									} else {
										res3[i].replay_timestamp = ReplayTime;
										res3[i].replay_time = res3[i].time;
										res3[i].time = EarthquakeList[res3[i].id].Time;
										res3[i].timestamp = NOW().getTime();
										res3[i].type = "eew";
									}

									FCMdata(res3[i], "http");
								}
						});
					} else {
						console.error(res2);

						switch (res2.status) {
							case 429: {
								Ping = `❌ ${res2.status}`;
								break;
							}

							case 404: {
								Ping = `❌ ${res2.status}`;
								break;
							}

							case 500: {
								Ping = `❌ ${res2.status}`;
								break;
							}

							default: {
								Ping = `❌ ${res2.status}`;
								break;
							}
						}
					}
				}).catch((err) => {
					log(err, 3, "PGATimer", "PGAMain");
					dump({ level: 2, message: err });
				});
			}
		}, 1_000);
		Timers.rts_clock = setInterval(() => {
			setTimeout(() => {
				try {
					const _t = NOW().getTime();
					const ReplayTime = (replay == 0) ? 0 : replay + (NOW().getTime() - replayT);

					if (ReplayTime == 0) {
						if (rts_ws_timestamp && setting["Real-time.websocket"] === "exptech") {
							const t0 = Math.abs((rts_response.Time ?? rts_response.time) - NOW().getTime());

							if (!rts_key_verify) {
								Ping = `🔒 ${(Math.abs((rts_response.Time ?? rts_response.time) - NOW().getTime()) / 1000).toFixed(1)}s`;
								Response = rts_response;
							} else if (rts_key_verify) {
								if (t0 < 1500) Ping = `⚡ ${(t0 / 1000).toFixed(1)}s`;
								else if (t0 < 7500) Ping = `📶 ${(t0 / 1000).toFixed(1)}s`;
								else Ping = `⚠️ ${(t0 / 1000).toFixed(1)}s`;

								// Ping = NOW().getTime() - rts_ws_timestamp + "ms " + "⚡";

								Response = rts_response;

								if ((NOW().getTime() - rts_ws_timestamp) > 10_000 && !setting["sleep.mode"] && !rts_ws2_timestamp) {
									Ping = `❌ ${((NOW().getTime() - rts_ws_timestamp) / 1000).toFixed(1)}s`;
									log("PGA timer time out 10s", 2, "PGATimer", "PGAMain");
									dump({ level: 1, message: "PGA timer time out 10s", origin: "PGATimer" });
									setTimeout(() => {
										reconnect();
										PGAMainbkup();
									}, 3000);

									if (Timers.rts_clock) clearInterval(Timers.rts_clock);
								} else if ((NOW().getTime() - Response.Time) > 1_000 && setting["sleep.mode"]) {
									Ping = "💤";
								} else if (setting["sleep.mode"]) {
									Ping = "💤";
								}
							}
							// ipcRenderer.send("restart");
						} else if (rts_ws2_timestamp && setting["Real-time.websocket"] === "yayacat") {
							const t0 = Math.abs((rts_response_new.Time ?? rts_response_new.time) - NOW().getTime());

							if (!rts_key_verify) {
								Ping = `🔒 ${(Math.abs((rts_response.Time ?? rts_response.time) - NOW().getTime()) / 1000).toFixed(1)}s`;
								Response = rts_response;
							} else if (rts_key_verify) {
								if (t0 < 1500) Ping = `⚡ ${(t0 / 1000).toFixed(1)}s`;
								else if (t0 < 7500) Ping = `📶 ${(t0 / 1000).toFixed(1)}s`;
								else Ping = `⚠️ ${(t0 / 1000).toFixed(1)}s`;

								// Ping = NOW().getTime() - rts_ws_timestamp + "ms " + "⚡";

								Response = rts_response_new;

								if ((NOW().getTime() - rts_ws2_timestamp) > 10_000 && !setting["sleep.mode"] && !rts_ws_timestamp) {
									Ping = `❌ ${((NOW().getTime() - rts_ws2_timestamp) / 1000).toFixed(1)}s`;
									log("PGA 2 timer time out 10s", 2, "PGATimer", "PGAMain");
									dump({ level: 1, message: "PGA 2 timer time out 10s", origin: "PGATimer" });
									setTimeout(() => {
										reconnect2();
										PGAMainbkup();
									}, 3000);

									if (Timers.rts_clock) clearInterval(Timers.rts_clock);
								} else if ((NOW().getTime() - Response.Time) > 1_000 && setting["sleep.mode"]) {
									Ping = "💤";
								} else if (setting["sleep.mode"]) {
									Ping = "💤";
								}
							}
							// ipcRenderer.send("restart");
						} else {
							for (const removedKey of Object.keys(Station)) {
								Station[removedKey].remove();
								delete Station[removedKey];
							}

							if (setting["sleep.mode"])
								Ping = "💤";
							else
								Ping = "🔒";
						}
					} else if (!replayD) {
						const url = route.rtsReplay(1, ReplayTime);
						// + "&key=" + setting["exptech.key"]
						const controller = new AbortController();
						setTimeout(() => {
							controller.abort();
						}, 5000);
						fetch(url, { signal: controller.signal }).then((res) => {
							if (res.ok) {
								res.json().then(res1 => {
									if (controller.signal.aborted || res1 == undefined) {
										Ping = "🔒";
									} else {
										Ping = `🔁 ${(Math.abs(NOW().getTime() - _t) / 1000).toFixed(1)}s`;
										Response = res1;
									}
								});
							} else {
								console.error(res);

								switch (res.status) {
									case 429: {
										Ping = `❌ ${res.status}`;
										break;
									}

									case 404: {
										Ping = `❌ ${res.status}`;
										break;
									}

									case 500: {
										Ping = `❌ ${res.status}`;
										break;
									}

									default: {
										Ping = `❌ ${res.status}`;
										break;
									}
								}

								PGAMainbkup();
							}
						}).catch((err) => {
							log(err, 3, "PGATimer", "PGAMain");
							dump({ level: 2, message: err });
							PGAMainbkup();
						});
					}

					handler(Response);
				} catch (err) {
					console.log(err);
					// TimerDesynced = true;
					PGAMainbkup();
				}
			}, (NOW().getMilliseconds() > 500) ? 1000 - NOW().getMilliseconds() : 500 - NOW().getMilliseconds());
		}, 500);
	}
}

function PGAMainbkup() {
	log("Starting PGA timer backup", 1, "PGATimer", "PGAMainbkup");
	dump({ level: 0, message: "Starting PGA timer backup", origin: "PGATimer" });

	if (Timers.rts_clock) clearInterval(Timers.rts_clock);

	if (Timers.eew_clock) clearInterval(Timers.eew_clock);

	if (replayD) {
		Timers.rts_clock = setInterval(() => {
			try {
				const ReplayTimed = replayTemp += 1000;
				const ReplayTimeD = ReplayTimed - 1000;
				const gettime = ReplayTimeD / 1000;
				const userJSON = JSON.parse(fs.readFileSync(`${path.join(path.join(app.getPath("userData"), "replay_data"), String(replaydir))}/${gettime}.trem`).toString());
				const ans_eew = userJSON.eew;
				Ping = "🔁 cache";
				handler(userJSON.rts);

				for (let i = 0; i < ans_eew.eew.length; i++) {
					console.debug(ans_eew.eew[i]);
					ans_eew.eew[i].replay_timestamp = ans_eew.eew[i].timestamp;
					ans_eew.eew[i].replay_time = ans_eew.eew[i].time;
					ans_eew.eew[i].time = NOW().getTime() - (ans_eew.eew[i].timestamp - ans_eew.eew[i].time);
					ans_eew.eew[i].timestamp = NOW().getTime();
					FCMdata(ans_eew.eew[i], "cache");
				}
			} catch (err) {
				console.log(err);
				// TimerDesynced = true;
				PGAMain();
			}
		}, 1_000);
	} else if (!replayF) {
		Timers.eew_clock = setInterval(() => {
			const ReplayTime = (replay == 0) ? 0 : replay + (NOW().getTime() - replayT);

			if (ReplayTime != 0 && TREM.Report.replayHttp) {
				const controller1 = new AbortController();
				setTimeout(() => {
					controller1.abort();
				}, 2500);
				axios({
					method : "get",
					url    : route.eewReplay(1, ReplayTime),
				}).then((res2) => {
					if (res2.ok) {
						res2.json().then(res3 => {
							if (controller1.signal.aborted || res3 == undefined)
								console.debug("bkup_api_eq_undefined");
							else
								for (let i = 0; i < res3.length; i++) {
									if (!EarthquakeList[res3[i].id]) {
										res3[i].replay_timestamp = ReplayTime;
										res3[i].replay_time = res3[i].time;
										res3[i].time = NOW().getTime() - (ReplayTime - res3[i].time);
										res3[i].timestamp = NOW().getTime();
										res3[i].type = "eew";
									} else {
										res3[i].replay_timestamp = ReplayTime;
										res3[i].replay_time = res3[i].time;
										res3[i].time = EarthquakeList[res3[i].id].Time;
										res3[i].timestamp = NOW().getTime();
										res3[i].type = "eew";
									}

									FCMdata(res3[i], "http");
								}
						});
					} else {
						console.error(res2);

						switch (res2.status) {
							case 429: {
								Ping = `❌ ${res2.status}`;
								break;
							}

							case 404: {
								Ping = `❌ ${res2.status}`;
								break;
							}

							case 500: {
								Ping = `❌ ${res2.status}`;
								break;
							}

							default: {
								Ping = `❌ ${res2.status}`;
								break;
							}
						}
					}
				}).catch((err) => {
					log(err, 3, "PGATimer", "PGAMainbkup");
					dump({ level: 2, message: err });
				});
			}
		}, 1_000);
		Timers.rts_clock = setInterval(() => {
			setTimeout(() => {
				try {
					const _t = NOW().getTime();
					const ReplayTime = (replay == 0) ? 0 : replay + (NOW().getTime() - replayT);

					if (ReplayTime == 0) {
						if (rts_ws_timestamp && setting["Real-time.websocket"] === "exptech") {
							const t1 = Math.abs((rts_response.Time ?? rts_response.time) - NOW().getTime());

							if (!rts_key_verify) {
								Ping = `🔒 ${(Math.abs((rts_response.Time ?? rts_response.time) - NOW().getTime()) / 1000).toFixed(1)}s`;
								Response = rts_response;
							} else if (rts_key_verify) {
								if (t1 < 1500) Ping = `⚡ ${(t1 / 1000).toFixed(1)}s`;
								else if (t1 < 7500) Ping = `📶 ${(t1 / 1000).toFixed(1)}s`;
								else Ping = `⚠️ ${(t1 / 1000).toFixed(1)}s`;

								// Ping = NOW().getTime() - rts_ws_timestamp + "ms " + "⚡";

								Response = rts_response;

								if ((NOW().getTime() - rts_ws_timestamp) > 10_000 && !setting["sleep.mode"] && !rts_ws2_timestamp) {
									Ping = `❌ ${((NOW().getTime() - rts_ws_timestamp) / 1000).toFixed(1)}s`;
									log("PGA timer backup time out 10s", 2, "PGATimer", "PGAMainbkup");
									dump({ level: 1, message: "PGA timer backup time out 10s", origin: "PGATimer" });
									setTimeout(() => {
										reconnect();
										PGAMain();
									}, 3000);

									if (Timers.rts_clock) clearInterval(Timers.rts_clock);
								} else if ((NOW().getTime() - Response.Time) > 1_000 && setting["sleep.mode"]) {
									Ping = "💤";
								} else if (setting["sleep.mode"]) {
									Ping = "💤";
								}
							}
							// ipcRenderer.send("restart");
						} else if (rts_ws2_timestamp && setting["Real-time.websocket"] === "yayacat") {
							const t1 = Math.abs((rts_response_new.Time ?? rts_response_new.time) - NOW().getTime());

							if (!rts_key_verify) {
								Ping = `🔒 ${(Math.abs((rts_response.Time ?? rts_response.time) - NOW().getTime()) / 1000).toFixed(1)}s`;
								Response = rts_response;
							} else if (rts_key_verify) {
								if (t1 < 1500) Ping = `⚡ ${(t1 / 1000).toFixed(1)}s`;
								else if (t1 < 7500) Ping = `📶 ${(t1 / 1000).toFixed(1)}s`;
								else Ping = `⚠️ ${(t1 / 1000).toFixed(1)}s`;

								// Ping = NOW().getTime() - rts_ws_timestamp + "ms " + "⚡";

								Response = rts_response_new;

								if ((NOW().getTime() - rts_ws2_timestamp) > 10_000 && !setting["sleep.mode"] && !rts_ws_timestamp) {
									Ping = `❌ ${((NOW().getTime() - rts_ws2_timestamp) / 1000).toFixed(1)}s`;
									log("PGA timer backup time out 10s", 2, "PGATimer", "PGAMainbkup");
									dump({ level: 1, message: "PGA timer backup time out 10s", origin: "PGATimer" });
									setTimeout(() => {
										reconnect2();
										PGAMain();
									}, 3000);

									if (Timers.rts_clock) clearInterval(Timers.rts_clock);
								} else if ((NOW().getTime() - Response.Time) > 1_000 && setting["sleep.mode"]) {
									Ping = "💤";
								} else if (setting["sleep.mode"]) {
									Ping = "💤";
								}
							}
							// ipcRenderer.send("restart");
						} else {
							for (const removedKey of Object.keys(Station)) {
								Station[removedKey].remove();
								delete Station[removedKey];
							}

							if (setting["sleep.mode"])
								Ping = "💤";
							else
								Ping = "🔒";
						}
					} else if (!replayD) {
						const url = route.rtsReplay(1, ReplayTime);
						// + "&key=" + setting["exptech.key"]
						axios({
							method : "get",
							url    : url,
						}).then((response) => {
							if (response.ok) {
								Ping = `🔁 ${(Math.abs(NOW().getTime() - _t) / 1000).toFixed(1)}s`;
								Response = response.data;
							} else {
								console.error(response);

								switch (response.status) {
									case 429: {
										Ping = `❌ ${response.status}`;
										break;
									}

									case 404: {
										Ping = `❌ ${response.status}`;
										break;
									}

									case 500: {
										Ping = `❌ ${response.status}`;
										break;
									}

									default: {
										Ping = `❌ ${response.status}`;
										break;
									}
								}

								PGAMain();
							}
						}).catch((err) => {
							log(err, 3, "PGATimer", "PGAMainbkup");
							dump({ level: 2, message: err });
							PGAMain();
						});
					}

					handler(Response);
				} catch (err) {
					console.log(err);
					// TimerDesynced = true;
					PGAMain();
				}
			}, (NOW().getMilliseconds() > 500) ? 1000 - NOW().getMilliseconds() : 500 - NOW().getMilliseconds());
		}, 500);
	}
}

function handler(Json) {
	// console.log(Json);
	// console.log(station);

	stationnow = 0;
	stationnowall = 0;
	Response = {};
	MAXPGA = { pga: 0, station: "NA", level: 0 };

	// if (Unlock)
	// 	if (replay != 0)
	// 		ipcRenderer.send("RTSUnlock", !Unlock);
	// 	else
	// 		ipcRenderer.send("RTSUnlock", Unlock);
	// 		// document.getElementById("rt-station").classList.remove("hide");
	// 		// document.getElementById("rt-station").classList.add("left");
	// 		// document.getElementById("rt-maxintensitynum").classList.remove("hide");
	// else
	// 	ipcRenderer.send("RTSUnlock", Unlock);
	// 	// document.getElementById("rt-station").classList.add("hide");
	// 	// document.getElementById("rt-station").classList.remove("left");
	// 	// document.getElementById("rt-maxintensitynum").classList.add("hide");

	const Station_rm = (Json_rm) => Object.keys(Station).filter(key => !Object.keys(Json_rm).includes(key));

	const removed = Json.station ? Station_rm(Json.station) : Station_rm(Json);

	for (const removedKey of removed) {
		Station[removedKey].remove();
		delete Station[removedKey];
	}

	if (Object.keys(eew).length && !rts_remove_eew) {
		rts_remove_eew = true;

		for (const removedKey of Object.keys(Station)) {
			Station[removedKey].remove();
			delete Station[removedKey];
		}
	}

	if (localStorage.stationtime == undefined)
		localStorage.stationtime = JSON.stringify({});

	const station_time_json = JSON.parse(localStorage.stationtime);
	let max_intensity = -1;
	MaxIntensity1 = 0;
	let stationnowindex = 0;
	let target_count = 0;
	const detection_location = Json.area ?? [];
	const detection_list = Json.box ?? {};
	const Json_temp = Json.station ? Json.station : Json;
	const Json_Time = Json.Time ?? Json.time;

	const now_format = (time) => timeconvert(time).format("HH:mm:ss");

	const now = new Date(Json_Time);
	let now_f = now_format(now);
	const now_time = NOW().getTime();
	Json_temp.area = detection_location;

	if (detection_location.length) TREM.MapArea2.setArea(Json_temp);

	// if (Object.keys(detection_list).length) console.log(detection_list);

	for (let index = 0, keys = Object.keys(station), n = keys.length; index < n; index++) {
		const uuid = keys[index];
		const id = uuid.split("-")[2];
		const current_station_data = station[uuid];
		const current_data = Json.station ? Json.station[id] : Json[id];

		if (!current_station_data.work && replay == 0) continue;

		stationnowall++;

		if (replay != 0) {
			const station_ = station_data[id];

			if (station_.info.length > 1) {
				let latest = station_.info[0];

				for (let i = 0; i < station_.info.length; i++) {
					const currentTime = new Date(station_.info[i].time);

					if (now > currentTime)
						latest = station_.info[i];
				}

				for (let i = 0, ks = Object.keys(TREM.Resources.regionv2), j = ks.length; i < j; i++) {
					const reg_id = ks[i];
					const reg = TREM.Resources.regionv2[reg_id];

					for (let r = 0, r_ks = Object.keys(reg), l = r_ks.length; r < l; r++) {
						const ion_id = r_ks[r];
						const ion = reg[ion_id];

						if (ion.code === latest.code) {
							current_station_data.Loc = `${reg_id} ${ion_id}`;
							current_station_data.Lat = latest.lat;
							current_station_data.Long = latest.lon;
						}
					}
				}
			}
		}

		// if (uuid == "H-979-11336952-11")
		// 	console.log(current_data);

		let level_class = "";
		let station_tooltip = "";
		let size = 8;
		let amount = 0;
		let intensity = 0;
		let intensitytest = 0;
		const Alert = current_data?.alert ?? false;

		if (current_data == undefined) {
			level_class = "na";

			if (station_time_json[uuid] == undefined && replay == 0)
				station_time_json[uuid] = Date.now();
			else if (station_time_json[uuid] == 0 && replay == 0)
				station_time_json[uuid] = Date.now();
			else if (station_time_json[uuid] == undefined && replay != 0)
				station_time_json[uuid] = 0;

			const off_now = new Date(station_time_json[uuid]);
			station_tooltip = `<div>${keys[index]}(${current_station_data.Loc})無資料</div><div>最近離線時間: ${timeconvert(off_now).format("YYYY/MM/DD HH:mm:ss")}</div>`;
			size = 8;
			amount = "--";
			intensity = "-";

			if (rtstation1 == "") {
				if (keys.includes(setting["Real-time.station"])) {
					if (keys[index] == setting["Real-time.station"]) {
						if (document.getElementById("rt-station").classList.contains("hide"))
							document.getElementById("rt-station").classList.remove("hide");
						document.getElementById("rt-station-local-intensity").className = `rt-station-intensity ${(amount < 999 && intensity != "NA") ? IntensityToClassString(intensity) : "na"}`;
						document.getElementById("rt-station-local-id").innerText = keys[index];
						document.getElementById("rt-station-local-name").innerText = current_station_data.Loc;
						document.getElementById("rt-station-local-time").innerText = now_format(off_now);
						document.getElementById("rt-station-local-pga").innerText = amount;
					}
				} else {
					document.getElementById("rt-station-local-intensity").className = "rt-station-intensity na";
					document.getElementById("rt-station-local-id").innerText = TREM.Localization.getString("Realtime_No_Data");
					document.getElementById("rt-station-local-name").innerText = TREM.Localization.getString("Realtime_No_Data");
					document.getElementById("rt-station-local-time").innerText = "--:--:--";
					document.getElementById("rt-station-local-pga").innerText = "--";
				}
			} else if (rtstation1 == keys[index]) {
				document.getElementById("rt-station-local-intensity").className = `rt-station-intensity ${(amount < 999 && intensity != "NA") ? IntensityToClassString(intensity) : "na"}`;
				document.getElementById("rt-station-local-id").innerText = keys[index];
				document.getElementById("rt-station-local-name").innerText = current_station_data.Loc;
				document.getElementById("rt-station-local-time").innerText = now_format(off_now);
				document.getElementById("rt-station-local-pga").innerText = amount;
			}
		} else {
			station_time_json[uuid] = 0;

			if (current_data.a) amount = +current_data.a;
			else amount = +current_data.pga;

			// if (amount > current_station_data.MaxPGA) current_station_data.MaxPGA = amount;
			now_f = now_format(now);
			intensity = (rts_key_verify && Alert) ? Math.round(current_data.I)
				: (current_data.i >= 0) ? Math.round(current_data.i)
					: (now_time - current_data.TS * 1000 > 5000) ? "NA"
						: 0;
			// : (amount >= 800) ? 9
			// 	: (amount >= 440) ? 8
			// 		: (amount >= 250) ? 7
			// 			: (amount >= 140) ? 6
			// 				: (amount >= 80) ? 5
			// 					: (amount >= 25) ? 4
			// 						: (amount >= 8) ? 3
			// 							: (amount >= 5) ? 2
			// 								: (amount >= 2.2) ? 1
			// 									: 0;
			intensitytest = (current_data.i) ? Math.round(current_data.i) : -5;
			size = (intensity == 0 || intensity == "NA" || amount == 999 || !Alert) ? 8 : 16;
			level_class = (intensity != 0 && Alert) ? IntensityToClassString(intensity)
				: (intensity == 0 && Alert) ? "pga0"
					: (amount == 999) ? "pga6"
						: (amount > 4.5) ? "pga5"
							: (amount > 4) ? "pga4"
								: (amount > 3.5) ? "pga3"
									: (amount > 3) ? "pga2"
										: "pga1";

			if (setting["Real-time.websocket"] === "yayacat" && Alert && setting["dev.mode"]) {
				intensity = Math.round(current_data.i);
				level_class = IntensityToClassString(intensity);
			}

			if (intensity > MaxIntensity1) MaxIntensity1 = intensity;

			if (intensity > MaxIntensity2) MaxIntensity2 = intensity;

			if (intensity != "NA") {
				stationnowindex += 1;
				stationnow = stationnowindex;
			}

			if (!current_data.alert) delete level_list[uuid];

			if (current_data.alert) {
				if (current_data.a) if ((level_list[uuid] ?? 0) < current_data.a) level_list[uuid] = current_data.a;

				if (current_data.pga) if ((level_list[uuid] ?? 0) < current_data.pga) level_list[uuid] = current_data.pga;
				target_count++;
			}

			const pgv = current_data.v ?? current_data.pgv;

			station_tooltip = `<div>${keys[index]}</div><div>${current_station_data.Loc}</div><div>${amount}</div><div>${pgv}</div><div>${current_data.i}</div>`;

			if (rtstation1 == "") {
				if (keys.includes(setting["Real-time.station"])) {
					if (keys[index] == setting["Real-time.station"]) {
						if (document.getElementById("rt-station").classList.contains("hide"))
							document.getElementById("rt-station").classList.remove("hide");
						document.getElementById("rt-station-local-intensity").className = `rt-station-intensity ${(amount < 999 && intensity != "NA") ? IntensityToClassString(intensity) : "na"}`;
						document.getElementById("rt-station-local-id").innerText = keys[index];
						document.getElementById("rt-station-local-name").innerText = current_station_data.Loc;
						document.getElementById("rt-station-local-time").innerText = now_f;
						document.getElementById("rt-station-local-pga").innerText = amount;
					}
				} else {
					document.getElementById("rt-station-local-intensity").className = "rt-station-intensity na";
					document.getElementById("rt-station-local-id").innerText = TREM.Localization.getString("Realtime_No_Data");
					document.getElementById("rt-station-local-name").innerText = TREM.Localization.getString("Realtime_No_Data");
					document.getElementById("rt-station-local-time").innerText = "--:--:--";
					document.getElementById("rt-station-local-pga").innerText = "--";
				}
			} else if (rtstation1 == keys[index]) {
				document.getElementById("rt-station-local-intensity").className = `rt-station-intensity ${(amount < 999 && intensity != "NA") ? IntensityToClassString(intensity) : "na"}`;
				document.getElementById("rt-station-local-id").innerText = keys[index];
				document.getElementById("rt-station-local-name").innerText = current_station_data.Loc;
				document.getElementById("rt-station-local-time").innerText = now_f;
				document.getElementById("rt-station-local-pga").innerText = amount;
			}
		}

		if (current_data != undefined || (rts_key_verify && !setting["sleep.mode"]) || replay != 0) {
			if (!Station[keys[index]] && (!rts_remove_eew || Alert))
				Station[keys[index]] = L.marker(
					[current_station_data.Lat, keys[index].startsWith("H") ? current_station_data.Long + 0.0001 : current_station_data.Long],
					{
						icon: L.divIcon({
							iconSize  : [size, size],
							className : `map-intensity-icon rt-icon ${level_class}`,
						}),
						keyboard: false,
					})
					.addTo(Maps.main)
					.bindTooltip(station_tooltip, {
						offset    : [8, 0],
						permanent : false,
						className : current_data == undefined ? "rt-station-tooltip-na" : "rt-station-tooltip",
					})
					.on("click", () => {
						// Station[keys[index]].keepTooltipAlive = !Station[keys[index]].keepTooltipAlive;

						// if (Maps.main.getZoom() < 11) {
						// 	const tooltip = Station[keys[index]].getTooltip();
						// 	Station[keys[index]].unbindTooltip();

						// 	if (Station[keys[index]].keepTooltipAlive)
						// 		tooltip.options.permanent = true;
						// 	else
						// 		tooltip.options.permanent = false;
						// 	Station[keys[index]].bindTooltip(tooltip);
						// }

						if (rtstation1 == "") {
							rtstation1 = keys[index];
							app.Configuration.data["Real-time.station"] = keys[index];
						} else if (rtstation1 == keys[index]) {
							rtstation1 = "";
							app.Configuration.data["Real-time.station"] = setting["Real-time.station"];
						} else if (rtstation1 != keys[index]) {
							rtstation1 = keys[index];
							app.Configuration.data["Real-time.station"] = keys[index];
						}
					});

			if (Station[keys[index]]) {
				if (Station[keys[index]].getIcon()?.options?.className != `map-intensity-icon rt-icon ${level_class}`)
					Station[keys[index]].setIcon(L.divIcon({
						iconSize  : [size, size],
						className : `map-intensity-icon rt-icon ${level_class}`,
					}));

				Station[keys[index]]
					.setZIndexOffset(2000 + ~~(amount * 10) + intensity * 500)
					.setTooltipContent(station_tooltip);
			}
		}

		const Level = IntensityI(intensity);

		// if (intensity != "NA" && (intensity >= 0 && Alert) && amount < 999 && (target_count > 1 || Object.keys(eew).length != 0)) {
		// detected_list[current_station_data.PGA] ??= {
		// 	intensity : intensity,
		// 	time      : 0,
		// };

		// if ((detected_list[current_station_data.PGA].intensity ?? 0) < intensity)
		// 	detected_list[current_station_data.PGA].intensity = intensity;

		if (Json.Alert)
			if (setting["audio.realtime"])
				if (amount > 8 && PGALimit == 0) {
					PGALimit = 1;
					log("Playing Audio > pga1", 1, "Audio", "handler");
					dump({ level: 0, message: "Playing Audio > pga1", origin: "Audio" });
					TREM.Audios.pga1.play();
				} else if (amount > 250 && PGALimit > 1) {
					PGALimit = 2;
					log("Playing Audio > pga2", 1, "Audio", "handler");
					dump({ level: 0, message: "Playing Audio > pga2", origin: "Audio" });
					TREM.Audios.pga2.play();
				}

		// detected_list[current_station_data.PGA].time = NOW().getTime();
		// } else
		if (Object.keys(detection_list).length) {
			for (let i = 0; i < Object.keys(detection_list).length; i++) {
				const key = Object.keys(detection_list)[i];

				if (max_intensity < detection_list[key]) max_intensity = detection_list[key];

				detected_list[key] ??= {
					intensity : detection_list[key],
					time      : NOW().getTime(),
				};

				if (detection_list[key] != detected_list[key].intensity) detected_list[key] = {
					intensity : detection_list[key],
					time      : NOW().getTime(),
				};
			}

			if (max_intensity > intensitytag) {
				if (setting["audio.realtime"]) {
					const loc = detection_location[0] ?? "未知區域";

					if (max_intensity > 4 || intensitytag > 4) {
						if (speecd_use) TREM.speech.speak({ text: `強震檢測，${loc}` });
						log("Playing Audio > int2", 1, "Audio", "handler");
						dump({ level: 0, message: "Playing Audio > int2", origin: "Audio" });
						TREM.Audios.int2.play();
						new Notification("🟥 強震檢測", {
							body   : `${loc}`,
							icon   : "../TREM.ico",
							silent : win.isFocused(),
						});
					} else if (max_intensity > 1 || intensitytag > 1) {
						if (speecd_use) TREM.speech.speak({ text: `震動檢測，${loc}` });
						log("Playing Audio > int1", 1, "Audio", "handler");
						dump({ level: 0, message: "Playing Audio > int1", origin: "Audio" });
						TREM.Audios.int1.play();
						new Notification("🟨 震動檢測", {
							body   : `${loc}`,
							icon   : "../TREM.ico",
							silent : win.isFocused(),
						});
					} else if (intensitytag == -1) {
						if (speecd_use) TREM.speech.speak({ text: `弱反應，${loc}` });
						log("Playing Audio > int0", 1, "Audio", "handler");
						dump({ level: 0, message: "Playing Audio > int0", origin: "Audio" });
						TREM.Audios.int0.play();
						new Notification("🟩 弱反應", {
							body   : `${loc}`,
							icon   : "../TREM.ico",
							silent : win.isFocused(),
						});
					}

					const _intensity = `${IntensityI(max_intensity)}級`;

					if (speecd_use) TREM.speech.speak({ text: `觀測最大震度，${_intensity.replace("-級", "弱").replace("+級", "強")}` });
				}

				setTimeout(() => {
					ipcRenderer.send("screenshotEEW", {
						Function : "station",
						ID       : 1,
						Version  : 1,
						Time     : NOW().getTime(),
						Shot     : 1,
					});
				}, 1250);

				if (setting["Real-time.show"]) win.showInactive();

				if (setting["Real-time.cover"])
					if (!win.isFullScreen()) {
						win.setAlwaysOnTop(true);
						win.focus();
						win.setAlwaysOnTop(false);
					}

				if (!win.isFocused()) win.flashFrame(true);

				// TREM.MapIntensity.trem = false;
				// TREM.MapIntensity.MaxI = max_intensity;
				// Report = Json_Time;
				// Report_GET();
				intensitytag = max_intensity;
			}
		}
		//  else if (intensitytest > -1 && amount < 999) {
		// 	if (uuid.split("-")[2] == "7735548")
		// 		current_station_data.PGA = 7735548;
		// 	else if (uuid.split("-")[2] == "13379360")
		// 		current_station_data.PGA = 13379360;

		// 	if ((detected_list[current_station_data.PGA]?.intensity ?? -1) < intensitytest)
		// 		if (setting["Real-time.alert"] && alert_key_verify && storage.getItem("rts_alert")) {
		// 			detected_list[current_station_data.PGA] ??= {
		// 				intensity : intensitytest,
		// 				time      : NOW().getTime(),
		// 			};
		// 			new Notification(`🐈 測站反應，${station[uuid].area}`, {
		// 				body   : `${uuid}\nPGA: ${amount} gal 最大震度: ${IntensityI(intensitytest)}\n時間:${timeconvert(now).format("YYYY/MM/DD HH:mm:ss")}\n${station[uuid].Loc}`,
		// 				icon   : "../TREM.ico",
		// 				silent : win.isFocused(),
		// 			});
		// 			const _intensity = `${IntensityI(intensitytest)}級`;
		// 			Json_temp[uuid.split("-")[2]].alert = true;
		// 			Json_temp.Alert = true;

		// 			if (speecd_use) {
		// 				TREM.speech.speak({ text: `測站反應，${station[uuid].area}` });
		// 				TREM.speech.speak({ text: `最大震度，${_intensity.replace("-級", "弱").replace("+級", "強")}` });
		// 			}

		// 			if ((detected_list[current_station_data.PGA].intensity ?? 0) < intensitytest)
		// 				detected_list[current_station_data.PGA].intensity = intensitytest;

		// 			if (Json_temp.area.length) Json_temp.area.push(station[uuid].area);
		// 			else Json_temp.area = [station[uuid].area];

		// 			TREM.MapArea2.setArea(Json_temp);

		// 			setTimeout(() => {
		// 				ipcRenderer.send("screenshotEEW", {
		// 					Function : "station",
		// 					ID       : 1,
		// 					Version  : 1,
		// 					Time     : NOW().getTime(),
		// 					Shot     : 1,
		// 				});
		// 			}, 300);

		// 			if (setting["Real-time.show"]) win.showInactive();

		// 			if (setting["Real-time.cover"])
		// 				if (!win.isFullScreen()) {
		// 					win.setAlwaysOnTop(true);
		// 					win.focus();
		// 					win.setAlwaysOnTop(false);
		// 				}

		// 			if (current_data.a) level_list[uuid] = current_data.a;

		// 			if (current_data.pga) level_list[uuid] = current_data.pga;
		// 			target_count++;

		// 			if (replay == 0) {
		// 				TREM.MapIntensity.trem = true;
		// 				TREM.MapIntensity.MaxI = intensitytest;
		// 				Report = NOW().getTime();
		// 				Report_GET();
		// 			}
		// 		}

		// 	intensitytag = -1;
		// }

		if (MAXPGA.pga < amount && amount < 999 && Level != "NA") {
			MAXPGA.pga = amount;
			MAXPGA.station = keys[index];
			MAXPGA.level = Level;
			MAXPGA.lat = current_station_data.Lat;
			MAXPGA.long = current_station_data.Long;
			MAXPGA.loc = current_station_data.Loc;
			MAXPGA.intensity = intensity;
			MAXPGA.time = now;
		}
		// if (MaxIntensity1 > MAXPGA.intensity){
		// 	MAXPGA.pga = amount;
		// 	MAXPGA.station = keys[index];
		// 	MAXPGA.level = Level;
		// 	MAXPGA.lat = current_station_data.Lat;
		// 	MAXPGA.long = current_station_data.Long;
		// 	MAXPGA.loc = current_station_data.Loc;
		// 	MAXPGA.intensity = MaxIntensity1;
		// 	MAXPGA.time = new Date(Json_Time * 1000);
		// }
	}

	localStorage.stationtime = JSON.stringify(station_time_json);

	if (target_count != 0) {
		let level = 0;

		for (let i = 0; i < Object.keys(level_list).length; i++) {
			const uuid = Object.keys(level_list)[i];
			level += Math.round(level_list[uuid]);
		}

		$("#level").text(`level: ${level}`);
		$("#target").text(`target: ${target_count}`);

		// if (MaxIntensity2 > TREM.MapIntensity.MaxI)
		// 	if (setting["Real-time.alert"] && alert_key_verify && setting["Real-time.websocket"] === "yayacat")
		// 		if (replay == 0) {
		// 			TREM.MapIntensity.trem = true;
		// 			TREM.MapIntensity.MaxI = MaxIntensity2;

		// 			changeView("main", "#mainView_btn");

		// 			if (Report === 0) Report = NOW().getTime();
		// 			Report_GET();

		// 			if (setting["Real-time.show"]) win.showInactive();

		// 			if (setting["Real-time.cover"])
		// 				if (!win.isFullScreen()) {
		// 					win.setAlwaysOnTop(true);
		// 					win.focus();
		// 					win.setAlwaysOnTop(false);
		// 				}

		// 			if (!win.isFocused()) win.flashFrame(true);

		// 			setTimeout(() => {
		// 				ipcRenderer.send("screenshotEEW", {
		// 					Function : "station",
		// 					ID       : 1,
		// 					Version  : 1,
		// 					Time     : NOW().getTime(),
		// 					Shot     : 1,
		// 				});
		// 			}, 300);
		// 		}
	} else {
		MaxIntensity2 = -1;
		level_list = {};
		$("#level").text("");
		$("#target").text("");
	}

	if (MAXPGA.station != "NA") {
		document.getElementById("rt-station-max-intensity").className = `rt-station-intensity ${(MAXPGA.pga < 999) ? IntensityToClassString(MAXPGA.intensity) : "na"}`;
		document.getElementById("rt-station-max-id").innerText = MAXPGA.station;
		document.getElementById("rt-station-max-name").innerText = MAXPGA.loc;
		document.getElementById("rt-station-max-time").innerText = now_format(MAXPGA.time);
		document.getElementById("rt-station-max-pga").innerText = MAXPGA.pga;
	} else {
		document.getElementById("rt-station-max-intensity").className = "rt-station-intensity na";
		document.getElementById("rt-station-max-id").innerText = TREM.Localization.getString("Realtime_No_Data");
		document.getElementById("rt-station-max-name").innerText = TREM.Localization.getString("Realtime_No_Data");
		document.getElementById("rt-station-max-time").innerText = "--:--:--";
		document.getElementById("rt-station-max-pga").innerText = "--";
		document.getElementById("rt-station-local-intensity").className = "rt-station-intensity na";
		document.getElementById("rt-station-local-id").innerText = TREM.Localization.getString("Realtime_No_Data");
		document.getElementById("rt-station-local-name").innerText = TREM.Localization.getString("Realtime_No_Data");
		document.getElementById("rt-station-local-time").innerText = "--:--:--";
		document.getElementById("rt-station-local-pga").innerText = "--";
	}

	if (Object.keys(detected_box_list).length)
		for (let index = 0; index < Object.keys(detected_box_list).length; index++) {
			if (RMT == 0) Maps.main.removeLayer(detected_box_list[Object.keys(detected_box_list)[index]]);
			delete detected_box_list[Object.keys(detected_box_list)[index]];
			index--;
		}

	if (NOW().getTime() - RMTpgaTime > 30_000)
		RMT = 0;
	else
		RMT++;

	if (Object.keys(detected_list).length)
		for (let index = 0; index < Object.keys(detected_list).length; index++) {
			const Intensity = detected_list[Object.keys(detected_list)[index]].intensity;
			const time = detected_list[Object.keys(detected_list)[index]].time;

			if (RMTpgaTime == 0) {
				RMTpgaTime = NOW().getTime();
				console.debug("檢知框框開始時間:", RMTpgaTime);
			}

			if (time != 0 && NOW().getTime() - time > 30_000 || PGACancel) {
				delete detected_list[Object.keys(detected_list)[index]];
				index--;
			} else if (NOW().getTime() - RMTpgaTime > 30_000 || time === 0) {
				delete detected_list[Object.keys(detected_list)[index]];
				RMTpgaTime = 0;
				console.debug("檢知框框結束時間:", NOW().getTime());
				index--;
			} else {
				detected_box_list[Object.keys(detected_list)[index]] = L.polygon(TREM.Resources.area[Object.keys(detected_list)[index].toString()], {
					color     : TREM.color(Intensity),
					fillColor : "transparent",
				});
				let skip = false;

				if (Object.keys(eew).length != 0)
					for (let Index = 0; Index < Object.keys(eew).length; Index++) {
						let SKIP = 0;

						for (let i = 0; i < 4; i++) {
							const dis = Math.sqrt(Math.pow((TREM.Resources.area[Object.keys(detected_list)[index].toString()][i][0] - eew[Object.keys(eew)[Index]].lat) * 111, 2) + Math.pow((TREM.Resources.area[Object.keys(detected_list)[index].toString()][i][1] - eew[Object.keys(eew)[Index]].lon) * 101, 2));

							if (eew[Object.keys(eew)[Index]].km / 1000 > dis) SKIP++;
						}

						if (SKIP >= 4) {
							skip = true;
							break;
						}
					}

				if (skip) continue;

				if (RMT >= 2) Maps.main.addLayer(detected_box_list[Object.keys(detected_list)[index]]);
			}
		}

	if (!Object.keys(detected_list).length) PGACancel = false;

	if (RMT >= 2) RMT = 0;

	const All = (Json.Alert && Json.I && Json.I.length) ? Json.I : [];
	const list = [];

	if (!All.length) {
		PGAtag = -1;
		PGALimit = 0;
		IMAXdata = {};
	} else {
		for (let index = 0; index < All.length; index++) {
			if (station[All[index].uuid] == undefined) continue;
			All[index].loc = station[All[index].uuid].Loc;
		}

		if (All[0].intensity > PGAtag) {
			if (setting["audio.realtime"])
				if (All[0].intensity >= 5 && PGAtag < 5) {
					log("Playing Audio > int2", 1, "Audio", "handler");
					dump({ level: 0, message: "Playing Audio > int2", origin: "Audio" });
					TREM.Audios.int2.play();
				} else if (All[0].intensity >= 2 && PGAtag < 2) {
					log("Playing Audio > int1", 1, "Audio", "handler");
					dump({ level: 0, message: "Playing Audio > int1", origin: "Audio" });
					TREM.Audios.int1.play();
				} else if (PGAtag == -1) {
					log("Playing Audio > int0", 1, "Audio", "handler");
					dump({ level: 0, message: "Playing Audio > int0", origin: "Audio" });
					TREM.Audios.int0.play();
				}

			setTimeout(() => {
				ipcRenderer.send("screenshotEEW", {
					Function : "station",
					ID       : 1,
					Version  : 1,
					Time     : NOW().getTime(),
					Shot     : 1,
				});
			}, 1250);
			changeView("main", "#mainView_btn");

			if (setting["Real-time.show"]) win.showInactive();

			if (setting["Real-time.cover"])
				if (!win.isFullScreen()) {
					win.setAlwaysOnTop(true);
					win.focus();
					win.setAlwaysOnTop(false);
				}

			if (!win.isFocused()) win.flashFrame(true);
			PGAtag = All[0].intensity;
		}

		let count = 0;

		if (All.length <= 8) {
			for (let Index = 0; Index < All.length; Index++, count++) {
				if (All[Index].loc == undefined) continue;

				if (count >= 8) break;

				const id = All[Index].uuid.split("-")[2];

				if (!IMAXdata[id]) IMAXdata[id] = {};

				const Json_station_v = Json.station ? Json.station[id].v : Json[id].v;

				if (!IMAXdata[id].pga) IMAXdata[id].pga = Json_station_v;
				else if (IMAXdata[id].pga < Json_station_v) IMAXdata[id].pga = Json_station_v;
				const container = document.createElement("DIV");
				container.className = IntensityToClassString(All[Index].intensity);
				const location = document.createElement("span");
				location.innerText = `${All[Index].loc}\n${IMAXdata[id].pga} gal`;
				container.appendChild(document.createElement("span"));
				container.appendChild(location);
				list.push(container);
			}
		} else {
			const Idata = {};

			for (let Index = 0; Index < All.length; Index++, count++) {
				if (All[Index].loc == undefined) continue;

				if (Object.keys(Idata).length >= 8) break;
				const city = All[Index].loc.split(" ")[0];
				const id = All[Index].uuid.split("-")[2];
				const CPGA = (Idata[city] == undefined) ? 0 : Idata[city];
				const Json_station_v = Json.station ? Json.station[id].v : Json[id].v;

				if (Json_station_v > CPGA) {
					if (Idata[city] == undefined) Idata[city] = {};

					if (!IMAXdata[city]) IMAXdata[city] = {};

					if (!IMAXdata[city].pga) IMAXdata[city].pga = Json_station_v;
					else if (IMAXdata[city].pga < Json_station_v) IMAXdata[city].pga = Json_station_v;
					Idata[city].intensity = All[Index].intensity;
				}
			}

			for (let index = 0; index < Object.keys(Idata).length; index++) {
				const container = document.createElement("DIV");
				container.className = IntensityToClassString(Idata[Object.keys(Idata)[index]].intensity);
				const location = document.createElement("span");
				location.innerText = `${Object.keys(Idata)[index]}\n${IMAXdata[Object.keys(Idata)[index]].pga} gal`;
				container.appendChild(document.createElement("span"));
				container.appendChild(location);
				list.push(container);
			}
		}
	}

	// document.getElementById("rt-maxintensity").className = MaxPGA < 999 ? IntensityToClassString(MaxIntensity1) : "na";
	document.getElementById("rt-list").replaceChildren(...list);
}

async function fetchFiles() {
	try {
		Location = require(path.resolve(__dirname, "../Resources/locations.json"));
		log("Get Location File", 1, "Location", "fetchFiles");
		dump({ level: 0, message: "Get Location File", origin: "Location" });

		if (setting["Real-time.local"]) {
			station_data = require(path.resolve(__dirname, "../station.json"));

			if (Object.keys(station_data).length !== 0) {
				station_v2_run(station_data);
			} else {
				station_data = await (await fetch(route.tremStation(1))).json();

				if (Object.keys(station_data).length !== 0)
					station_v2_run(station_data);
			}

			log("Get Local Station File", 1, "Location", "fetchFiles");
			dump({ level: 0, message: "Get Local Station File", origin: "Location" });
		} else {
			station_data = await (await fetch(route.tremStation(1))).json();

			if (Object.keys(station_data).length !== 0)
				station_v2_run(station_data);
			log("Get Station File", 1, "Location", "fetchFiles");
			dump({ level: 0, message: "Get Station File", origin: "Location" });
		}

		if (Object.keys(station_data).length !== 0)
			PGAMain();
		else
			await fetchFilesbackup();
	} catch (err) {
		log(err, 3, "Location", "fetchFiles");
		dump({ level: 2, message: err, origin: "Location" });
		route.auto_api_run();
		await fetchFilesbackup();
	}
}

async function fetchFilesbackup() {
	try {
		Location = require(path.resolve(__dirname, "../Resources/locations.json"));
		log("Get Location backup File", 1, "Location", "fetchFilesbackup");
		dump({ level: 0, message: "Get Location backup File", origin: "Location" });

		if (setting["Real-time.local"]) {
			station_data = require(path.resolve(__dirname, "../station.json"));

			if (Object.keys(station_data).length !== 0) {
				station_v2_run(station_data);
			} else {
				station_data = await (await fetch(route.tremStation(1))).json();

				if (Object.keys(station_data).length !== 0)
					station_v2_run(station_data);
			}

			log("Get Local Station File", 1, "Location", "fetchFiles");
			dump({ level: 0, message: "Get Local Station File", origin: "Location" });
		} else {
			station_data = await (await fetch(route.tremStation(1))).json();

			if (Object.keys(station_data).length !== 0)
				station_v2_run(station_data);
			log("Get Station backup File", 1, "Location", "fetchFilesbackup");
			dump({ level: 0, message: "Get Station backup File", origin: "Location" });
		}

		if (Object.keys(station_data).length !== 0)
			PGAMain();
		else
			await fetchFilesbackup0();
	} catch (err) {
		log(err, 3, "Location", "fetchFilesbackup");
		dump({ level: 2, message: err, origin: "Location" });
		route.auto_api_run();
		await fetchFilesbackup0();
	}
}

async function fetchFilesbackup0() {
	try {
		Location = require(path.resolve(__dirname, "../Resources/locations.json"));
		log("Get Location backup File", 1, "Location", "fetchFilesbackup");
		dump({ level: 0, message: "Get Location backup File", origin: "Location" });

		if (setting["Real-time.local"]) {
			station_data = require(path.resolve(__dirname, "../station.json"));

			if (Object.keys(station_data).length !== 0) {
				station_v2_run(station_data);
			} else {
				station_data = await (await fetch(route.tremStation(1))).json();

				if (Object.keys(station_data).length !== 0)
					station_v2_run(station_data);
			}

			log("Get Local Station File", 1, "Location", "fetchFiles");
			dump({ level: 0, message: "Get Local Station File", origin: "Location" });
		} else {
			station_data = await (await fetch(route.tremStation(1))).json();

			if (Object.keys(station_data).length !== 0)
				station_v2_run(station_data);
			log("Get Station backup File", 1, "Location", "fetchFilesbackup");
			dump({ level: 0, message: "Get Station backup File", origin: "Location" });
		}

		if (Object.keys(station_data).length !== 0)
			PGAMain();
		else
			await fetchFiles();
	} catch (err) {
		log(err, 3, "Location", "fetchFilesbackup");
		dump({ level: 2, message: err, origin: "Location" });
		route.auto_api_run();
		await fetchFiles();
	}
}

function station_v2_run(station_temp) {
	for (let k = 0, k_ks = Object.keys(station_temp), n = k_ks.length; k < n; k++) {
		const station_id = k_ks[k];
		const station_ = station_temp[station_id];

		//	if (!station_.work) continue;

		const station_net = station_.net === "MS-Net" ? "H" : "L";
		const work = station_.work;

		let station_new_id = "";
		let station_code = "000";
		let Loc = "";
		let area = "";
		let Lat = 0;
		let Long = 0;

		let latest = station_.info[0];

		if (station_.info.length > 1)
			for (let i = 1; i < station_.info.length; i++) {
				const currentTime = new Date(station_.info[i].time);
				const latestTime = new Date(latest.time);

				if (currentTime > latestTime)
					latest = station_.info[i];
			}

		for (let i = 0, ks = Object.keys(TREM.Resources.regionv2), j = ks.length; i < j; i++) {
			const reg_id = ks[i];
			const reg = TREM.Resources.regionv2[reg_id];

			for (let r = 0, r_ks = Object.keys(reg), l = r_ks.length; r < l; r++) {
				const ion_id = r_ks[r];
				const ion = reg[ion_id];

				if (ion.code === latest.code) {
					station_code = latest.code.toString();
					Loc = `${reg_id} ${ion_id}`;
					area = ion.area;
					Lat = latest.lat;
					Long = latest.lon;
				}
			}
		}

		station_new_id = `${station_net}-${station_code}-${station_id}`;

		if (station_code === "000") {
			Lat = latest.lat;
			Long = latest.lon;

			if (station_id === "13379360") {
				Loc = "重庆市 北碚区";
				area = "重庆市中部";
			} else if (station_id === "7735548") {
				Loc = "南楊州市 和道邑";
				area = "南楊州市中部";
			}
		}

		station[station_new_id] = { Lat, Long, Loc, area, work };
	}
}

// #region 用戶所在位置
/**
 * 設定用戶所在位置
 * @param {string} town 鄉鎮
 */
function setUserLocationMarker(town) {
	if (!Location)
		try {
			Location = require(path.resolve(__dirname, "../Resources/locations.json"));
			log("Get Location File 0", 1, "Location", "setUserLocationMarker");
			dump({ level: 0, message: "Get Location File 0", origin: "Location" });
		} catch (err) {
			console.log(err);
			log(err, 3, "Location", "setUserLocationMarker");
			dump({ level: 2, message: err, origin: "Location" });
		}

	if (setting["location.lat"] != "" && setting["location.lon"] != "")
		[
			, UserLocationLat,
			UserLocationLon,
		] = [
			null,
			setting["location.lat"],
			setting["location.lon"],
		];
	else
		[
			, UserLocationLat,
			UserLocationLon,
		] = Location[setting["location.city"]][town];

	if (!marker)
		marker = L.marker([UserLocationLat, UserLocationLon], {
			icon     : L.divIcon({ html: "<img id=\"here-marker\" src=\"../image/here.png\" height=\"20\" width=\"20\" style=\"z-index: 5000;\"></img>" }),
			keyboard : false,
		}).addTo(Maps.main);
	else marker.setLatLng([UserLocationLat, UserLocationLon]);

	if (!marker_report)
		marker_report = L.marker([UserLocationLat, UserLocationLon], {
			icon     : L.divIcon({ html: "<img id=\"here-marker\" src=\"../image/here.png\" height=\"20\" width=\"20\" style=\"z-index: 5000;\"></img>" }),
			keyboard : false,
		}).addTo(Maps.report);
	else marker_report.setLatLng([UserLocationLat, UserLocationLon]);

	log(`User location set to ${setting["location.city"]} ${town} (${UserLocationLat}, ${UserLocationLon})`, 1, "Location", "setUserLocationMarker");
	dump({ level: 0, message: `User location set to ${setting["location.city"]} ${town} (${UserLocationLat}, ${UserLocationLon})`, origin: "Location" });

	// Maps.main.fitBounds([[25.35, 119.65], [21.85, 124.05]]);
	Maps.main.setView([23.608428, 120.799168], 7.75);
}
// #endregion

// #region 聚焦
TREM.Earthquake.on("focus", ({ center, zoom } = {}) => {
	if (center) {
		let X = 0;

		if (zoom >= 6) X = 2.5;

		if (zoom >= 6.5) X = 1.6;

		if (zoom >= 7) X = 1.5;

		if (zoom >= 7.5) X = 0.9;

		if (zoom >= 8) X = 0.6;

		if (zoom >= 8.5) X = 0.4;

		if (zoom >= 9) X = 0.35;

		if (zoom >= 9.5) X = 0.2;

		Focus[0] = center[0];
		Focus[1] = center[1] + X;
		Focus[2] = zoom;

		if (Maps.main.getBounds().getCenter().lat.toFixed(2) != center[0].toFixed(2) || Maps.main.getBounds().getCenter().lng.toFixed(2) != (center[1] + X).toFixed(2) || zoom != Maps.main.getZoom())
			Maps.main.setView([center[0], center[1]], zoom);
	} else if (Focus.length != 0) {
		if (Maps.main.getBounds().getCenter().lat.toFixed(2) != Focus[0].toFixed(2) || Maps.main.getBounds().getCenter().lng.toFixed(2) != Focus[1].toFixed(2) || Focus[2] != Maps.main.getZoom())
			Maps.main.setView([Focus[0], Focus[1]], Focus[2]);
	}
});

function Mapsmainfocus() {
	TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], zoom: 7.75 });
}

// #endregion

// #region 音頻播放
let AudioT;
let AudioT1;
const audioDOM = new Audio();
const audioDOM1 = new Audio();
audioDOM.addEventListener("ended", () => {
	audio.main_lock = false;
});
audioDOM1.addEventListener("ended", () => {
	audio.minor_lock = false;
});

function audioPlay(src) {
	audio.main.push(src);

	if (!AudioT)
		AudioT = setInterval(() => {
			if (!audio.main_lock) {
				audio.main_lock = true;

				if (audio.main.length) {
					playNextAudio();
				} else {
					clearInterval(AudioT);
					audio.main_lock = false;
					AudioT = null;
				}
			}
		}, 0);
}

function audioPlay1(src) {
	audio.minor.push(src);

	if (!AudioT1)
		AudioT1 = setInterval(() => {
			if (!audio.minor_lock) {
				audio.minor_lock = true;

				if (audio.minor.length) {
					playNextAudio1();
				} else {
					clearInterval(AudioT1);
					audio.minor_lock = false;
					AudioT1 = null;
				}
			}
		}, 0);
}

function playNextAudio() {
	audio.main_lock = true;
	const nextAudioPath = audio.main.shift();
	audioDOM.src = nextAudioPath;

	if (nextAudioPath.startsWith("../audio/1/") && setting["audio.eew"]) {
		log(`Playing Audio > ${nextAudioPath}`, 1, "Audio", "playNextAudio");
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM.play();
	} else if (!nextAudioPath.startsWith("../audio/1/")) {
		log(`Playing Audio > ${nextAudioPath}`, 1, "Audio", "playNextAudio");
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM.play();
	}
}

function playNextAudio1() {
	audio.minor_lock = true;
	const nextAudioPath = audio.minor.shift();
	audioDOM1.src = nextAudioPath;
	audioDOM1.playbackRate = 1.1;

	if (nextAudioPath.startsWith("../audio/1/") && setting["audio.eew"]) {
		log(`Playing Audio 1 > ${nextAudioPath}`, 1, "Audio", "playNextAudio1");
		dump({ level: 0, message: `Playing Audio 1 > ${nextAudioPath}`, origin: "Audio" });
		audioDOM1.play();
	} else if (!nextAudioPath.startsWith("../audio/1/")) {
		log(`Playing Audio 1 > ${nextAudioPath}`, 1, "Audio", "playNextAudio1");
		dump({ level: 0, message: `Playing Audio 1 > ${nextAudioPath}`, origin: "Audio" });
		audioDOM1.play();
	}
}
// #endregion

// #region Report Data
function ReportGET(badcatch = false) {
	try {
		if (!localStorage.fixReportGET_0) {
			localStorage.fixReportGET_0 = 1;
			storage.setItem("report_data", []);
		}

		const now_format = (time) => timeconvert(time).format("YYYY/MM/DD HH:mm:ss");

		let _report_data = [];
		_report_data = storage.getItem("report_data");

		if (typeof _report_data != "object") _report_data = [];

		if (_report_data == null) _report_data = [];

		// const list = {};
		let _report_data_temp = [];
		let j = 0;

		if (_report_data.length != 0 && !setting["report.getInfo"]) {
			for (let i = 0; i < _report_data.length; i++)
				if (_report_data[i].identifier) {
					if (_report_data[i].identifier.startsWith("CWB")) {
						_report_data_temp[j] = _report_data[i];
						j += 1;
					} else if (_report_data[i].identifier.startsWith("CWA")) {
						_report_data_temp[j] = _report_data[i];
						j += 1;
					}
				} else if (_report_data[i].id) {
					if (_report_data[i].id.match(/-/g).length === 3) {
						_report_data_temp[j] = _report_data[i];
						j += 1;
					}
				} else if (_report_data[i].identifier === "") {
					_report_data.splice(_i, 1);
				}

			_report_data = _report_data_temp;
		}

		// for (let i_ = 0; i_ < _report_data.length; i_++)
		// 	if (_report_data[i_])
		// 		if (_report_data[i_].id)
		// 			if (_report_data[i_].id.startsWith("CWB"))
		// 				_report_data.splice(i_, 1);

		// storage.setItem("report_data", _report_data);

		// if (_report_data.length != 0)
		// 	for (let i = 0; i < 50; i++) {
		// 		const md5 = crypto.createHash("md5");
		// 		list[_report_data[i].identifier] = md5.update(JSON.stringify(_report_data[i])).digest("hex");
		// 	}

		// let bodyInfo;

		// if (setting["report.getInfo"])
		// 	bodyInfo = JSON.stringify({ list, key: setting["exptech.key"] != "" ? setting["exptech.key"] : "" });
		// else if (setting["exptech.key"] != "")
		// 	bodyInfo = JSON.stringify({ list, key: setting["exptech.key"] });
		// else
		// bodyInfo = JSON.stringify({ list });

		if (api_key_verify && setting["report.getInfo"] && !badcatch) {
			route.setkey(setting["exptech.key"]);
			const controller1 = new AbortController();
			setTimeout(() => {
				controller1.abort();
			}, 5_000);
			fetch(route.earthquakeReportList(setting["cache.report"]), { signal: controller1.signal })
				.then((ans0) => {
					if (ans0.ok) {
						console.debug(ans0);
						ans0.json().then((ans) => {
							console.debug(ans);

							if (ans.length != 0) {
								for (let i = 0; i < ans.length; i++) {
									let id = ans[i].id;

									if (id.startsWith("CWB")) {
										id = id.match(/CWB-EQ(.*)/)[1];
										ans[i].id = id;
									}

									ans[i].no = id.split("-")[0];
									ans[i].originTime = now_format(new Date(ans[i].time));

									for (let _i = 0; _i < _report_data.length; _i++)
										if (_report_data[_i]) {
											if (_report_data[_i].show) ans[i].show = _report_data[_i].show;

											if (_report_data[_i].id) {
												if (_report_data[_i].id.match(/CWA-EQ(.*)/) !== null) {
													if (_report_data[_i].id.match(/CWA-EQ(.*)/)[1] === id)
														_report_data.splice(_i, 1);
												} else if (_report_data[_i].id === id) {
													if (_report_data[_i].list) {
														ans[i].list = _report_data[_i].list;
														ans[i].Max_Level = _report_data[_i].Max_Level;
														ans[i].Max_Level_areaName = _report_data[_i].Max_Level_areaName;
														ans[i].Max_Level_stationName = _report_data[_i].Max_Level_stationName;
													}

													_report_data.splice(_i, 1);
												} else if (_report_data[_i + 1]) {
													if (_report_data[_i].id === _report_data[_i + 1].id)
														_report_data.splice(_i, 1);

												}

												if (_report_data && _report_data[_i] && !_report_data[_i].no && _report_data[_i].id !== undefined)
													_report_data[_i].no = _report_data[_i].id.split("-")[0];

											} else if (_report_data[_i].identifier) {
												if (_report_data[_i].identifier === id)
													_report_data.splice(_i, 1);
											}
										}
								}

								for (let i = 0; i < ans.length; i++)
									_report_data.unshift(ans[i]);

								for (let i = 0; i < ans.length - 1; i++)
									for (let _i = 0; _i < ans.length - 1; _i++) {
										const time_temp = _report_data[_i].originTime ? new Date(_report_data[_i].originTime).getTime() : _report_data[_i].time;
										const time_1_temp = _report_data[_i + 1].originTime ? new Date(_report_data[_i + 1].originTime).getTime() : _report_data[_i + 1].time;

										if (time_temp < time_1_temp) {
											const temp = _report_data[_i + 1];
											_report_data[_i + 1] = _report_data[_i];
											_report_data[_i] = temp;
										}
									}

								// if (!_report_data) return setTimeout(ReportGET, 10_000);

								const OriginTime = _report_data[0].originTime ? new Date(_report_data[0].originTime).getTime() : _report_data[0].time;

								if ((NOW().getTime() - OriginTime) > 0 && !_report_data[0].show) {
									if (replay != 0) return;
									TREM.set_report_overview = 1;
									TREM.Report.setView("eq-report-overview", _report_data[0]);
									changeView("report", "#reportView_btn");
									// ReportTag = NOW().getTime();
									// console.debug("ReportTag: ", ReportTag);
									_report_data[0].show = true;
								}

								storage.setItem("report_data", _report_data);
								// console.debug(_report_data);
							}

							log("Reports fetched (api key verify)", 1, "EQReportFetcher", "ReportGET");
							dump({ level: 0, message: "Reports fetched (api key verify)", origin: "EQReportFetcher" });
							cacheReport(_report_data);
						}).catch((err) => {
							log("Error fetching reports (api key verify) json", 3, "EQReportFetcher", "ReportGET");
							log(err, 3, "EQReportFetcher", "ReportGET");
							dump({ level: 2, message: "Error fetching reports (api key verify) json", origin: "EQReportFetcher" });
							dump({ level: 2, message: err, origin: "EQReportFetcher" });

							if (_report_data.length > setting["cache.report"]) {
								_report_data_temp = [];
								for (let i = 0; i < setting["cache.report"]; i++)
									_report_data_temp[i] = _report_data[i];
								TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
								ReportList(_report_data_temp);
							} else {
								TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
								ReportList(_report_data);
							}
						});
					} else {
						console.error(ans0);

						switch (ans0.status) {
							case 429: {
								log("Error fetching reports (fetch) 429", 3, "EQReportFetcher", "ReportGET");
								log(ans0, 3, "EQReportFetcher", "ReportGET");
								dump({ level: 2, message: "Error fetching reports (fetch) 429", origin: "EQReportFetcher" });
								dump({ level: 2, message: ans0, origin: "EQReportFetcher" });

								if (_report_data.length > setting["cache.report"]) {
									_report_data_temp = [];
									for (let i = 0; i < setting["cache.report"]; i++)
										_report_data_temp[i] = _report_data[i];
									TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data_temp);
								} else {
									TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data);
								}

								// return setTimeout(() => {
								// 	ReportGET();
								// }, 30_000);
								break;
							}

							case 404: {
								log("Error fetching reports (fetch) 404", 3, "EQReportFetcher", "ReportGET");
								log(ans0, 3, "EQReportFetcher", "ReportGET");
								dump({ level: 2, message: "Error fetching reports (fetch) 404", origin: "EQReportFetcher" });
								dump({ level: 2, message: ans0, origin: "EQReportFetcher" });

								if (_report_data.length > setting["cache.report"]) {
									_report_data_temp = [];
									for (let i = 0; i < setting["cache.report"]; i++)
										_report_data_temp[i] = _report_data[i];
									TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data_temp);
								} else {
									TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data);
								}

								// return setTimeout(() => {
								// 	ReportGET();
								// }, 30_000);
								break;
							}

							case 500: {
								log("Error fetching reports (fetch) 500", 3, "EQReportFetcher", "ReportGET");
								log(ans0, 3, "EQReportFetcher", "ReportGET");
								dump({ level: 2, message: "Error fetching reports (fetch) 500", origin: "EQReportFetcher" });
								dump({ level: 2, message: ans0, origin: "EQReportFetcher" });

								if (_report_data.length > setting["cache.report"]) {
									_report_data_temp = [];
									for (let i = 0; i < setting["cache.report"]; i++)
										_report_data_temp[i] = _report_data[i];
									TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data_temp);
								} else {
									TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data);
								}

								// return setTimeout(() => {
								// 	ReportGET();
								// }, 30_000);
								break;
							}

							default: break;
						}
					}
				}).catch((err) => {
					log("Error fetching reports (fetch)", 3, "EQReportFetcher", "ReportGET");
					log(err, 3, "EQReportFetcher", "ReportGET");
					dump({ level: 2, message: "Error fetching reports (fetch)", origin: "EQReportFetcher" });
					dump({ level: 2, message: err, origin: "EQReportFetcher" });

					setTimeout(() => {
						ReportGET(true);
					}, 30_000);
				});
		} else {
			const controller = new AbortController();
			setTimeout(() => {
				controller.abort();
			}, 5_000);
			fetch(route.earthquakeReportList(setting["cache.report"]), { signal: controller.signal })
				.then((ans0) => {
					if (ans0.ok) {
						console.debug(ans0);
						ans0.json().then((ans) => {
							console.debug(ans);

							if (ans.length != 0) {
								for (let i = 0; i < ans.length; i++) {
									let id = ans[i].id;

									if (id.startsWith("CWB")) {
										id = id.match(/CWB-EQ(.*)/)[1];
										ans[i].id = id;
									}

									ans[i].no = id.split("-")[0];
									ans[i].originTime = now_format(new Date(ans[i].time));

									for (let _i = 0; _i < _report_data.length; _i++)
										if (_report_data[_i]) {
											if (_report_data[_i].show) ans[i].show = _report_data[_i].show;

											if (_report_data[_i].id) {
												if (_report_data[_i].id.match(/CWA-EQ(.*)/) !== null) {
													if (_report_data[_i].id.match(/CWA-EQ(.*)/)[1] === id)
														_report_data.splice(_i, 1);
												} else if (_report_data[_i].id === id) {
													if (_report_data[_i].list) {
														ans[i].list = _report_data[_i].list;
														ans[i].Max_Level = _report_data[_i].Max_Level;
														ans[i].Max_Level_areaName = _report_data[_i].Max_Level_areaName;
														ans[i].Max_Level_stationName = _report_data[_i].Max_Level_stationName;
													}

													_report_data.splice(_i, 1);
												} else if (_report_data[_i + 1]) {
													if (_report_data[_i].id === _report_data[_i + 1].id)
														_report_data.splice(_i, 1);
												}

												if (_report_data && _report_data[_i] && !_report_data[_i].no && _report_data[_i].id !== undefined)
													_report_data[_i].no = _report_data[_i].id.split("-")[0];

											} else if (_report_data[_i].identifier) {
												if (_report_data[_i].identifier === id)
													_report_data.splice(_i, 1);
											}
										}
								}

								for (let i = 0; i < ans.length; i++)
									_report_data.unshift(ans[i]);

								for (let i = 0; i < ans.length - 1; i++)
									for (let _i = 0; _i < ans.length - 1; _i++) {
										const time_temp = _report_data[_i].originTime ? new Date(_report_data[_i].originTime).getTime() : _report_data[_i].time;
										const time_1_temp = _report_data[_i + 1].originTime ? new Date(_report_data[_i + 1].originTime).getTime() : _report_data[_i + 1].time;

										if (time_temp < time_1_temp) {
											const temp = _report_data[_i + 1];
											_report_data[_i + 1] = _report_data[_i];
											_report_data[_i] = temp;
										}
									}

								const OriginTime = _report_data[0].originTime ? new Date(_report_data[0].originTime).getTime() : _report_data[0].time;

								if ((NOW().getTime() - OriginTime) > 0 && !_report_data[0].show) {
									if (replay != 0) return;
									TREM.set_report_overview = 1;
									TREM.Report.setView("eq-report-overview", _report_data[0]);
									changeView("report", "#reportView_btn");
									// ReportTag = NOW().getTime();
									// console.debug("ReportTag: ", ReportTag);
									_report_data[0].show = true;
								}

								storage.setItem("report_data", _report_data);
							}

							const _report_data_POST_temp = [];
							let k = 0;

							for (let i = 0; i < _report_data.length; i++)
								if (_report_data[i].identifier) {
									if (_report_data[i].identifier.startsWith("CWB")) {
										_report_data_POST_temp[k] = _report_data[i];
										k += 1;
									} else if (_report_data[i].identifier.startsWith("CWA")) {
										_report_data_POST_temp[k] = _report_data[i];
										k += 1;
									}
								} else if (_report_data[i].id) {
									if (_report_data[i].id.match(/-/g).length === 3) {
										_report_data_POST_temp[k] = _report_data[i];
										k += 1;
									}
								}

							log("Reports fetched", 1, "EQReportFetcher", "ReportGET");
							dump({ level: 0, message: "Reports fetched", origin: "EQReportFetcher" });
							cacheReport(_report_data_POST_temp);
							// console.debug(_report_data.length);
							// console.debug(_report_data_POST_temp.length);

							// if (!api_key_verify && !setting["report.getInfo"]) {
							// 	const _report_data_POST_temp = [];
							// 	let k = 0;

							// 	for (let i = 0; i < _report_data.length; i++)
							// 		if (_report_data[i].identifier.startsWith("CWB")) {
							// 			_report_data_POST_temp[k] = _report_data[i];
							// 			k += 1;
							// 		} else if (_report_data[i].identifier.startsWith("CWA")) {
							// 			_report_data_POST_temp[k] = _report_data[i];
							// 			k += 1;
							// 		}

							// 	log("Reports fetched", 1, "EQReportFetcher", "ReportGET");
							// 	dump({ level: 0, message: "Reports fetched", origin: "EQReportFetcher" });
							// 	cacheReport(_report_data_POST_temp);
							// }
						}).catch((err) => {
							log("Error fetching reports (fetch) json", 3, "EQReportFetcher", "ReportGET");
							log(err, 3, "EQReportFetcher", "ReportGET");
							dump({ level: 2, message: "Error fetching reports (fetch) json", origin: "EQReportFetcher" });
							dump({ level: 2, message: err, origin: "EQReportFetcher" });

							if (_report_data.length > setting["cache.report"]) {
								_report_data_temp = [];
								for (let i = 0; i < setting["cache.report"]; i++)
									_report_data_temp[i] = _report_data[i];
								TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
								ReportList(_report_data_temp);
							} else {
								TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
								ReportList(_report_data);
							}
						});
					} else {
						console.error(ans0);

						switch (ans0.status) {
							case 429: {
								log("Error fetching reports (fetch) 429", 3, "EQReportFetcher", "ReportGET");
								log(ans0, 3, "EQReportFetcher", "ReportGET");
								dump({ level: 2, message: "Error fetching reports (fetch) 429", origin: "EQReportFetcher" });
								dump({ level: 2, message: ans0, origin: "EQReportFetcher" });

								if (_report_data.length > setting["cache.report"]) {
									_report_data_temp = [];
									for (let i = 0; i < setting["cache.report"]; i++)
										_report_data_temp[i] = _report_data[i];
									TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data_temp);
								} else {
									TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data);
								}

								break;
							}

							case 404: {
								log("Error fetching reports (fetch) 404", 3, "EQReportFetcher", "ReportGET");
								log(ans0, 3, "EQReportFetcher", "ReportGET");
								dump({ level: 2, message: "Error fetching reports (fetch) 404", origin: "EQReportFetcher" });
								dump({ level: 2, message: ans0, origin: "EQReportFetcher" });

								if (_report_data.length > setting["cache.report"]) {
									_report_data_temp = [];
									for (let i = 0; i < setting["cache.report"]; i++)
										_report_data_temp[i] = _report_data[i];
									TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data_temp);
								} else {
									TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data);
								}

								break;
							}

							case 500: {
								log("Error fetching reports (fetch) 500", 3, "EQReportFetcher", "ReportGET");
								log(ans0, 3, "EQReportFetcher", "ReportGET");
								dump({ level: 2, message: "Error fetching reports (fetch) 500", origin: "EQReportFetcher" });
								dump({ level: 2, message: ans0, origin: "EQReportFetcher" });

								if (_report_data.length > setting["cache.report"]) {
									_report_data_temp = [];
									for (let i = 0; i < setting["cache.report"]; i++)
										_report_data_temp[i] = _report_data[i];
									TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data_temp);
								} else {
									TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
									ReportList(_report_data);
								}

								break;
							}

							default: break;
						}
					}
				}).catch((err) => {
					log("Error fetching reports (fetch)", 3, "EQReportFetcher", "ReportGET");
					log(err, 3, "EQReportFetcher", "ReportGET");
					dump({ level: 2, message: "Error fetching reports (fetch)", origin: "EQReportFetcher" });
					dump({ level: 2, message: err, origin: "EQReportFetcher" });

					if (_report_data.length > setting["cache.report"]) {
						_report_data_temp = [];
						for (let i = 0; i < setting["cache.report"]; i++)
							_report_data_temp[i] = _report_data[i];
						TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
						ReportList(_report_data_temp);
					} else {
						TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
						ReportList(_report_data);
					}
				});
		}

		report_get_timestamp = Date.now();
	} catch (error) {
		log("Error fetching reports (try)", 3, "EQReportFetcher", "ReportGET");
		log(error, 3, "EQReportFetcher", "ReportGET");
		dump({ level: 2, message: "Error fetching reports (try)", origin: "EQReportFetcher" });
		dump({ level: 2, message: error, origin: "EQReportFetcher" });

		let _report_data = [];
		_report_data = storage.getItem("report_data");

		if (typeof _report_data != "object") _report_data = [];

		if (_report_data == null) _report_data = [];

		if (_report_data.length > setting["cache.report"]) {
			_report_data_temp = [];
			for (let i = 0; i < setting["cache.report"]; i++)
				_report_data_temp[i] = _report_data[i];
			TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));
			ReportList(_report_data_temp);
		} else {
			TREM.Report.cache = new Map(_report_data.map(v => [(v.identifier ?? v.id), v]));
			ReportList(_report_data);
		}

		return setTimeout(() => {
			ReportGET();
		}, 60_000);
	}
}

ipcRenderer.on("ReportGET", () => {
	Report_GET();
});

function Report_GET() {
	let _report_data_GET = [];
	const _report_data_GET_temp = [];
	let j = 0;
	// let getInfo = false;
	_report_data_GET = storage.getItem("report_data");

	if (typeof _report_data_GET != "object") _report_data_GET = [];

	if (_report_data_GET.length != 0 && !setting["report.getInfo"]) {
		for (let i = 0; i < _report_data_GET.length; i++)
			if (_report_data_GET[i].identifier) {
				if (_report_data_GET[i].identifier.startsWith("CWB") || _report_data_GET[i].identifier.startsWith("CWA")) {
					_report_data_GET_temp[j] = _report_data_GET[i];
					j += 1;
				}
			} else if (_report_data_GET[i].id) {
				if (_report_data_GET[i].id.match(/-/g).length === 3) {
					_report_data_GET_temp[j] = _report_data_GET[i];
					j += 1;
				}
			}

		cacheReport(_report_data_GET_temp);
	} else if (_report_data_GET.length != 0 && setting["report.getInfo"]) {
		if (api_key_verify) {
			// for (let i = 0; i < _report_data_GET.length; i++)
			// 	if (_report_data_GET[i].location.startsWith("地震資訊"))
			// 		getInfo = true;

			// if (!getInfo) ReportGET();
			// else if (getInfo) cacheReport(_report_data_GET);
			cacheReport(_report_data_GET);
		} else {
			for (let i = 0; i < _report_data_GET.length; i++)
				if (_report_data_GET[i].identifier) {
					if (_report_data_GET[i].identifier.startsWith("CWB") || _report_data_GET[i].identifier.startsWith("CWA")) {
						_report_data_GET_temp[j] = _report_data_GET[i];
						j += 1;
					}
				} else if (_report_data_GET[i].id) {
					if (_report_data_GET[i].id.match(/-/g).length === 3) {
						_report_data_GET_temp[j] = _report_data_GET[i];
						j += 1;
					}
				}

			// if (setting["exptech.key"] != "") ReportGET();
			// else cacheReport(_report_data_GET_temp);
			cacheReport(_report_data_GET_temp);
		}
	}
}

ipcRenderer.on("ReportTREM", () => {
	TREM.Report.report_trem = setting["report.trem"];

	if (TREM.Report.view == "report-overview" || TREM.Report.view == "eq-report-overview")
		if (TREM.Report.report_trem && TREM.Report._markersGroup) {
			TREM.Report._setuptremget(TREM.Report._report_Temp);
		} else if (!TREM.Report.report_trem && TREM.Report._markersGroup) {
			TREM.Report._markersGroup.removeFrom(Maps.report);

			let Station_i0 = 0;

			if (TREM.Report._markers.length) {
				for (const marker1 of TREM.Report._markers)
					marker1.remove();
				TREM.Report._markers = [];
			}

			TREM.Report.epicenterIcon.addTo(Maps.report);
			TREM.Report._markers.push(TREM.Report.epicenterIcon);

			for (let index = 0, keys = Object.keys(TREM.Report.report_station), n = keys.length; index < n; index++) {
				TREM.Report._markers.push(TREM.Report.report_station[Station_i0]);
				Station_i0 += 1;
			}

			TREM.Report._markersGroup = L.featureGroup(TREM.Report._markers).addTo(Maps.report);
			TREM.Report._setupzoomPredict();
		}
});

function cacheReport(_report_data_GET) {
	const now_format = (time) => timeconvert(time).format("YYYY/MM/DD HH:mm:ss");

	if (_report_data_GET.length > setting["cache.report"]) {
		const _report_data_temp = [];

		for (let i = 0; i < setting["cache.report"]; i++)
			_report_data_temp[i] = _report_data_GET[i];

		TREM.Report.cache = new Map(_report_data_temp.map(v => [(v.identifier ?? v.id), v]));

		if (Report != 0)
			ReportList(_report_data_temp, {
				Max  : TREM.MapIntensity.MaxI,
				Time : now_format(new Date(Report)),
			});
		else
			ReportList(_report_data_temp);
	} else {
		TREM.Report.cache = new Map(_report_data_GET.map(v => [(v.identifier ?? v.id), v]));

		if (Report != 0)
			ReportList(_report_data_GET, {
				Max  : TREM.MapIntensity.MaxI,
				Time : now_format(new Date(Report)),
			});
		else
			ReportList(_report_data_GET);
	}
}
// #endregion

// #region Report 點擊
// eslint-disable-next-line no-shadow
const openURL = url => {
	ipcRenderer.send("openURL", url);
};
// #endregion

// #region Report list
function ReportList(earthquakeReportArr, palert) {
	roll.replaceChildren();

	if (palert != undefined) {
		const palertReportArr = { Max: palert.Max, Time: palert.Time, data: [], location: "", ID: [], earthquakeNo: 0, originTime: palert.Time };
		addReport(palertReportArr, false, 0, true);
	}

	for (let index = 0; index < earthquakeReportArr.length; index++)
		addReport(earthquakeReportArr[index], false, index + 1);

	setLocale(setting["general.locale"]);
}

function addReport(report, prepend = false, index = 0, palert = false) {
	const OriginTime = report.originTime ? new Date(report.originTime).getTime() : report.time;

	if (replay != 0 && OriginTime > new Date(replay + (NOW().getTime() - replayT)).getTime()) return;

	const Level = report.int ? IntensityI(report.int) : IntensityI(report.data[0]?.areaIntensity);
	// if (setting["exptech.key"] == "" && Level == "?") return;
	let msg = "";
	let star = "";

	if (!palert) {
		if (report.location)
			if (report.location.includes("("))
				msg = report.location.substring(report.location.indexOf("(") + 1, report.location.indexOf(")")).replace("位於", "");
			else
				msg = report.location;
		else
			if (report.loc.includes("("))
				msg = report.loc.substring(report.loc.indexOf("(") + 1, report.loc.indexOf(")")).replace("位於", "");
			else
				msg = report.loc;

		if (report.ID) {
			if (report.ID.length != 0) star += "↺ ";
		} else if (report.trem) {
			if (report.trem != 1000) star += "↺ ";
		}

		if (report.earthquakeNo) {
			if (report.earthquakeNo % 1000 != 0) star += "✩ ";
		} else if (report.no) {
			if (report.no % 1000 != 0) star += "✩ ";
		}
	}

	const Div = document.createElement("div");
	Div.className = "md3-ripple ";

	if (report.Time != undefined && report.Max != undefined) {
		const report_container = document.createElement("div");
		report_container.className = "report-container locating";
		const report_intensity_container = document.createElement("div");
		report_intensity_container.className = "report-intensity-container";

		const report_intensity_title_container = document.createElement("div");
		report_intensity_title_container.className = "report-intensity-title-container";

		const report_intensity_title_en = document.createElement("span");
		report_intensity_title_en.lang = "en";
		report_intensity_title_en.className = "report-intensity-title";
		report_intensity_title_en.innerText = "Max Int.";
		const report_intensity_title_ja = document.createElement("span");
		report_intensity_title_ja.lang = "ja";
		report_intensity_title_ja.className = "report-intensity-title";
		report_intensity_title_ja.innerText = "最大震度";
		const report_intensity_title_kr = document.createElement("span");
		report_intensity_title_kr.lang = "kr";
		report_intensity_title_kr.className = "report-intensity-title";
		report_intensity_title_kr.innerText = "최대진도";
		const report_intensity_title_ru = document.createElement("span");
		report_intensity_title_ru.lang = "ru";
		report_intensity_title_ru.className = "report-intensity-title";
		report_intensity_title_ru.innerText = "Макс интенси";
		report_intensity_title_ru.style = "font-size: 14px;line-height: 14px";
		const report_intensity_title_zh_tw = document.createElement("span");
		report_intensity_title_zh_tw.lang = "zh-TW";
		report_intensity_title_zh_tw.className = "report-intensity-title";
		report_intensity_title_zh_tw.innerText = "最大震度";
		const report_intensity_title_zh_cn = document.createElement("span");
		report_intensity_title_zh_cn.lang = "zh-CN";
		report_intensity_title_zh_cn.className = "report-intensity-title";
		report_intensity_title_zh_cn.innerText = "最大震度";

		report_intensity_title_container.append(report_intensity_title_en, report_intensity_title_ja, report_intensity_title_kr, report_intensity_title_ru, report_intensity_title_zh_tw, report_intensity_title_zh_cn);
		report_intensity_title_container.childNodes.forEach((node) => node.style.display = node.lang == setting["general.locale"] ? "unset" : "none");

		const report_intensity_value = document.createElement("span");
		report_intensity_value.className = "report-intensity-value";
		report_intensity_value.innerText = IntensityI(report.Max);
		report_intensity_container.append(report_intensity_title_container, report_intensity_value);

		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_PAlert = document.createElement("span");

		if (TREM.MapIntensity.trem) {
			report_PAlert.className = "report-PAlert";
			report_PAlert.innerText = "來源 TREM";
		} else {
			report_PAlert.className = "report-PAlert";
			report_PAlert.innerText = "來源 P-Alert";
		}

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = "震源 調查中";
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = report.Time.replace(/-/g, "/");
		report_detail_container.append(report_PAlert, report_location, report_time);

		report_container.append(report_intensity_container, report_detail_container);
		Div.prepend(report_container);
		Div.className += IntensityToClassString(report.Max);
		ripple(Div);
		roll.prepend(Div);
		investigation = true;
	} else {
		const timed = OriginTime - 5000;
		const timed_hold = String(timed);
		fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), timed_hold)}/${timed / 1000}.trem`, (err) => {
			if (!err) {
				report.download = true;
				TREM.Report.cache.set(report.identifier ?? report.id, report);
			} else {
				report.download = false;
				TREM.Report.cache.set(report.identifier ?? report.id, report);
			}
		});

		const report_container = document.createElement("div");
		report_container.className = "report-container";

		const report_intensity_container = document.createElement("div");
		report_intensity_container.className = "report-intensity-container";

		const report_intensity_title_container = document.createElement("div");
		report_intensity_title_container.className = "report-intensity-title-container";

		const report_intensity_title_en = document.createElement("span");
		report_intensity_title_en.lang = "en";
		report_intensity_title_en.className = "report-intensity-title";
		report_intensity_title_en.innerText = "Max Int.";
		const report_intensity_title_ja = document.createElement("span");
		report_intensity_title_ja.lang = "ja";
		report_intensity_title_ja.className = "report-intensity-title";
		report_intensity_title_ja.innerText = "最大震度";
		const report_intensity_title_kr = document.createElement("span");
		report_intensity_title_kr.lang = "kr";
		report_intensity_title_kr.className = "report-intensity-title";
		report_intensity_title_kr.innerText = "최대진도";
		const report_intensity_title_ru = document.createElement("span");
		report_intensity_title_ru.lang = "ru";
		report_intensity_title_ru.className = "report-intensity-title";
		report_intensity_title_ru.innerText = "Макс интенси";
		report_intensity_title_ru.style = "font-size: 14px;line-height: 14px";
		const report_intensity_title_zh_tw = document.createElement("span");
		report_intensity_title_zh_tw.lang = "zh-TW";
		report_intensity_title_zh_tw.className = "report-intensity-title";
		report_intensity_title_zh_tw.innerText = "最大震度";
		const report_intensity_title_zh_cn = document.createElement("span");
		report_intensity_title_zh_cn.lang = "zh-CN";
		report_intensity_title_zh_cn.className = "report-intensity-title";
		report_intensity_title_zh_cn.innerText = "最大震度";

		report_intensity_title_container.append(report_intensity_title_en, report_intensity_title_ja, report_intensity_title_kr, report_intensity_title_ru, report_intensity_title_zh_tw, report_intensity_title_zh_cn);
		report_intensity_title_container.childNodes.forEach((node) => node.style.display = node.lang == setting["general.locale"] ? "unset" : "none");

		const report_intensity_value = document.createElement("span");
		report_intensity_value.className = "report-intensity-value";
		report_intensity_value.innerText = Level;
		report_intensity_container.append(report_intensity_title_container, report_intensity_value);

		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = `${star}${msg}`;

		if (msg.length > 9 && index != 0) report_location.style = "font-size: 16px;";

		if (msg.length > 10 && index != 0) report_location.style = "font-size: 14px;";

		if (msg.length > 12 && index != 0) report_location.style = "font-size: 12px;";

		if (msg.length > 9 && index == 0) report_location.style = "font-size: 20px;";

		if (msg.length > 10 && index == 0) report_location.style = "font-size: 18px;";

		if (msg.length > 12 && index == 0) report_location.style = "font-size: 16px;";
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = timeconvert(new Date(OriginTime)).format("YYYY/MM/DD HH:mm:ss");
		const report_magnitude = document.createElement("span");
		report_magnitude.className = "report-magnitude";

		if (report.magnitudeValue) report_magnitude.innerText = report.magnitudeValue.toFixed(1);

		if (report.mag) report_magnitude.innerText = report.mag.toFixed(1);

		const report_depth = document.createElement("span");
		report_depth.className = "report-depth";
		report_depth.innerText = report.depth;
		report_detail_container.append(report_location, report_time, report_magnitude, report_depth);

		report_container.append(report_intensity_container, report_detail_container);
		ripple(Div);
		Div.append(report_container);
		Div.className += IntensityToClassString(report.int ? report.int : report.data[0]?.areaIntensity);
		Div.addEventListener("click", () => {
			if (replay != 0) return;
			TREM.set_report_overview = 1;
			TREM.Report.setView("eq-report-overview", report);
			changeView("report", "#reportView_btn");
			// ReportTag = NOW().getTime();
			// console.debug("ReportTag: ", ReportTag);
		});
		Div.addEventListener("contextmenu", () => {
			if (replay != 0) return;

			TREM.Report.replay(report.identifier ?? report.id);
		});

		if (prepend) {
			const locating = document.querySelector(".report-detail-container.locating");

			if (locating) {
				locating.replaceWith(Div.children[0]);
			} else {
				if (investigation) {
					investigation = false;
					roll.removeChild(roll.children[0]);
				}

				roll.prepend(Div);
			}

			if (Report != 0) {
				Report = 0;
				TREM.MapIntensity.MaxI = -1;
			}

			let _report_data = [];
			_report_data = storage.getItem("report_data");

			for (let _i = 0; _i < _report_data.length; _i++)
				if (_report_data[_i].id)
					if (_report_data[_i].id === report.id)
						_report_data.splice(_i, 1);

			_report_data.push(report);

			for (let i = 0; i < _report_data.length - 1; i++)
				for (let _i = 0; _i < _report_data.length - 1; _i++) {
					const time_temp = _report_data[_i].originTime ? new Date(_report_data[_i].originTime).getTime() : _report_data[_i].time;
					const time_1_temp = _report_data[_i + 1].originTime ? new Date(_report_data[_i + 1].originTime).getTime() : _report_data[_i + 1].time;

					if (time_temp < time_1_temp) {
						const temp = _report_data[_i + 1];
						_report_data[_i + 1] = _report_data[_i];
						_report_data[_i] = temp;
					}
				}

			storage.setItem("report_data", _report_data);

			TREM.Report.cache.set(report.identifier ?? report.id, report);
			TREM.Report.setView("eq-report-overview", report);
			changeView("report", "#reportView_btn");
		} else {
			roll.append(Div);
		}
	}
}

// #endregion

ipcRenderer.on("Olddatabase_report", (event, json) => {
	TREM.set_report_overview = 1;
	TREM.Report.setView("eq-report-overview", json);
	changeView("report", "#reportView_btn");
});

// #region 檔案
function openFileWindow() {
	ipcRenderer.send("openFileWindow");
	toggleNav(false);
}

ipcRenderer.on("readReplayFile", (event, filePaths) => {
	try {
		fs.readFile(filePaths[0], async (err, deta) => {
			if (err) throw err;
			await JSZip.loadAsync(deta).then(async (zip) => {
				const replayData = [];

				for (let i = 0, k = Object.keys(zip.files), n = k.length; i < n; i++) {
					const filename = k[i];
					const content = await zip.files[filename].async("string");
					const data = JSON.parse(content);
					data.rts.replay = true;
					data.eew.forEach((e) => (e.replay = true));
					data.time = +filename;
					replayData.push(data);
				}

				const replayLength = replayData.length;
				let replayPercentage = 0;
				console.log(`[Replay] Loaded ${replayLength} frames.`);

				let replay_time = NOW().getTime();

				const emitEvents = () => {
					const current = replayData.shift();

					replayTemp = current.rts.time;
					handler(current.rts);
					current.eew.forEach((e) => {
						if (e.serial == 1) replay_time = NOW().getTime() - 3000;

						e.replay_time = e.eq.time;
						e.replay_timestamp = replayTemp;
						e.time = replay_time;
						e.timestamp = NOW().getTime();
						e.Unit = (e.scale == 1) ? "PLUM(局部無阻尼運動傳播法)"
							: (e.author == "scdzj") ? "四川省地震局 (SCDZJ)"
								: (e.author == "nied") ? "防災科学技術研究所 (NIED)"
									: (e.author == "kma") ? "기상청(KMA)"
										: (e.author == "jma") ? "気象庁(JMA)"
											: (e.author == "cwa") ? "中央氣象署 (CWA)"
												: (e.author == "fjdzj") ? "福建省地震局 (FJDZJ)"
													: (e.author == "trem" && e.serial > 3) ? "TREM(實驗功能僅供參考)"
														: (e.author == "trem" && e.serial <= 3) ? "NSSPE(無震源參數推算)"
															: (e.Unit) ? e.Unit : "";
						FCMdata(e, "cache");
					});

					const newReplayPercentage = ~~(
						(1 - replayData.length / replayLength) * 10
					);

					if (newReplayPercentage > replayPercentage)
						console.log(`[Replay] ${`${newReplayPercentage * 10}`.padStart(3, " ")}% [${"#".repeat(newReplayPercentage).padEnd(10, ".")}] | Frame ${replayLength - replayData.length}`);

					replayPercentage = newReplayPercentage;

					Timers.replay = setTimeout(
						emitEvents,
						replayData[0] ? replayData[0].time - current.time : 1_000,
					);
				};

				replayD = false;
				replayF = true;
				replay = replayData[0].time;
				replayTemp = replay;
				replayT = NOW().getTime();
				ReportTag = 0;
				console.debug("ReportTag: ", ReportTag);
				Report_GET();
				stopReplaybtn();
				PGAMain();
				emitEvents();
			});
		});
	} catch (error) {
		console.error("[Replay] Exception thrown while loading replay.", error);
	}
});


// #region 設定
function openSettingWindow() {
	// document.getElementById("setting_btn").classList.add("hide");
	win.setAlwaysOnTop(false);
	ipcRenderer.send("openChildWindow");
	toggleNav(false);
}

// #region RTS
function openRTSWindow() {
	win.setAlwaysOnTop(false);
	ipcRenderer.send("openRTSWindow");
	toggleNav(false);
}

// #region RTS
function openIntensityWindow() {
	win.setAlwaysOnTop(false);
	ipcRenderer.send("openIntensityWindow");
	toggleNav(false);
}
// ipcRenderer.on("setting_btn_remove_hide", () => {
// 	document.getElementById("setting_btn").classList.remove("hide");
// });
// #endregion

// #region Number >> Intensity
function IntensityI(Intensity) {
	return Intensity == 5 ? "5-"
		: Intensity == 6 ? "5+"
			: Intensity == 7 ? "6-"
				: Intensity == 8 ? "6+"
					: Intensity == 9 ? "7"
						: Intensity ?? "--";
}
// #endregion

// #region Intensity >> Number
function IntensityN(level) {
	return level == "5-" ? 5
		: level == "5+" ? 6
			: level == "6-" ? 7
				: level == "6+" ? 8
					: level == "7" ? 9
						: Number(level);
}
// #endregion

// #region Intensity >> Class String
function IntensityToClassString(level) {
	let classname = (level == 9) ? "seven"
		: (level == 8) ? "six strong"
			: (level == 7) ? "six"
				: (level == 6) ? "five strong"
					: (level == 5) ? "five"
						: (level == 4) ? "four"
							: (level == 3) ? "three"
								: (level == 2) ? "two"
									: (level == 1) ? "one"
										: (level == "na") ? "na"
											: "zero";

	if (tinycolor(setting["theme.customColor"] ? setting[`theme.int.${level}`] : [
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
	][level]).getLuminance() > 0.575)
		classname += " darkText";

	return classname;
}
// #endregion

// #region color
TREM.color = function color(Intensity) {
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
// #endregion

let rts_clock = null;
let eew_clock = null;
let ntp_clock = null;

// #region IPC
ipcRenderer.on("start", () => {
	try {
		if (!(rts_key_verify ? storage.getItem("disclaimer_off") : false) && !rts_key_verify)
			getp2pTOS();
		else
			getp2pTOSrun();

		if (localStorage.rts_alert_false == undefined) {
			localStorage.rts_alert_false = true;
			ipcRenderer.send("config:value", "Real-time.alert", false);
		}

		if (localStorage.Real_time_local == undefined) {
			localStorage.Real_time_local = true;
			ipcRenderer.send("config:value", "Real-time.local", false);
		}

		setInterval(() => {
			if (DATAstamp != 0 && Stamp != DATAstamp) {
				Stamp = DATAstamp;
				FCMdata(DATA, ServerType);
			}
		}, 0);

		freertsget();
		fetch_eew();
		fetch_ntp();

		log(`Initializing ServerCore >> ${ServerVer}`, 1, "Initialization", "start");
		dump({ level: 0, message: `Initializing ServerCore >> ${ServerVer}`, origin: "Initialization" });
	} catch (error) {
		showDialog("error", "發生錯誤", `初始化過程中發生錯誤，您可以繼續使用此應用程式，但無法保證所有功能皆能繼續正常運作。\n\n如果這是您第一次看到這個訊息，請嘗試重新啟動應用程式。\n如果這個錯誤持續出現，請到 TREM Discord 伺服器回報問題。\n\n錯誤訊息：${error}`);
		$("#load").delay(1000).fadeOut(1000);
		log(error, 3, "Initialization", "start");
		dump({ level: 2, message: error, origin: "Initialization" });
	}
});

function getp2pTOSrun() {
	if (setting["p2p.mode"] && !p2p_mode_status) {
		p2p_mode_status = true;
		serverinit();
	}

	setTimeout(() => {
		getTOS();
	}, 1000);
}

function getp2pTOS() {
	showDialog(
		"warn",
		"免責聲明",
		`• TREMV VIP功能中的資訊屬於特定使用者使用，與最終非特定使用者中的資訊可能存有若干差異，請所有使用者理解並謹慎使用。\n
		• 強震即時警報是利用少數幾個地震測站快速演算之結果，與最終地震報告可能存有若干差異，請所有使用者理解並謹慎使用。\n
		• 本軟體使用P2P的連線技術傳遞資料，您的電腦將會把收到的地震資訊轉傳給其他人的電腦，如此才能降低伺服器負荷與維持費用，也才能免費地提供服務給大家使用。若您開始使用本軟體則代表您已同意使用P2P連線技術將收到的資料轉傳給其他電腦。\n
		• 任何資訊均以 中央氣象署(CWA) 發布之內容為準\n
		• Powered by ExpTech | 2024/05/24`,
		0,
		"warning",
		() => {
			getp2pTOSrun();
		},
		"我已詳細閱讀 並同意上述免責聲明",
		"",
		() => void 0,
		0,
		1);
}

function getTOS() {
	if (localStorage.TOS_v1_2 == undefined)
		showDialog(
			"warn",
			"TOS 服務條款 1.2",
			`• 使用本服務應視為用戶同意使用條款\n
			• TREMV 是一款提供 地震檢知、地震預警、海嘯警報、震度速報、地震報告 的軟體\n
			• 禁止在未經允許的情況下二次分發 TREMV 軟體內的任何資訊\n
			• 禁止轉售 TREMV 提供之資訊\n
			• 禁止違反法律法規或違反公共秩序和道德的行為\n
			• 除以上條款外 任何開發團隊合理認為不適當的行為均不被允許\n
			• TREMV 使用 P2P 技術傳遞資訊\n
			• 任何資訊均以 中央氣象署(CWA) 發布之內容為準\n
			• Powered by ExpTech | 2023/11/03`,
			0,
			"warning",
			() => {
				localStorage.TOS_v1_2 = true;
			},
			"我已詳細閱讀 並同意上述條款",
			"",
			() => void 0,
			0,
			1);
}

function freertsget(rts_key_verify_f = false) {
	if (!rts_key_verify || rts_key_verify_f) {
		if (rts_clock) {
			clearInterval(rts_clock);
			rts_clock = null;
		}

		rts_clock = setInterval(async () => {
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 1000);
				await fetch(route.rts(1, new Date().getTime(), rts_url), { signal: controller.signal })
					.then((ans0) => {
						if (ans0.ok) {
							ans0.json().then(ans => {
								rts_ws_timestamp = new Date().getTime();

								if ((rts_ws_timestamp - ans.time) >= 30000)
									if (rts_url == 0)
										rts_url = 1;
									 else
										rts_url = 0;

								ans.Time = rts_ws_timestamp;
								rts_response = ans;
								clearTimeout(timer);
							}).catch((err) => {
								if (rts_url == 0)
									rts_url = 1;
								 else
									rts_url = 0;
								log(err, 3, "server", "rts-clock");
								clearTimeout(timer);
							});
						} else {
							if (rts_url == 0)
								rts_url = 1;
							 else
								rts_url = 0;
							log(ans0.status, 3, "server", "rts-clock");
							clearTimeout(timer);
						}
					}).catch((err) => {
						if (rts_url == 0)
							rts_url = 1;
						 else
							rts_url = 0;
						log(err, 3, "server", "rts-clock");
						clearTimeout(timer);
					});
			} catch (err) {
				if (rts_url == 0)
					rts_url = 1;
				 else
					rts_url = 0;
				log(err, 3, "server", "rts-clock");
			}
		}, 1000);
	} else if (rts_key_verify && rts_clock) {
		clearInterval(rts_clock);
		rts_clock = null;
	}
}

function fetch_eew() {
	if (eew_clock) {
		clearInterval(eew_clock);
		eew_clock = null;
	}

	eew_clock = setInterval(async () => {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 1000);
			const lb_num = route.auto_run();
			await fetch(route.eew(1, rts_url), { signal: controller.signal })
				.then((ans) => {
					if (ans.ok) {
						ans.json().then((ans0) => {
							HTTP = true;

							if (ans0.length != 0)
								for (const e of ans0) {
									e.type = "eew";
									e.timestamp = Date.now();
									FCMdata(e, ServerType = "http");
								}

							clearTimeout(timer);
						});
					} else {
						HTTP = false;
						log(`lb-${lb_num} eq_eew`, 3, "server", "eew_clock");
						console.error(err);

						switch (ans.status) {
							case 429: {
								break;
							}

							case 404: {
								break;
							}

							case 500: {
								break;
							}

							default: {
								break;
							}
						}

						clearTimeout(timer);
					}
				})
				.catch((err) => {
					HTTP = false;
					log(`lb-${lb_num} eq_eew`, 3, "server", "eew_clock");
					log(err, 3, "server", "eew_clock");
					clearTimeout(timer);
				});
		} catch (err) {
			log(err, 3, "server", "eew_clock");
		}
	}, 1000);
}

function fetch_ntp() {
	if (!rts_key_verify) {
		if (ntp_clock) {
			clearInterval(ntp_clock);
			ntp_clock = null;
		}

		ntp_clock = setInterval(async () => {
			try {
				const controller = new AbortController();
				const timer = setTimeout(() => controller.abort(), 1000);
				const lb_num = route.auto_run();
				await fetch(route.ntp(), { signal: controller.signal })
					.then((ans) => {
						if (ans.ok) {
							ans.json().then((ans0) => {
								if (!replayTemp && !replay) {
									ServerT = Date.now();
									ServerTime = ans0;
								}

								clearTimeout(timer);
							});
						} else {
							HTTP = false;
							log(`lb-${lb_num} ntp`, 3, "server", "ntp_clock");
							console.error(err);

							switch (ans.status) {
								case 429: {
									break;
								}

								case 404: {
									break;
								}

								case 500: {
									break;
								}

								default: {
									break;
								}
							}

							clearTimeout(timer);
						}
					})
					.catch((err) => {
						HTTP = false;
						log(`lb-${lb_num} ntp`, 3, "server", "ntp_clock");
						log(err, 3, "server", "eew_clock");
						clearTimeout(timer);
					});
			} catch (err) {
				log(err, 3, "server", "eew_clock");
			}
		}, 1000);
	}
}

const stopReplay = function() {
	if (Object.keys(EarthquakeList).length != 0) Cancel = true;

	if (Object.keys(detected_list).length != 0) PGACancel = true;

	if (replay != 0 || Report != 0 || replayTemp != 0 || replayT != 0 || replaydir != 0 || replayD || replayF) {
		intensitytag = -1;
		replay = 0;
		Report = 0;
		TREM.MapIntensity.MaxI = -1;
		replayTemp = 0;
		replayT = 0;
		replaydir = 0;
		replayD = false;
		replayF = false;

		if (Timers.rts_clock) clearInterval(Timers.rts_clock);

		if (Timers.eew_clock) clearInterval(Timers.eew_clock);

		if (Timers.replay) clearInterval(Timers.replay);

		TREM.Report.replayHttp = false;
		PGAMain();
		Report_GET();
	}

	if (link_on) link_on = false;

	if (TREM.MapIntensity.isTriggered)
		TREM.MapIntensity.clear();

	if (TREM.MapArea2.isTriggered)
		TREM.MapArea2.clear();

	WarnAudio = Date.now() + 3000;

	stationnow = 0;
	stationnowall = 0;

	if (TREM.speech.speaking()) TREM.speech.cancel();

	Mapsmainfocus();
	testEEWerror = false;
	unstopReplaybtn();
	globalgc();
};

function unstopReplaybtn() {
	document.getElementById("togglenav_btn").classList.remove("hide");
	document.getElementById("stopReplay").classList.add("hide");
}

function stopReplaybtn() {
	changeView("main", "#mainView_btn");
	document.getElementById("togglenav_btn").classList.add("hide");
	document.getElementById("stopReplay").classList.remove("hide");
}

TREM.backindexButton = () => {
	TREM.set_report_overview = 0;
	ReportTag = 0;
	console.debug("ReportTag: ", ReportTag);
	changeView("main", "#mainView_btn");
};

ipcRenderer.on("testoldEEW", () => {
	const report_data = storage.getItem("report_data");
	TREM.Report.replayHttp = true;
	replay = new Date(report_data[0].originTime.replace(/-/g, "/")).getTime() - 5000;
	replayT = NOW().getTime();
	Report_GET();
	stopReplaybtn();
});

ipcRenderer.on("testoldtimeEEW", (event, oldtime) => {
	replay = oldtime - 5000;
	replayT = NOW().getTime();
	Report_GET();
	stopReplaybtn();
});

ipcRenderer.on("testoldtremEEW", (event, oldtrem) => {
	let list = [];
	list = list.concat(oldtrem);
	ipcRenderer.send("testEEW", list);
});

ipcRenderer.on("testoldtime", (event, oldtime) => {
	replayD = true;
	replay = oldtime - 5000;
	replayTemp = replay;
	replayT = NOW().getTime();
	replaydir = replay / 1000;
	ReportTag = 0;
	console.debug("ReportTag: ", ReportTag);
	Report_GET();
	stopReplaybtn();
	PGAMain();
});

ipcRenderer.on("testreplaytime", (event, oldtime) => {
	console.debug(oldtime);
	replayD = true;
	replay = oldtime;
	replayTemp = oldtime;
	replayT = NOW().getTime();
	replaydir = replay / 1000;
	ReportTag = 0;
	console.debug("ReportTag: ", ReportTag);
	Report_GET();
	stopReplaybtn();
	PGAMain();
});

ipcRenderer.on("sleep", (event, mode) => {
	if (mode)
		sleep(mode);
	else
		sleep(mode);
});

ipcRenderer.on("apikey", (event, data) => {
	apikey(false, data);
});

ipcRenderer.on("report-Notification", (event, report) => {
	if (setting["webhook.url"] != "" && setting["report.Notification"]) {
		console.debug(report);
		log("Posting Notification report Webhook", 1, "Webhook", "report-Notification");
		dump({ level: 0, message: "Posting Notification report Webhook", origin: "Webhook" });
		let msg = {};

		if (report.data) {
			msg = {
				username   : "TREMV | 臺灣即時地震監測變體",
				avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
				content    : setting["tts.Notification"] ? ("地震報告"
				+ ((report.data.length != 0) ? "發生規模" + report.magnitudeValue + "有感地震，最大震度" + report.data[0].areaName + report.data[0].eqStation[0].stationName + IntensityI(report.data[0].areaIntensity) + "級。" : "發生規模" + report.magnitudeValue + "有感地震 ")
				+ "編號"
				+ (report.location.startsWith("地震資訊") ? "無（地震資訊）" : report.earthquakeNo % 1000 ? report.earthquakeNo : "無（小區域有感地震）")
				+ "時間"
				+ report.originTime
				+ "深度"
				+ report.depth + " 公里"
				+ "震央位置"
				+ "經度 東經 " + report.epicenterLon + "緯度 北緯 " + report.epicenterLat + "即在" + report.location
				+ ((report.data.length != 0) ? "最大震度" + IntensityI(report.data[0].areaIntensity) + "級地區" : "")
				+ ((report.data.length != 0) ? report.data[0].areaName : "")) : "地震報告",
				tts    : setting["tts.Notification"],
				embeds : [
					{
						author: {
							name     : "地震報告",
							url      : undefined,
							icon_url : undefined,
						},
						description : (report.data.length != 0) ? "發生規模" + report.magnitudeValue + "有感地震，最大震度" + report.data[0].areaName + report.data[0].eqStation[0].stationName + IntensityI(report.data[0].areaIntensity) + "級。" : "發生規模" + report.magnitudeValue + "有感地震",
						fields      : [
							{
								name   : "編號",
								value  : report.location.startsWith("地震資訊") ? "無（地震資訊）" : report.earthquakeNo % 1000 ? report.earthquakeNo : "無（小區域有感地震）",
								inline : true,
							},
							{
								name   : "時間",
								value  : report.originTime,
								inline : true,
							},
							{
								name   : "深度",
								value  : report.depth + " 公里",
								inline : true,
							},
							{
								name   : "震央位置",
								value  : "> 經度 **東經 " + report.epicenterLon + "**\n> 緯度 **北緯 " + report.epicenterLat + "**\n> 即在 **" + report.location + "**",
								inline : false,
							},
							{
								name   : (report.data.length != 0) ? "最大震度" + IntensityI(report.data[0].areaIntensity) + "級地區" : "",
								value  : (report.data.length != 0) ? report.data[0].areaName : "",
								inline : false,
							},
							{
								name   : "地圖",
								value  : "https://www.google.com/maps/search/?api=1&query=" + report.epicenterLat + "," + report.epicenterLon,
								inline : true,
							},
						],
						color: report.location.startsWith("地震資訊") ? 9807270 : report.earthquakeNo % 1000 ? 15158332 : 3066993,
					},
				],
			};
		} else if (report.list) {
			const report_list_length = Object.keys(report.list).length;
			msg = {
				username   : "TREMV | 臺灣即時地震監測變體",
				avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
				content    : setting["tts.Notification"] ? ("地震報告"
				+ ((report_list_length != 0) ? "發生規模" + report.mag + "有感地震，最大震度" + report.Max_Level_areaName + report.Max_Level_stationName + IntensityI(report.Max_Level) + "級。" : "發生規模" + report.mag + "有感地震 ")
				+ "編號"
				+ (report.loc.startsWith("地震資訊") ? "無（地震資訊）" : report.no % 1000 ? report.no : "無（小區域有感地震）")
				+ "時間"
				+ timeconvert(new Date(report.time)).format("YYYY/MM/DD HH:mm:ss")
				+ "深度"
				+ report.depth + " 公里"
				+ "震央位置"
				+ "經度 東經 " + report.lon + "緯度 北緯 " + report.lat + "即在" + report.loc
				+ ((report_list_length != 0) ? "最大震度" + IntensityI(report.Max_Level) + "級地區" : "")
				+ ((report_list_length != 0) ? report.Max_Level_areaName : "")) : "地震報告",
				tts    : setting["tts.Notification"],
				embeds : [
					{
						author: {
							name     : "地震報告",
							url      : undefined,
							icon_url : undefined,
						},
						description : (report_list_length != 0) ? "發生規模" + report.mag + "有感地震，最大震度" + report.Max_Level_areaName + report.Max_Level_stationName + IntensityI(report.Max_Level) + "級。" : "發生規模" + report.mag + "有感地震",
						fields      : [
							{
								name   : "編號",
								value  : report.loc.startsWith("地震資訊") ? "無（地震資訊）" : report.no % 1000 ? report.no : "無（小區域有感地震）",
								inline : true,
							},
							{
								name   : "時間",
								value  : timeconvert(new Date(report.time)).format("YYYY/MM/DD HH:mm:ss"),
								inline : true,
							},
							{
								name   : "深度",
								value  : report.depth + " 公里",
								inline : true,
							},
							{
								name   : "震央位置",
								value  : "> 經度 **東經 " + report.lon + "**\n> 緯度 **北緯 " + report.lat + "**\n> 即在 **" + report.loc + "**",
								inline : false,
							},
							{
								name   : (report_list_length != 0) ? "最大震度" + IntensityI(report.Max_Level) + "級地區" : "",
								value  : (report_list_length != 0) ? report.Max_Level_areaName : "",
								inline : false,
							},
							{
								name   : "地圖",
								value  : "https://www.google.com/maps/search/?api=1&query=" + report.lat + "," + report.lon,
								inline : true,
							},
						],
						color: report.loc.startsWith("地震資訊") ? 9807270 : report.no % 1000 ? 15158332 : 3066993,
					},
				],
			};
		}

		fetch(setting["webhook.url"], {
			method  : "POST",
			headers : { "Content-Type": "application/json" },
			body    : JSON.stringify(msg),
		}).catch((error) => {
			log(error, 3, "Webhook", "report-Notification");
			dump({ level: 2, message: error, origin: "Webhook" });
		});
	}

	if (report.data) {
		const location = report.location.match(/(?<=位於).+(?=\))/);

		if (report.data.length != 0 && speecd_use) {
			const areaIntensity = `${IntensityI(report.data[0].areaIntensity)}級`;
			TREM.speech.speak({ text: `${location}發生規模 ${report.magnitudeValue.toFixed(1).replace(".", "點")}，最大震度${report.data[0].areaName + report.data[0].eqStation[0].stationName + areaIntensity.replace("-級", "弱").replace("+級", "強")}，深度 ${report.depth.toFixed(1).replace(".", "點")} 公里` });
		} else if (speecd_use) {
			TREM.speech.speak({ text: `${location}發生規模 ${report.magnitudeValue.toFixed(1).replace(".", "點")}，深度 ${report.depth.toFixed(1).replace(".", "點")} 公里` });
		}
	} else if (report.list) {
		const location = report.loc.match(/(?<=位於).+(?=\))/);

		if (Object.keys(report.list).length != 0 && speecd_use) {
			const areaIntensity = `${IntensityI(report.Max_Level)}級`;
			TREM.speech.speak({ text: `${location}發生規模 ${report.mag.toFixed(1).replace(".", "點")}，最大震度${report.Max_Level_areaName + report.Max_Level_stationName + areaIntensity.replace("-級", "弱").replace("+級", "強")}，深度 ${report.depth.toFixed(1).replace(".", "點")} 公里` });
		} else if (speecd_use) {
			TREM.speech.speak({ text: `${location}發生規模 ${report.mag.toFixed(1).replace(".", "點")}，深度 ${report.depth.toFixed(1).replace(".", "點")} 公里` });
		}
	}
});

ipcRenderer.on("intensity-Notification", (event, intensity) => {
	// console.log(intensity);
	const info = intensity;
	const intensity1 = info.area;
	let description = "";
	let city0 = "";
	const intensity1r = Object.keys(intensity1).reverse();
	const intensity1rkeys = Object.keys(intensity1).reverse();

	for (let index = 0; index < intensity1rkeys.length; index++) {
		const intensity2 = Number(Object.keys(intensity1)[(intensity1rkeys.length - (1 + index))]);
		const ids = intensity1[intensity1rkeys[index]];
		const intensity3 = `${IntensityI(intensity2)}級`;

		description += `${intensity3.replace("-級", "弱").replace("+級", "強")}\n`;

		for (const city in TREM.Resources.regionv2)
			for (const town in TREM.Resources.regionv2[city]) {
				const loc = TREM.Resources.regionv2[city][town];

				for (const id of ids)
					if (loc.code == id && city0 == city) {
						description += ` ${town}`;
					} else if (loc.code == id && city0 == "") {
						description += `${city} ${town}`;
						city0 = city;
					} else if (loc.code == id && city0 != city) {
						description += `\n${city} ${town}`;
						city0 = city;
					}
			}

		if (city0 == "") continue;
		city0 = "";
		description += "\n";
	}

	description += "\n";

	if (speecd_use && info.author != "palert") {
		const now = timeconvert(new Date(info.eq.time != 0 ? info.eq.time : info.timestamp)).format("YYYY/MM/DD HH:mm:ss");
		let description0 = "";
		const city1 = {};

		for (let index = 0, keys = Object.keys(intensity1r), n = keys.length; index < n; index++) {
			const intensity2 = Number(intensity1r[index]);
			const ids = intensity1[intensity2];
			const intensity3 = `${IntensityI(intensity2)}級`;

			for (const city in TREM.Resources.regionv2)
				for (const town in TREM.Resources.regionv2[city]) {
					const loc = TREM.Resources.regionv2[city][town];

					for (const id of ids)
						if (city1[city] == city) {
							continue;
						} else if (loc.code == id && city0 == city) {
							continue;
						} else if (loc.code == id && city0 == "") {
							description0 += `${city}`;
							description0 += `${intensity3.replace("-級", "弱").replace("+級", "強")}\n`;
							city0 = city;
							city1[city] = city;
						} else if (loc.code == id && city0 != city) {
							description0 += `${city}`;
							description0 += `${intensity3.replace("-級", "弱").replace("+級", "強")}\n`;
							city0 = city;
							city1[city] = city;
						}
				}

			if (city0 == "") continue;
			city0 = "";
		}

		console.error(description0);

		TREM.speech.speak({ text: "震度速報"
		+ "資料來源" + info.author
		+ (info.eq.time != 0 ? "發震時間" : "接收時間") + now
		+ "震度分布" + description0 });
	}

	if (setting["webhook.url"] != "" && setting["intensity.Notification"]) {
		log("Posting Notification intensity Webhook", 1, "Webhook", "intensity-Notification");
		dump({ level: 0, message: "Posting Notification intensity Webhook", origin: "Webhook" });
		const max_intensity = `${IntensityI(info.max)}級`;
		const msg = {
			username   : "TREMV | 臺灣即時地震監測變體",
			avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
			content    : setting["tts.Notification"] ? ("震度速報"
			+ "資料來源" + info.author
			+ (info.id != 0 ? "發震時間" : "接收時間") + (info.eq.time != 0 ? timeconvert(new Date(info.eq.time)).format("YYYY/MM/DD HH:mm:ss") : timeconvert(new Date(info.timestamp)).format("YYYY/MM/DD HH:mm:ss"))
			+ "第" + `${info.serial ?? "1"}報`
			+ ((info.final) ? "最終報" : "")
			+ "最大震度" + max_intensity.replace("-級", "弱").replace("+級", "強")) : "震度速報",
			tts    : setting["tts.Notification"],
			embeds : [
				{
					author: {
						name     : "震度速報",
						url      : undefined,
						icon_url : undefined,
					},
					fields: [
						{
							name   : "資料來源",
							value  : info.author,
							inline : true,
						},
						{
							name   : info.eq.time != 0 ? "發震時間" : "接收時間",
							value  : info.eq.time != 0 ? timeconvert(new Date(info.eq.time)).format("YYYY/MM/DD HH:mm:ss") : timeconvert(new Date(info.timestamp)).format("YYYY/MM/DD HH:mm:ss"),
							inline : true,
						},
						{
							name   : `第${info.serial ?? "1"}報`,
							value  : "",
							inline : false,
						},
						{
							name   : (info.final) ? "最終報" : "",
							value  : "",
							inline : true,
						},
						{
							name   : "最大震度",
							value  : max_intensity.replace("-級", "弱").replace("+級", "強"),
							inline : false,
						},
						{
							name   : "震度分布",
							value  : description,
							inline : true,
						},
					],
				},
			],
		};
		fetch(setting["webhook.url"], {
			method  : "POST",
			headers : { "Content-Type": "application/json" },
			body    : JSON.stringify(msg),
		}).catch((error) => {
			log(error, 3, "Webhook", "intensity-Notification");
			dump({ level: 2, message: error, origin: "Webhook" });
		});
	}
});

ipcRenderer.on("update-available-Notification", (event, version, getVersion, info) => {
	if (setting["webhook.url"] != undefined)
		if (setting["webhook.url"] != "" && setting["checkForUpdates.Notification"]) {
			log("Posting Notification Update Webhook", 1, "Webhook", "update-available-Notification");
			dump({ level: 0, message: "Posting Notification Update Webhook", origin: "Webhook" });
			const getVersionbody = TREM.Localization.getString("Notification_Update_Body").format(getVersion, version) + `\nhttps://github.com/yayacat/TREM/releases/tag/v${version}`;
			const msg = {
				username   : "TREMV | 臺灣即時地震監測變體",
				avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
				embeds     : [
					{
						author      : { name: "TREMV | 臺灣即時地震監測變體" },
						title       : "",
						description : "",
						color       : 4629503,
					},
				] };
			msg.embeds[0].title = TREM.Localization.getString("Notification_Update_Title");
			msg.embeds[0].description = getVersionbody;
			fetch(setting["webhook.url"], {
				method  : "POST",
				headers : { "Content-Type": "application/json" },
				body    : JSON.stringify(msg),
			}).catch((error) => {
				log(error, 3, "Webhook", "update-available-Notification");
				dump({ level: 2, message: error, origin: "Webhook" });
			});
		}

	showDialog("success", `有可用的${info.releaseName}版本更新`, info.releaseNotes.replace("<p>", "").replaceAll("<br>", "").replace("</p>", ""),
		1, "update", () => {
			openURL(`https://github.com/yayacat/TREM/releases/tag/v${version}`);
		}, "前往更新", "暫緩更新", () => void 0, 60);
});

ipcRenderer.on("update-not-available-Notification", (event, version, getVersion) => {
	if (setting["webhook.url"] != undefined)
		if (setting["webhook.url"] != "" && setting["checkForUpdates.Notification"]) {
			log("Posting Notification No Update Webhook", 1, "Webhook", "update-not-available-Notification");
			dump({ level: 0, message: "Posting Notification No Update Webhook", origin: "Webhook" });
			const getVersionbody = TREM.Localization.getString("Notification_No_Update_Body").format(getVersion, version);
			const msg = {
				username   : "TREMV | 臺灣即時地震監測變體",
				avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
				embeds     : [
					{
						author      : { name: "TREMV | 臺灣即時地震監測變體" },
						title       : "",
						description : "",
						color       : 4629503,
					},
				] };
			msg.embeds[0].title = TREM.Localization.getString("Notification_No_Update_Title");
			msg.embeds[0].description = getVersionbody;
			fetch(setting["webhook.url"], {
				method  : "POST",
				headers : { "Content-Type": "application/json" },
				body    : JSON.stringify(msg),
			}).catch((error) => {
				log(error, 3, "Webhook", "update-not-available-Notification");
				dump({ level: 2, message: error, origin: "Webhook" });
			});
		}
});

ipcRenderer.on("testEEW", (event, list = []) => {
	toggleNav(false);
	stopReplaybtn();
	replaytestEEW = NOW().getTime();
	ReportTag = 0;
	console.debug("ReportTag: ", ReportTag);

	if (TREM.MapIntensity.isTriggered)
		TREM.MapIntensity.clear();

	if (TREM.MapArea2.isTriggered)
		TREM.MapArea2.clear();

	if (!list.length)
		setTimeout(() => {
			log("Start EEW Test", 1, "EEW", "testEEW");
			dump({ level: 0, message: "Start EEW Test", origin: "EEW" });

			const data = {
				uuid: `rts-TREM-${localStorage.UUID_rts}`,
			};

			log(`Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, 0, "Verbose", "testEEW");
			dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
			axios.post(posturl + "replay", data)
				.then((res) => {
					if (res.ok) {
						console.debug(res);
						testEEWerror = false;
					} else {
						console.error(res);

						switch (res.status) {
							case 429: {
								log(res.status, 3, "testEEW", "replay");
								dump({ level: 2, message: res.status });
								break;
							}

							case 404: {
								log(res.status, 3, "testEEW", "replay");
								dump({ level: 2, message: res.status });
								break;
							}

							case 500: {
								log(res.status, 3, "testEEW", "replay");
								dump({ level: 2, message: res.status });
								break;
							}

							default: break;
						}
					}
				})
				.catch((error) => {
					testEEWerror = true;
					log(error, 3, "Verbose", "testEEW");
					dump({ level: 2, message: error, origin: "Verbose" });
				});
		}, 100);
	else
		for (let index = 0; index < list.length; index++)
			setTimeout(() => {
				log("Start list EEW Test", 1, "EEW", "testEEW");
				dump({ level: 0, message: "Start list EEW Test", origin: "EEW" });

				const data = {
					uuid : `rts-TREM-${localStorage.UUID_rts}`,
					id   : list[index],
				};

				log(`Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, 0, "Verbose", "testEEW");
				dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
				axios.post(posturl + "replay", data)
					.then((res) => {
						if (res.ok) {
							console.debug(res);
							testEEWerror = false;
						} else {
							console.error(res);

							switch (res.status) {
								case 429: {
									log(res.status, 3, "testEEW", "replay");
									dump({ level: 2, message: res.status });
									break;
								}

								case 404: {
									log(res.status, 3, "testEEW", "replay");
									dump({ level: 2, message: res.status });
									break;
								}

								case 500: {
									log(res.status, 3, "testEEW", "replay");
									dump({ level: 2, message: res.status });
									break;
								}

								default: break;
							}
						}
					})
					.catch((error) => {
						testEEWerror = true;
						log(error, 3, "Verbose", "testEEW");
						dump({ level: 2, message: error, origin: "Verbose" });
					});
			}, 100);
});

ipcRenderer.on("settingError", (event, error) => {
	is_setting_disabled = error;
});

const updateMapColors = async (event, value) => {
	let accent, dark;

	if (typeof value == "boolean") {
		accent = setting["theme.color"];
		dark = value;
	} else {
		accent = value;
		dark = setting["theme.dark"];
	}

	TREM.Colors = await getThemeColors(accent, dark);
};

ipcRenderer.on("config:theme", updateMapColors);
ipcRenderer.on("config:dark", updateMapColors);
ipcRenderer.on("config:color", (event, key, value) => {
	if (typeof event == "boolean") key = event;

	if (typeof key == "boolean") {
		for (let i = 0; i < 10; i++) {
			document.body.style[key ? "setProperty" : "removeProperty"](`--custom-int-${i}`, setting[`theme.int.${i}`]);

			if (tinycolor(key ? setting[`theme.int.${i}`] : [
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
			][i]).getLuminance() > 0.575)
				$(`.${IntensityToClassString(i).replace(" darkText", "").split(" ").join(".")}`).addClass("darkText");
			else
				$(`.${IntensityToClassString(i).replace(" darkText", "").split(" ").join(".")}`).removeClass("darkText");
		}
	} else if (setting["theme.customColor"]) {
		document.body.style.setProperty(`--${key.replace(/\./g, "-").replace("theme", "custom")}`, value);

		if (tinycolor(value).getLuminance() > 0.575)
			$(`.${IntensityToClassString(IntensityN(key.replace("theme.int.", ""))).replace(" darkText", "").split(" ").join(".")}`).addClass("darkText");
		else
			$(`.${IntensityToClassString(IntensityN(key.replace("theme.int.", ""))).replace(" darkText", "").split(" ").join(".")}`).removeClass("darkText");
	}
});
ipcRenderer.on("config:location", (event, value) => {
	setUserLocationMarker(value);
});
ipcRenderer.on("config:mapanimation", (event, value) => {
	Maps.main._fadeAnimated = value;
	Maps.main._zoomAnimated = value;
	Maps.report._fadeAnimated = value;
	Maps.report._zoomAnimated = value;
});
ipcRenderer.on("config:maplayer", (event, mapName, state) => {
	Maps.main.setLayoutProperty(`Layer_${mapName}`, "visibility", state ? "visible" : "none");
});
// #endregion

// #region EEW
function FCMdata(json, Unit) {
	// const json = JSON.parse(JSON.stringify(data));
	// const json = JSON.parse(data);
	console.log(json);

	if (json.type == "eew")
		if (EarthquakeList[json.id])
			if (EarthquakeList[json.id].number == json.serial) return;
			else if (EarthquakeList[json.id].number > json.serial) return;

	if (server_timestamp.includes(json.timestamp) || NOW().getTime() - json.timestamp > 180_000) return;
	server_timestamp.push(json.timestamp);

	if (server_timestamp.length > 30) server_timestamp.splice(0, 1);
	// eslint-disable-next-line no-empty-function
	fs.writeFile(path.join(app.getPath("userData"), "server.json"), JSON.stringify(server_timestamp), () => {});
	// GetData = true;
	const filename = NOW().getTime();

	if (json.response != "You have successfully subscribed to earthquake information") {
		json.data_unit = Unit;
		json.delay = NOW().getTime() - json.timestamp;
		fs.writeFile(path.join(folder, `${filename}.tmp`), JSON.stringify(json), (err) => {
			fs.rename(path.join(folder, `${filename}.tmp`), path.join(folder, `${filename}.json`), () => void 0);
		});
	}

	type_Unit = Unit;
	log(`Latency: ${NOW().getTime() - json.timestamp}ms | Form: ${Unit} | Type: ${json.type}`, 1, "API", "FCMdata");
	dump({ level: 0, message: `Latency: ${NOW().getTime() - json.timestamp}ms | Form: ${Unit} | Type: ${json.type}`, origin: "API" });
	console.debug(json);

	if (json.type == undefined) return;

	if (json.type == "tsunami-info") {
		const now = new Date(json.time);
		const Now0 = now.getFullYear()
			+ "/" + (now.getMonth() + 1)
			+ "/" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes();
		log("Got Tsunami Warning", 1, "API", "FCMdata");
		dump({ level: 0, message: "Got Tsunami Warning", origin: "API" });
		new Notification("海嘯資訊", { body: `${Now0}\n${json.location} 發生 ${json.scale} 地震\n東經: ${json.lon} 度 北緯: ${json.lat} 度`, icon: "../TREM.ico" });

		if (speecd_use) TREM.speech.speak({ text: `海嘯資訊${Now0} ${json.location} 發生 ${json.scale.replace(".", "點")} 地震` });
	} else if (json.type == "tsunami") {
		TREM.Earthquake.emit("tsunami", json);
	} else if (json.type == "trem-eq") {
		TREM.Earthquake.emit("trem-eq", json);
	// } else if (json.type == "palert") {
	// 	TREM.MapIntensity.palert(json);
	// } else if (json.type == "palert-app") {
	// 	console.debug(json);
	} else if (json.type == "pws") {
		TREM.PWS.addPWS(json.raw);
	} else if (json.type == "intensity") {
		log("Got Earthquake intensity", 1, "API", "FCMdata");
		dump({ level: 0, message: "Got Earthquake intensity", origin: "API" });

		if (EarthquakeList[json.id]) json.eq = EarthquakeList[json.id].eq;

		setTimeout(() => {
			ipcRenderer.send("screenshotEEWI", {
				Function : "intensity",
				ID       : 1,
				Version  : 1,
				Time     : NOW().getTime(),
				Shot     : 1,
			});
		}, 1250);

		if (json.author == "cwa")
			ipcRenderer.send("config:value", "intensity.cwa", filename.toString());
		else if (json.author == "palert")
			ipcRenderer.send("config:value", "intensity.palert", filename.toString());
		else if (json.author == "trem")
			ipcRenderer.send("config:value", "intensity.trem", filename.toString());

		ipcRenderer.send("TREMIntensityhandle", json);
		ipcRenderer.send("intensity-Notification", json);
	} else if (json.type == "replay") {
		log("Got Earthquake replay", 1, "API", "FCMdata");
		dump({ level: 0, message: "Got Earthquake replay", origin: "API" });

		if (!replayD) {
			replay = json.replay_timestamp;
			replayT = NOW().getTime();
		}

		Report_GET();
		stopReplaybtn();
	} else if (json.type == "report") {
		const report = json.data;
		// const report = json.raw;
		const location = report.loc.match(/(?<=位於).+(?=\))/);
		const MaxareaName = Object.keys(report.list)[0];
		const MaxstationName = Object.keys(report.list[MaxareaName].town)[0];
		report.int = report.list[MaxareaName].int;
		report.no = report.id.split("-")[0];

		if (report.id.match(/-/g).length === 3 && setting["report.onlycwachangeView"]) {
			if (!win.isFocused())
				new Notification("地震報告",
					{
						body   : `${location}發生規模 ${report.mag.toFixed(1)} 有感地震，最大震度${MaxareaName}${MaxstationName}${TREM.Constants.intensities[report.list[MaxareaName].town[MaxstationName].int].text}。`,
						icon   : "../TREM.ico",
						silent : win.isFocused(),
					});

			addReport(report, true);

			setTimeout(() => {
				ipcRenderer.send("screenshotEEW", {
					Function : "report",
					ID       : json.earthquakeNo ?? report.id,
					Version  : 1,
					Time     : NOW().getTime(),
					Shot     : 1,
				});
			}, 5000);

			if (TREM.MapIntensity.isTriggered)
				TREM.MapIntensity.clear();

			if (TREM.MapArea2.isTriggered)
				TREM.MapArea2.clear();

			if (setting["audio.report"]) audioPlay("../audio/Report.wav");

			if (setting["report.show"]) win.showInactive();

			if (setting["report.cover"])
				if (!win.isFullScreen()) {
					win.setAlwaysOnTop(true);
					win.focus();
					win.setAlwaysOnTop(false);
				}
		} else if (!setting["report.onlycwachangeView"]) {
			if (report.loc.startsWith("地震資訊")) {
				if (api_key_verify && setting["report.getInfo"]) {
					// if (!win.isFocused())
					// 	new Notification("地震報告",
					// 		{
					// 			body   : `${location}發生規模 ${report.magnitudeValue.toFixed(1)} 有感地震，最大震度${report.data[0].areaName}${report.data[0].eqStation[0].stationName}${TREM.Constants.intensities[report.data[0].eqStation[0].stationIntensity].text}。`,
					// 			icon   : "../TREM.ico",
					// 			silent : win.isFocused(),
					// 		});

					setTimeout(() => {
						ipcRenderer.send("screenshotEEW", {
							Function : "report",
							ID       : json.earthquakeNo,
							Version  : 1,
							Time     : NOW().getTime(),
							Shot     : 1,
						});
					}, 5000);

					if (TREM.MapIntensity.isTriggered)
						TREM.MapIntensity.clear();

					if (TREM.MapArea2.isTriggered)
						TREM.MapArea2.clear();

					if (setting["audio.report"]) audioPlay("../audio/Report.wav");

					if (setting["report.show"]) win.showInactive();

					if (setting["report.cover"])
						if (!win.isFullScreen()) {
							win.setAlwaysOnTop(true);
							win.focus();
							win.setAlwaysOnTop(false);
						}

					addReport(report, true);
				}
			} else if (report.id.match(/-/g).length === 3) {
				if (!win.isFocused())
					new Notification("地震報告",
						{
							body   : `${location}發生規模 ${report.mag.toFixed(1)} 有感地震，最大震度${MaxareaName}${MaxstationName}${TREM.Constants.intensities[report.list[MaxareaName].town[MaxstationName].int].text}。`,
							icon   : "../TREM.ico",
							silent : win.isFocused(),
						});

				setTimeout(() => {
					ipcRenderer.send("screenshotEEW", {
						Function : "report",
						ID       : json.earthquakeNo,
						Version  : 1,
						Time     : NOW().getTime(),
						Shot     : 1,
					});
				}, 5000);

				if (TREM.MapIntensity.isTriggered)
					TREM.MapIntensity.clear();

				if (TREM.MapArea2.isTriggered)
					TREM.MapArea2.clear();

				if (setting["audio.report"]) audioPlay("../audio/Report.wav");

				if (setting["report.show"]) win.showInactive();

				if (setting["report.cover"])
					if (!win.isFullScreen()) {
						win.setAlwaysOnTop(true);
						win.focus();
						win.setAlwaysOnTop(false);
					}

				addReport(report, true);
			}
		}

		log("Got Earthquake Report", 1, "API", "FCMdata");
		dump({ level: 0, message: "Got Earthquake Report", origin: "API" });
	} else if (json.type.startsWith("eew") || json.type == "eew") {
		if (replay != 0 && !json.replay_timestamp) return;

		if (NOW().getTime() - json.time > 300_000) return;

		if (json.type == "trem" && !eew_key_verify && replay == 0) return;

		if (json.author) {
			if (
				(json.author == "scdzj" && !setting["accept.eew.SCDZJ"])
				|| (json.author == "nied" && !setting["accept.eew.NIED"])
				|| (json.author == "jma" && !setting["accept.eew.JMA"])
				|| (json.author == "kma" && !setting["accept.eew.KMA"])
				|| (json.author == "cwb" && !setting["accept.eew.CWA"])
				|| (json.author == "fjdzj" && !setting["accept.eew.FJDZJ"])
				|| (json.author == "trem" && !setting["accept.eew.trem"])
			) return;

			json.Unit = (json.scale == 1) ? "PLUM(局部無阻尼運動傳播法)"
				: (json.author == "scdzj") ? "四川省地震局 (SCDZJ)"
					: (json.author == "nied") ? "防災科学技術研究所 (NIED)"
						: (json.author == "kma") ? "기상청(KMA)"
							: (json.author == "jma") ? "気象庁(JMA)"
								: (json.author == "cwa") ? "中央氣象署 (CWA)"
									: (json.author == "fjdzj") ? "福建省地震局 (FJDZJ)"
										: (json.author == "trem" && json.serial > 3) ? "TREM(實驗功能僅供參考)"
											: (json.author == "trem" && json.serial <= 3) ? "NSSPE(無震源參數推算)"
												: (json.Unit) ? json.Unit : "";
		} else {
			if (
				(json.type == "eew-scdzj" && !setting["accept.eew.SCDZJ"])
				|| (json.type == "eew-nied" && !setting["accept.eew.NIED"])
				|| (json.type == "eew-jma" && !setting["accept.eew.JMA"])
				|| (json.type == "eew-kma" && !setting["accept.eew.KMA"])
				|| (json.type == "eew-cwb" && !setting["accept.eew.CWA"])
				|| (json.type == "eew-fjdzj" && !setting["accept.eew.FJDZJ"])
				|| (json.type == "trem-eew" && !setting["accept.eew.trem"])
			) return;

			json.Unit = (json.scale == 1) ? "PLUM(局部無阻尼運動傳播法)"
				: (json.type == "eew-scdzj") ? "四川省地震局 (SCDZJ)"
					: (json.type == "eew-nied") ? "防災科学技術研究所 (NIED)"
						: (json.type == "eew-kma") ? "기상청(KMA)"
							: (json.type == "eew-jma") ? "気象庁(JMA)"
								: (json.type == "eew-cwb") ? "中央氣象署 (CWA)"
									: (json.type == "eew-fjdzj") ? "福建省地震局 (FJDZJ)"
										: (json.type == "trem-eew" && json.number > 3) ? "TREM(實驗功能僅供參考)"
											: (json.type == "trem-eew" && json.number <= 3) ? "NSSPE(無震源參數推算)"
												: (json.Unit) ? json.Unit : "";
		}

		stopReplaybtn();
		TREM.Earthquake.emit("eew", json);
	}
}
// #endregion

ipcRenderer.on("Olddatabase_eew", (event, json) => {
	if (json.eq) {
		json.replay_time = json.eq.time;
		json.replay_timestamp = json.eq.time;
		json.time = NOW().getTime();
		json.timestamp = NOW().getTime();
	} else {
		json.replay_time = json.time;
		json.replay_timestamp = json.time;
		json.time = NOW().getTime();
		json.timestamp = NOW().getTime();
	}

	if (json.author)
		json.Unit = (json.scale == 1) ? "PLUM(局部無阻尼運動傳播法)"
			: (json.author == "scdzj") ? "四川省地震局 (SCDZJ)"
				: (json.author == "nied") ? "防災科学技術研究所 (NIED)"
					: (json.author == "kma") ? "기상청(KMA)"
						: (json.author == "jma") ? "気象庁(JMA)"
							: (json.author == "cwa") ? "中央氣象署 (CWA)"
								: (json.author == "fjdzj") ? "福建省地震局 (FJDZJ)"
									: (json.author == "trem" && json.serial > 3) ? "TREM(實驗功能僅供參考)"
										: (json.author == "trem" && json.serial <= 3) ? "NSSPE(無震源參數推算)"
											: (json.Unit) ? json.Unit : "";
	else
		json.Unit = (json.scale == 1) ? "PLUM(局部無阻尼運動傳播法)"
			: (json.type == "eew-scdzj") ? "四川省地震局 (SCDZJ)"
				: (json.type == "eew-nied") ? "防災科学技術研究所 (NIED)"
					: (json.type == "eew-kma") ? "기상청(KMA)"
						: (json.type == "eew-jma") ? "気象庁(JMA)"
							: (json.type == "eew-cwb") ? "中央氣象署 (CWA)"
								: (json.type == "eew-fjdzj") ? "福建省地震局 (FJDZJ)"
									: (json.type == "trem-eew" && json.number > 3) ? "TREM(實驗功能僅供參考)"
										: (json.type == "trem-eew" && json.number <= 3) ? "NSSPE(無震源參數推算)"
											: (json.Unit) ? json.Unit : "";

	stopReplaybtn();
	TREM.Earthquake.emit("eew", json);
});

ipcRenderer.on("test_eew", (event, json) => {
	json.time = NOW().getTime();
	json.timestamp = NOW().getTime();
	json.Unit = (json.scale == 1) ? "PLUM(局部無阻尼運動傳播法)"
		: (json.type == "eew-scdzj") ? "四川省地震局 (SCDZJ)"
			: (json.type == "eew-nied") ? "防災科学技術研究所 (NIED)"
				: (json.type == "eew-kma") ? "기상청(KMA)"
					: (json.type == "eew-jma") ? "気象庁(JMA)"
						: (json.type == "eew-cwb") ? "中央氣象署 (CWA)"
							: (json.type == "eew-fjdzj") ? "福建省地震局 (FJDZJ)"
								: (json.type == "trem-eew" && json.number > 3) ? "TREM(實驗功能僅供參考)"
									: (json.type == "trem-eew" && json.number <= 3) ? "NSSPE(無震源參數推算)"
										: (json.Unit) ? json.Unit : "";

	stopReplaybtn();
	TREM.Earthquake.emit("eew", json);
});

// #region Event: eew
TREM.Earthquake.on("eew", (data) => {
	log("Got EEW", 1, "API", "eew");
	dump({ level: 0, message: "Got EEW", origin: "API" });
	console.debug(data);
	let Timer_run;

	if (data.status == 3) data.cancel = true;

	if (data.status == 2) data.Test = true;

	if (data.status == 1) data.Alert = true;

	if (data.status == 0) data.Alert = false;

	if (data.serial > 0) data.number = data.serial;

	if (data.eq) {
		if (data.eq.lon) data.lon = data.eq.lon;

		if (data.eq.lat) data.lat = data.eq.lat;

		if (data.eq.depth) data.depth = data.eq.depth;

		if (data.eq.mag) data.scale = data.eq.mag;

		if (data.eq.loc) data.location = data.eq.loc;

		if (data.eq.time && replay == 0) data.time = data.eq.time;
	}

	if ((data.type == "trem-eew" || data.author == "trem") && (data.lat == null && data.lon == null)) return;

	// if (data.number == 1 && setting["link.on"] && !link_on) {
	// 	link_on = true;
	// 	ipcRenderer.send("linkpathtest", setting["link.path"], setting["link.name"]);
	// }

	if (!TREM.EEW.has(data.id))
		TREM.EEW.set(data.id, new EEW(data));
	else
		TREM.EEW.get(data.id).update(data);

	// handler
	if (!EarthquakeList[data.id]) EarthquakeList[data.id] = {
		epicenter       : [],
		Time            : 0,
		ID              : "",
		number          : "",
		Timer           : Timer_run,
		distance        : [],
		epicenterIcon   : null,
		epicenterIconTW : null,
		eq              : {},
	};
	else if (EarthquakeList[data.id].number == data.number) return;
	else if (EarthquakeList[data.id].number > data.number) return;

	EarthquakeList[data.id].epicenter = [+data.lon, +data.lat];
	EarthquakeList[data.id].Time = data.time;
	EarthquakeList[data.id].ID = data.id;

	if (data.eq) EarthquakeList[data.id].eq = data.eq;

	let value = 0;
	let distance = 0;

	const GC = {};
	let level;
	let MaxIntensity = { label: "", value: -1 };
	const NSSPE = data.intensity ?? {};

	for (const city in TREM.Resources.region)
		for (const town in TREM.Resources.region[city]) {
			const loc = TREM.Resources.region[city][town];
			const d = TREM.Utils.twoSideDistance(
				TREM.Utils.twoPointDistance(
					{ lat: loc.latitude, lon: loc.longitude },
					{ lat: data.lat, lon: data.lon },
				),
				data.depth,
			);
			let int = TREM.Utils.PGAToIntensity(
				TREM.Utils.pga(
					data.scale,
					d,
					setting["earthquake.siteEffect"] ? loc.siteEffect : undefined,
				),
			);

			if (data.depth == null) int = NSSPE[loc[0]] ?? { value: 0, label: "0", get text() {
				return TREM.Localization.getString("Intensity_Zero");
			} };

			if (setting["location.city"] == city && setting["location.town"] == town) {
				level = int;
				distance = d;
				value = Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000) - 2;
			}

			if (int.value > MaxIntensity.value)
				MaxIntensity = int;
			GC[loc.code] = int.value;
		}

	if (setting["location.lat"] != "" && setting["location.lon"] != "") {
		const d = TREM.Utils.twoSideDistance(
			TREM.Utils.twoPointDistance(
				{ lat: setting["location.lat"], lon: setting["location.lon"] },
				{ lat: data.lat, lon: data.lon },
			),
			data.depth,
		);
		let int = TREM.Utils.PGAToIntensity(
			TREM.Utils.pga(
				data.scale,
				d,
				undefined,
			),
		);

		for (const city in TREM.Resources.region)
			for (const town in TREM.Resources.region[city]) {
				const loc = TREM.Resources.region[city][town];

				if (data.depth == null) int = NSSPE[loc[0]] ?? { value: 0, label: "0", get text() {
					return TREM.Localization.getString("Intensity_Zero");
				} };
			}

		level = int;
		distance = d;
		value = Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000) - 2;

		if (int.value > MaxIntensity.value)
			MaxIntensity = int;
	}

	if (setting["dev.mode"])
		if ((data.type == "trem-eew" || data.author == "trem") || data.type == "eew-cwb" || data.type == "eew-fjdzj") {
			console.debug(MaxIntensity);
		} else {
			const int = TREM.Utils.PGAToIntensity(
				TREM.Utils.pga(
					data.scale,
					data.depth,
					1,
				),
			);

			if (int.value > MaxIntensity.value)
				MaxIntensity = int;
		}

	if (data.eq && data.eq.max) MaxIntensity = { label: TREM.Constants.intensities[data.eq.max].label, value: data.eq.max };

	// TREM.MapIntensity.expected(GC);

	let Alert = true;

	if (level.value < Number(setting["eew.Intensity"])) Alert = false;

	let Nmsg = "";

	if (data.type == "trem-eew" && data.number < 3) {
		data.scale = null;
		data.depth = null;
	}

	if (data.author == "trem" && data.serial < 3) {
		data.scale = null;
		data.depth = null;
	}

	clearInterval(AudioT);
	audio.main_lock = false;
	AudioT = null;
	clearInterval(AudioT1);
	audio.minor_lock = false;
	AudioT1 = null;
	audio.main = [];
	audio.minor = [];

	if (value > 0)
		Nmsg = `${value}秒後抵達`;
	else
		Nmsg = "已抵達 (預警盲區)";

	const notify = (level.label.includes("+") || level.label.includes("-")) ? level.label.replace("+", "強").replace("-", "弱") : level.label + "級";
	let body = `${notify ?? "未知"}地震，${Nmsg}\nM ${data.scale} ${data.location ?? "未知區域"}`;

	if (data.depth == null) body = `${notify ?? "未知"}地震，${data.location ?? "未知區域"} (NSSPE)`;

	new Notification("EEW 強震即時警報", {
		body   : body,
		icon   : "../TREM.ico",
		silent : win.isFocused(),
	});

	if (speecd_use) {
		let speecd_scale = data.scale;
		const speecd_number = data.number;
		let find0 = INFO.findIndex(v => v.ID == data.id);

		if (!Number.isNaN(speecd_scale)) speecd_scale = Number.parseFloat(speecd_scale);

		if (find0 == -1) find0 = INFO.length;

		if (speecd_number == 1) {
			if (MaxIntensity.value >= 4) TREM.speech.speak({ text: "注意強震，此地震可能造成災害" });

			TREM.speech.speak({ text: `${data.location}，發生規模${speecd_scale.toFixed(1).replace(".", "點")}地震` });
		} else if (INFO[find0]?.alert_magnitude != speecd_scale && speecd_scale != 0) {
			TREM.speech.speak({ text: `${data.location}，發生規模${speecd_scale.toFixed(1).replace(".", "點")}地震` });
		} else if (INFO[find0]?.alert_magnitude != speecd_scale && speecd_scale == 0) {
			TREM.speech.speak({ text: `${data.Unit}，已取消警報` });
		} else if (data.cancel) {
			TREM.speech.speak({ text: `${data.Unit}，已取消警報` });
		}

		if (data.author == "cwa")
			if (data.location.includes("海") && Number(data.depth) <= 35)
				if (Number(speecd_scale) >= 7 && speecd_number == 1)
					TREM.speech.speak({ text: "震源位置及規模表明，可能發生海嘯，沿岸地區應慎防海水位突變，並留意中央氣象署是否發布，海嘯警報" });
				else if (Number(speecd_scale) >= 6 && speecd_number == 1)
					TREM.speech.speak({ text: "沿岸地區應慎防海水位突變" });
				else if (INFO[find0]?.alert_magnitude != speecd_scale)
					if (Number(speecd_scale) >= 7)
						TREM.speech.speak({ text: "震源位置及規模表明，可能發生海嘯，沿岸地區應慎防海水位突變，並留意中央氣象署是否發布，海嘯警報" });
					else if (Number(speecd_scale) >= 6)
						TREM.speech.speak({ text: "沿岸地區應慎防海水位突變" });
	}

	if (!Info.Notify.includes(data.id)) {
		Info.Notify.push(data.id);
		// show latest eew
		TINFO = INFO.length;
		clearInterval(Timers.ticker);
		Timers.ticker = setInterval(() => {
			if (TINFO + 1 >= INFO.length)
				TINFO = 0;
			else TINFO++;
		}, 5000);

		if (Alert) {
			changeView("main", "#mainView_btn");

			if (setting["eew.show"]) win.showInactive();

			if (setting["eew.cover"])
				if (!win.isFullScreen()) {
					win.setAlwaysOnTop(true);
					win.focus();
					win.setAlwaysOnTop(false);
				}

			if (!win.isFocused()) win.flashFrame(true);
		}

		eewt.id = data.id;

		if (data.author != "trem")
			if (setting["audio.eew"] && Alert) {
				log("Playing Audio > eew", 1, "Audio", "eew");
				dump({ level: 0, message: "Playing Audio > eew", origin: "Audio" });
				TREM.Audios.eew.play();
				audioPlay1(`../audio/1/${level.label.replace("+", "").replace("-", "")}.wav`);

				if (level.label.includes("+"))
					audioPlay1("../audio/1/intensity-strong.wav");
				else if (level.label.includes("-"))
					audioPlay1("../audio/1/intensity-weak.wav");
				else
					audioPlay1("../audio/1/intensity.wav");

				if (value > 0 && value < 100) {
					if (value <= 10) {
						audioPlay1(`../audio/1/${value.toString()}.wav`);
					} else if (value < 20) {
						audioPlay1(`../audio/1/x${value.toString().substring(1, 2)}.wav`);
					} else {
						audioPlay1(`../audio/1/${value.toString().substring(0, 1)}x.wav`);
						audioPlay1(`../audio/1/x${value.toString().substring(1, 2)}.wav`);
					}

					audioPlay1("../audio/1/second.wav");
				}
			}
	}

	if (data.author != "trem")
		if (MaxIntensity.value >= 5)
			if (!Info.Warn.includes(data.id)) {
				Info.Warn.push(data.id);

				if (!EEWAlert) {
					EEWAlert = true;

					if (setting["audio.eew"] && Alert)
						for (let index = 0; index < 5; index++)
							audioPlay("../audio/Warn.wav");
				}
			}

	let _time = -1;
	let stamp = 0;

	if ((EarthquakeList[data.id].number ?? 1) < data.number) {
		if ((data.type == "trem-eew" || data.author == "trem") && setting["audio.eew"] && Alert) {
			log("Playing Audio > note", 1, "Audio", "eew");
			dump({ level: 0, message: "Playing Audio > note", origin: "Audio" });
			TREM.Audios.note.play();
		} else if (setting["audio.eew"] && Alert) {
			log("Playing Audio > update", 1, "Audio", "eew");
			dump({ level: 0, message: "Playing Audio > update", origin: "Audio" });
			TREM.Audios.update.play();
		}

		EarthquakeList[data.id].number = data.number;
	}

	eew[data.id] = {
		lon    : Number(data.lon),
		lat    : Number(data.lat),
		time   : 0,
		Time   : data.time,
		id     : data.id,
		km     : 0,
		type   : data.type,
		t      : eew[data.id]?.t ?? null,
		value  : Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000),
		Second : eew[data.id]?.Second ?? -1,
		arrive : eew[data.id]?.arrive ?? "",
	};

	if (data.number != 1) {
		clearInterval(eew[data.id].t);
		eew[data.id].t = null;
		eew[data.id].Second = -1;
		eew[data.id].arrive = "";
	}

	if (data.author != "trem")
		if (eew[data.id].Second == -1 || eew[data.id].value < eew[data.id].Second)
			if (setting["audio.eew"] && Alert)
				if (eew[data.id].arrive == "") {
					if (eew[data.id].t != null) {
						clearInterval(eew[data.id].t);
						eew[data.id].t = null;
					}

					eew[data.id].t = setInterval(() => {
						try {
							eew[data.id].value = Math.floor(_speed(data.depth, distance).Stime - (NOW().getTime() - data.time) / 1000);
						} catch (err) {
							log(err, 3, "Audio", "eew");
							dump({ level: 2, message: err, origin: "Audio" });
							console.log(err);
						}

						if (Math.sign(eew[data.id].value) != -1) {
							eew[data.id].Second = eew[data.id].value;

							if (stamp != eew[data.id].value && !audio.minor_lock) {
								stamp = eew[data.id].value;

								if (eew[data.id].value < 100)
									if (eew[data.id].value > 10) {
										if (eew[data.id].value.toString().substring(1, 2) == "0") {
											audioPlay1(`../audio/1/${eew[data.id].value.toString().substring(0, 1)}x.wav`);
											audioPlay1("../audio/1/x0.wav");
										} else {
											audioPlay("../audio/1/ding.wav");
										}
									} else if (eew[data.id].value > 0) {
										audioPlay1(`../audio/1/${eew[data.id].value.toString()}.wav`);
									} else {
										eew[data.id].arrive = data.id;
										audioPlay1("../audio/1/arrive.wav");
										_time = 0;
										eew[data.id].Second = -1;
									}
							}
						} else if (_time >= 0) {
							audioPlay("../audio/1/ding.wav");
							_time++;

							if (_time >= 10) {
								clearInterval(eew[data.id].t);
								eew[data.id].t = null;
								_time = -1;
							}
						}
					}, 50);
				}

	const speed = setting["shock.smoothing"] ? 100 : 500;

	if (EarthquakeList[data.id].Timer != undefined || EarthquakeList[data.id].Timer != null) clearInterval(EarthquakeList[data.id].Timer);

	if (EarthquakeList[data.id].epicenterIcon != undefined || EarthquakeList[data.id].epicenterIcon != null || EarthquakeList[data.id].epicenterIcon) {
		EarthquakeList[data.id].epicenterIcon.remove();
		EarthquakeList[data.id].epicenterIcon = null;
	}

	if (EarthquakeList.ITimer != undefined) clearInterval(EarthquakeList.ITimer);

	// AlertBox: 種類
	let classString = "alert-box ";

	if (data.replay_timestamp) {
		replay = data.replay_timestamp;
		replayT = NOW().getTime();
	}

	if (data.cancel)
		classString += "eew-cancel";
	else if (data.Test)
		classString += "eew-test";
	else if (data.Alert)
		classString += "eew-alert";
	else
		classString += "eew-pred";

	let find = INFO.findIndex(v => v.ID == data.id);

	if (find == -1) find = INFO.length;
	const time = new Date((data.replay_time) ? data.replay_time : data.time);
	INFO[find] = {
		ID              : data.id,
		alert_number    : data.number,
		alert_intensity : (data.type == "trem-eew" || data.author == "trem") ? (data.max ? data.max : data.eq.max ?? 0) : MaxIntensity.value,
		alert_location  : data.location ?? "未知區域",
		alert_time      : time,
		alert_sTime     : data.depth ? Math.floor(data.time + _speed(data.depth, distance).Stime * 1000) : null,
		alert_pTime     : data.depth ? Math.floor(data.time + _speed(data.depth, distance).Ptime * 1000) : null,
		alert_local     : level.value,
		alert_magnitude : data.scale ?? "?",
		alert_depth     : data.depth ?? "?",
		alert_provider  : (data.final) ? data.Unit + "(最終報)" : data.Unit,
		alert_type      : classString,
		"intensity-1"   : `<font color="white" size="7"><b>${MaxIntensity.label}</b></font>`,
		"time-1"        : `<font color="white" size="2"><b>${time}</b></font>`,
		"info-1"        : `<font color="white" size="4"><b>M ${data.scale} </b></font><font color="white" size="3"><b> 深度: ${data.depth} km</b></font>`,
		distance,
	};

	// switch to main view
	$("#mainView_btn")[0].click();
	// remember navrail state
	const navState = !$("#nav-rail").hasClass("hide");

	// hide navrail so the view goes fullscreen
	if (navState) toggleNav(false);
	// hide report to make screen clean
	$(roll).fadeOut(200);
	// show minimap
	$("#map-tw").addClass("show");

	updateText();

	if (Timers.eew == null)
		Timers.eew = setInterval(() => {
			updateText();

			if (Timers.ticker == null)
				Timers.ticker = setInterval(() => {
					if (TINFO + 1 >= INFO.length)
						TINFO = 0;
					else TINFO++;
				}, 9000);
		}, 1000);

	EEWshot = NOW().getTime() - 28500;
	EEWshotC = 1;
	// const _distance = [];
	// for (let index = 0; index < 1002; index++)
	// 	_distance[index] = _speed(data.depth, index);
	// EarthquakeList[data.id].distance = _distance;

	// if (data.type == "trem-eew" && data.number <= 3) EarthquakeList[data.id].distance = null;

	main(data);

	if (EarthquakeList[data.id].Timer == undefined || EarthquakeList[data.id].Timer == null) EarthquakeList[data.id].Timer = Timer_run;

	EarthquakeList[data.id].Timer ??= setInterval(() => {
		main(data);
	}, speed);

	if (EarthquakeList[data.id].Timer != null || EarthquakeList[data.id].Timer != undefined) {
		clearInterval(EarthquakeList[data.id].Timer);
		EarthquakeList[data.id].Timer = setInterval(() => {
			main(data);
		}, speed);
	} else if (EarthquakeList[data.id].Timer == null || EarthquakeList[data.id].Timer == undefined) {
		EarthquakeList[data.id].Timer = setInterval(() => {
			main(data);
		}, speed);
	}

	if (TREM.EEW.get(data.id)?.geojson) {
		TREM.EEW.get(data.id).geojson.remove();
		delete TREM.EEW.get(data.id).geojson;
	}

	TREM.EEW.get(data.id).geojson = L.geoJson.vt(MapData.tw_town, {
		minZoom   : 7,
		maxZoom   : 7,
		tolerance : 20,
		buffer    : 256,
		debug     : 0,
		zIndex    : 1,
		style     : (properties) => {
			if (properties.TOWNCODE) {
				if (!GC[properties.TOWNCODE])
					return {
						stroke      : false,
						color       : "transparent",
						weight      : 0.8,
						opacity     : 0,
						fillColor   : TREM.Colors.surfaceVariant,
						fillOpacity : 0.6,
					};
				return {
					stroke      : false,
					color       : "transparent",
					weight      : 0.8,
					opacity     : 0,
					fillColor   : TREM.color(GC[properties.TOWNCODE]),
					fillOpacity : 1,
				};
			} else {
				return {
					color       : "transparent",
					weight      : 0.8,
					opacity     : 0,
					fillColor   : TREM.Colors.surfaceVariant,
					fillOpacity : 0.6,
				};
			}
		},
	});

	if (setting["webhook.url"] != "")
		setTimeout(() => {
			const showtime = timeconvert(time).format("YYYY/MM/DD HH:mm:ss");

			if (!setting["trem-eew.No-Notification"]) {
				const Now1 = NOW().getFullYear()
					+ "/" + (NOW().getMonth() + 1)
					+ "/" + NOW().getDate()
					+ " " + NOW().getHours()
					+ ":" + NOW().getMinutes()
					+ ":" + NOW().getSeconds();

				let msg = setting["webhook.body"];
				msg = msg.replace("%Depth%", data.depth == null ? "?" : data.depth).replaceAll("%NorthLatitude%", data.lat).replace("%Time%", showtime).replaceAll("%EastLongitude%", data.lon).replace("%location%", data.location).replace("%Scale%", data.scale == null ? "?" : data.scale).replace("%Number%", data.number).replace("%Final%", (data.final) ? "(最終報)" : "");

				if (data.type == "eew-cwb")
					msg = msg.replace("%Provider%", "中央氣象署 (CWA)");
				else if (data.type == "eew-scdzj")
					msg = msg.replace("%Provider%", "四川省地震局 (SCDZJ)");
				else if (data.type == "eew-fjdzj")
					msg = msg.replace("%Provider%", "福建省地震局 (FJDZJ)");
				else if (data.type == "eew-nied")
					msg = msg.replace("%Provider%", "防災科学技術研究所 (NIED)");
				else if (data.type == "eew-jma")
					msg = msg.replace("%Provider%", "気象庁(JMA)");
				else if (data.type == "eew-kma")
					msg = msg.replace("%Provider%", "기상청(KMA)");
				else if (data.type == "trem-eew" && data.number <= 3)
					msg = msg.replace("%Provider%", "NSSPE(無震源參數推算)");
				else if (data.type == "trem-eew" && data.number > 3)
					msg = msg.replace("%Provider%", "TREM(實驗功能僅供參考)");
				else if (data.author == "trem" && data.serial <= 3)
					msg = msg.replace("%Provider%", "NSSPE(無震源參數推算)");
				else if (data.author == "trem" && data.serial > 3)
					msg = msg.replace("%Provider%", "TREM(實驗功能僅供參考)");
				else
					msg = msg.replace("%Provider%", data.Unit);

				msg = JSON.parse(msg);
				msg.username = "TREMV | 臺灣即時地震監測變體";

				msg.embeds[0].image.url = "";
				msg.embeds[0].footer = {
					text     : `ExpTech Studio ${Now1}`,
					icon_url : "https://raw.githubusercontent.com/ExpTechTW/API/master/image/Icon/ExpTech.png",
				};
				msg.tts = setting["tts.Notification"];
				msg.content = setting["tts.Notification"] ? (showtime + "左右發生顯著有感地震東經" + data.lon + "北緯" + data.lat + "位於" + data.location + "深度" + (data.depth == null ? "?" : data.depth + "公里") + "規模" + (data.scale == null ? "?" : data.scale) + "第" + data.number + "報發報單位" + data.Unit + "慎防強烈搖晃，就近避難 [趴下、掩護、穩住]") : "";
				log("Posting EEW Webhook", 1, "Webhook", "eew");
				dump({ level: 0, message: "Posting EEW Webhook", origin: "Webhook" });
				fetch(setting["webhook.url"], {
					method  : "POST",
					headers : { "Content-Type": "application/json" },
					body    : JSON.stringify(msg),
				}).catch((error) => {
					log(error, 3, "Webhook", "eew");
					dump({ level: 2, message: error, origin: "Webhook" });
				});
			} else if (setting["trem-eew.No-Notification"] && (data.author != "trem")) {
				const Now1 = NOW().getFullYear()
					+ "/" + (NOW().getMonth() + 1)
					+ "/" + NOW().getDate()
					+ " " + NOW().getHours()
					+ ":" + NOW().getMinutes()
					+ ":" + NOW().getSeconds();

				let msg = setting["webhook.body"];
				msg = msg.replace("%Depth%", data.depth == null ? "?" : data.depth).replaceAll("%NorthLatitude%", data.lat).replace("%Time%", showtime).replaceAll("%EastLongitude%", data.lon).replace("%location%", data.location).replace("%Scale%", data.scale == null ? "?" : data.scale).replace("%Number%", data.number).replace("%Final%", (data.final) ? "(最終報)" : "");

				if (data.type == "eew-cwb")
					msg = msg.replace("%Provider%", "中央氣象署 (CWA)");
				else if (data.type == "eew-scdzj")
					msg = msg.replace("%Provider%", "四川省地震局 (SCDZJ)");
				else if (data.type == "eew-fjdzj")
					msg = msg.replace("%Provider%", "福建省地震局 (FJDZJ)");
				else if (data.type == "eew-nied")
					msg = msg.replace("%Provider%", "防災科学技術研究所 (NIED)");
				else if (data.type == "eew-jma")
					msg = msg.replace("%Provider%", "気象庁(JMA)");
				else if (data.type == "eew-kma")
					msg = msg.replace("%Provider%", "기상청(KMA)");
				else
					msg = msg.replace("%Provider%", data.Unit);

				msg = JSON.parse(msg);
				msg.username = "TREMV | 臺灣即時地震監測變體";

				msg.embeds[0].image.url = "";
				msg.embeds[0].footer = {
					text     : `ExpTech Studio ${Now1}`,
					icon_url : "https://raw.githubusercontent.com/ExpTechTW/API/master/image/Icon/ExpTech.png",
				};
				msg.tts = setting["tts.Notification"];
				msg.content = setting["tts.Notification"] ? (showtime + "左右發生顯著有感地震東經" + data.lon + "北緯" + data.lat + "位於" + data.location + "深度" + (data.depth == null ? "?" : data.depth + "公里") + "規模" + (data.scale == null ? "?" : data.scale) + "第" + data.number + "報發報單位" + data.Unit + "慎防強烈搖晃，就近避難 [趴下、掩護、穩住]") : "";
				log("Posting No trem-eew Webhook", 1, "Webhook", "eew");
				dump({ level: 0, message: "Posting Webhook", origin: "Webhook" });
				fetch(setting["webhook.url"], {
					method  : "POST",
					headers : { "Content-Type": "application/json" },
					body    : JSON.stringify(msg),
				}).catch((error) => {
					log(error, 3, "Webhook", "eew");
					dump({ level: 2, message: error, origin: "Webhook" });
				});
			}
		}, 2000);
});
// #endregion

// #region Event: eewEnd
TREM.Earthquake.on("eewEnd", (id, type) => {
	clear(id, type);
});
// #endregion

TREM.Earthquake.on("trem-eq", (data) => {
	console.debug(data);
	const now = new Date(data.time);
	const Now2 = now.getFullYear()
	+ "/" + (now.getMonth() + 1 < 10 ? "0" : "") + (now.getMonth() + 1)
	+ "/" + (now.getDate() < 10 ? "0" : "") + now.getDate()
	+ " " + (now.getHours() < 10 ? "0" : "") + now.getHours()
	+ ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes()
	+ ":" + (now.getSeconds() < 10 ? "0" : "") + now.getSeconds();
	const _now = new Date(data.timestamp);
	const _Now = _now.getFullYear()
	+ "/" + (_now.getMonth() + 1 < 10 ? "0" : "") + (_now.getMonth() + 1)
	+ "/" + (_now.getDate() < 10 ? "0" : "") + _now.getDate()
	+ " " + (_now.getHours() < 10 ? "0" : "") + _now.getHours()
	+ ":" + (_now.getMinutes() < 10 ? "0" : "") + _now.getMinutes()
	+ ":" + (_now.getSeconds() < 10 ? "0" : "") + _now.getSeconds();

	if (setting["webhook.url"] != "" && setting["trem-eq.alert.Notification"] && data.alert) {
		let state_station;
		let Max_Intensity = 0;
		let description = "警報\n";
		description += `\n開始時間 > ${Now2}\n\n`;

		for (let index = 0, keys = Object.keys(data.list), n = keys.length; index < n; index++) {
			if (data.list[keys[index]] > Max_Intensity) Max_Intensity = data.list[keys[index]];
			description += `${current_station_data.Loc} 最大震度 > ${IntensityI(data.list[keys[index]])}\n`;
			state_station = index + 1;
		}

		description += `\n第 ${data.number} 報 | ${data.data_count} 筆數據 ${data.final ? "(最終報)" : ""}\n`;
		description += `共 ${state_station} 站觸發 | 全部 ${data.total_station} 站\n`;
		description += `現在時間 > ${_Now}\n`;
		// console.log(description);
		const msg = {
			username   : "TREMV | 臺灣即時地震監測變體",
			avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
			content    : setting["tts.Notification"] ? ((data.final ? "地震檢知(最終報)" : "地震檢知") + description) : "地震檢知",
			tts        : setting["tts.Notification"],
			embeds     : [
				{
					author: {
						name     : data.final ? "地震檢知(最終報)" : "地震檢知",
						url      : `https://exptech.com.tw/api/v1/file?path=/trem-report.html&id=${data.report_id}`,
						icon_url : undefined,
					},
					description : description,
					color       : 15158332,
				},
			],
		};

		if (setting["trem-eq.alert.Notification.Intensity"] <= Max_Intensity) {
			log("Posting Notification trem-eq alert Webhook", 1, "Webhook", "trem-eq");
			dump({ level: 0, message: "Posting Notification trem-eq alert Webhook", origin: "Webhook" });
			fetch(setting["webhook.url"], {
				method  : "POST",
				headers : { "Content-Type": "application/json" },
				body    : JSON.stringify(msg),
			}).catch((error) => {
				log(error, 3, "Webhook", "trem-eq");
				dump({ level: 2, message: error, origin: "Webhook" });
			});
		}
	} else if (setting["webhook.url"] != "" && setting["trem-eq.Notification"] && setting["dev.mode"]) {
		let state_station;
		let description = "";

		if (data.cancel)
			description += "取消\n";
		else if (data.alert)
			description += "警報\n";
		else
			description += "預報\n";

		description += `\n開始時間 > ${Now2}\n\n`;

		for (let index = 0, keys = Object.keys(data.list), n = keys.length; index < n; index++) {
			description += `${current_station_data.Loc} 最大震度 > ${IntensityI(data.list[keys[index]])}\n`;
			state_station = index + 1;
		}

		description += `\n第 ${data.number} 報 | ${data.data_count} 筆數據 ${data.final ? "(最終報)" : ""}\n`;
		description += `共 ${state_station} 站觸發 | 全部 ${data.total_station} 站\n`;
		description += `現在時間 > ${_Now}\n`;
		// console.log(description);
		const msg = {
			username   : "TREMV | 臺灣即時地震監測變體",
			avatar_url : "https://raw.githubusercontent.com/ExpTechTW/API/%E4%B8%BB%E8%A6%81%E7%9A%84-(main)/image/Icon/ExpTech.png",
			content    : setting["tts.Notification"] ? ((data.final ? "地震檢知(最終報)" : "地震檢知") + description) : "地震檢知",
			tts        : setting["tts.Notification"],
			embeds     : [
				{
					author: {
						name     : data.final ? "地震檢知(最終報)" : "地震檢知",
						url      : (data.alert) ? `https://exptech.com.tw/api/v1/file?path=/trem-report.html&id=${data.report_id}` : "",
						icon_url : undefined,
					},
					description : description,
					color       : (data.cancel) ? 9807270 : (data.alert) ? 15158332 : 15105570,
				},
			],
		};
		log("Posting dev mode Notification trem-eq alert Webhook", 1, "Webhook", "trem-eq");
		dump({ level: 0, message: "Posting dev mode Notification trem-eq Webhook", origin: "Webhook" });
		fetch(setting["webhook.url"], {
			method  : "POST",
			headers : { "Content-Type": "application/json" },
			body    : JSON.stringify(msg),
		}).catch((error) => {
			log(error, 3, "Webhook", "trem-eq");
			dump({ level: 2, message: error, origin: "Webhook" });
		});
	}
});

ipcRenderer.on("Olddatabase_tsunami", (event, json) => {
	TREM.Earthquake.emit("tsunami", json);
});

TREM.Earthquake.on("tsunami", (data) => {
	console.debug(data);

	if (data.cancel) {
		if (speecd_use) TREM.speech.speak({ text: "海嘯警報已解除" });

		if (TSUNAMI.ALL)
			TSUNAMI.ALL.remove();

		if (TSUNAMI.warnIcon)
			TSUNAMI.warnIcon.remove();
		TSUNAMI = {};

		Mapsmainfocus();
	} else {
		if (speecd_use) TREM.speech.speak({ text: "海嘯警報已發布，請迅速疏散至避難場所" });

		if (data.number == 1) {
			if (setting["report.show"]) win.showInactive();

			if (setting["report.cover"])
				if (!win.isFullScreen()) {
					win.setAlwaysOnTop(true);
					win.focus();
					win.setAlwaysOnTop(false);
				}

			if (setting["audio.report"]) audioPlay("../audio/Water.wav");
			Mapsmainfocus();
		}

		if (!TSUNAMI.warnIcon) {
			const warnIcon = L.icon({
				iconUrl   : "../image/warn.png",
				iconSize  : [30, 30],
				className : "tsunami",
			});
			TSUNAMI.warnIcon = L.marker([+data.lat, +data.lon], { icon: warnIcon }).addTo(Maps.main);
		} else {
			TSUNAMI.warnIcon.setLatLng([+data.lat, +data.lon]);
		}

		const tsunami_level = {};

		const now = new Date(data.time);
		const Now3 = now.getFullYear()
			+ "/" + (now.getMonth() + 1)
			+ "/" + now.getDate()
			+ " " + now.getHours()
			+ ":" + now.getMinutes();

		for (let i = 0; i < data.area.length; i++) {
			if (!data.area[i].arrivalTime) continue;
			new Notification("海嘯警報", {
				body   : `${Now3} 發生地震\n請${data.area[i].areaName}迅速疏散至避難場所`,
				icon   : "../TREM.ico",
				silent : win.isFocused(),
			});
			tsunami_level[data.area[i].areaName] = tsunami_color(data.area[i].waveHeight);
		}

		if (TSUNAMI.ALL)
			TSUNAMI.ALL.remove();
		TSUNAMI.ALL = L.geoJson.vt(MapData.tw_tsunami_area, {
			minZoom   : 4,
			maxZoom   : 12,
			tolerance : 30,
			buffer    : 256,
			debug     : 0,
			zIndex    : 5,
			style     : (args) => {
				if (args.properties) args = args.properties;
				return {
					color       : tsunami_level[args.AREANAME],
					weight      : 3,
					fillColor   : "transparent",
					fillOpacity : 0,
				};
			},
		}).addTo(Maps.main);
		L.DomUtil.addClass(TSUNAMI.ALL._container, "tsunami");
	}
});

function main(data) {
	if (showDialogtime) {
		lockScroll(false);
		$("#modal-overlay").fadeOut(0);
		showDialogtime.close();
	}

	if (TREM.EEW.get(INFO[TINFO]?.ID).Cancel == undefined && ((setting["trem.ps"] && (data.type == "trem-eew" || data.author == "trem")) || (data.author != "trem"))) {
		if (data.depth != null) {

			/**
			 * @type {{p:number,s:number}} wave
			 */

			const wave = { p: 7, s: 4 };

			/**
			 * PS 波已走公尺數
			 * @type {number} kmP
			 * @type {number} km
			 */

			let kmP = 0;
			let km = 0;

			const km_time = (NOW().getTime() - data.time) / 1000;

			const _time_table = TREM.Resources.time[findClosest(TREM.Resources.time_list, data.depth)];
			let prev_table = null;

			for (const table of _time_table) {
				if (!kmP && table.P > km_time)
					if (prev_table) {
						const t_diff = table.P - prev_table.P;
						const r_diff = table.R - prev_table.R;
						const t_offset = km_time - prev_table.P;
						const r_offset = (t_offset / t_diff) * r_diff;
						kmP = prev_table.R + r_offset;
					} else {
						kmP = table.R;
					}

				if (!km && table.S > km_time)
					if (prev_table) {
						const t_diff = table.S - prev_table.S;
						const r_diff = table.R - prev_table.R;
						const t_offset = km_time - prev_table.S;
						const r_offset = (t_offset / t_diff) * r_diff;
						km = prev_table.R + r_offset;
					} else {
						km = table.R;
					}

				if (kmP && km) break;

				prev_table = table;
			}

			if (!kmP) kmP = Math.floor(Math.sqrt(Math.pow(km_time * wave.p, 2) - Math.pow(data.depth, 2)));

			if (!km) km = Math.floor(Math.sqrt(Math.pow(km_time * wave.s, 2) - Math.pow(data.depth, 2)));

			kmP *= 1000;
			km *= 1000;

			// if (kmP === 0 && km === 0) {
			// 	for (let index = 1; index < EarthquakeList[data.id].distance.length; index++)
			// 		if (EarthquakeList[data.id].distance[index].Ptime > (NOW().getTime() - data.time) / 1000) {
			// 			kmP = (index - 1) * 1000;

			// 			if ((index - 1) / EarthquakeList[data.id].distance[index - 1].Ptime > wave.p) kmP = Math.floor(Math.sqrt(Math.pow((NOW().getTime() - data.time) * wave.p, 2) - Math.pow(data.depth * 1000, 2)));
			// 			break;
			// 		}

			// 	for (let index = 1; index < EarthquakeList[data.id].distance.length; index++)
			// 		if (EarthquakeList[data.id].distance[index].Stime > (NOW().getTime() - data.time) / 1000) {
			// 			km = (index - 1) * 1000;

			// 			if ((index - 1) / EarthquakeList[data.id].distance[index - 1].Stime > wave.s) km = Math.floor(Math.sqrt(Math.pow((NOW().getTime() - data.time) * wave.s, 2) - Math.pow(data.depth * 1000, 2)));
			// 			break;
			// 		}
			// }

			if (setting["shock.p"])
				if (kmP > 0) {
					if (!EarthquakeList[data.id].CircleP)
						EarthquakeList[data.id].CircleP = L.circle([+data.lat, +data.lon], {
							color     : "#6FB7B7",
							fillColor : "transparent",
							radius    : kmP,
							renderer  : L.svg(),
							className : "p-wave",
						}).addTo(Maps.main);

					if (!EarthquakeList[data.id].CircleP.getLatLng().equals([+data.lat, +data.lon]))
						EarthquakeList[data.id].CircleP
							.setLatLng([+data.lat, +data.lon]);

					EarthquakeList[data.id].CircleP
						.setRadius(kmP);

					if (!EarthquakeList[data.id].CirclePTW)
						EarthquakeList[data.id].CirclePTW = L.circle([data.lat, data.lon], {
							color     : "#6FB7B7",
							fillColor : "transparent",
							radius    : kmP,
							renderer  : L.svg(),
							className : "p-wave",
						}).addTo(Maps.mini);

					if (!EarthquakeList[data.id].CirclePTW.getLatLng().equals([+data.lat, +data.lon]))
						EarthquakeList[data.id].CirclePTW
							.setLatLng([+data.lat, +data.lon]);

					EarthquakeList[data.id].CirclePTW
						.setRadius(kmP);
				}

			if (km > data.depth * 100) {
				if (TREM.EEW.get(data.id).waveProgress) {
					TREM.EEW.get(data.id).waveProgress.remove();
					delete TREM.EEW.get(data.id).waveProgress;
				}

				eew[data.id].km = km;

				if (!EarthquakeList[data.id].CircleS)
					EarthquakeList[data.id].CircleS = L.circle([+data.lat, +data.lon], {
						color       : data.Alert ? "red" : "orange",
						fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
						fillOpacity : 1,
						radius      : km,
						renderer    : L.svg(),
						className   : "s-wave",
					}).addTo(Maps.main);

				if (!EarthquakeList[data.id].CircleS.getLatLng().equals([+data.lat, +data.lon]))
					EarthquakeList[data.id].CircleS
						.setLatLng([+data.lat, +data.lon]);

				EarthquakeList[data.id].CircleS
					.setRadius(km)
					.setStyle(
						{
							color     : data.Alert ? "red" : "orange",
							fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
						},
					);

				if (!EarthquakeList[data.id].CircleSTW)
					EarthquakeList[data.id].CircleSTW = L.circle([+data.lat, +data.lon], {
						color       : data.Alert ? "red" : "orange",
						fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
						fillOpacity : 1,
						radius      : km,
						renderer    : L.svg(),
						className   : "s-wave",
					}).addTo(Maps.mini);

				if (!EarthquakeList[data.id].CircleSTW.getLatLng().equals([+data.lat, +data.lon]))
					EarthquakeList[data.id].CircleSTW
						.setLatLng([+data.lat, +data.lon]);

				EarthquakeList[data.id].CircleSTW
					.setRadius(km)
					.setStyle(
						{
							color     : data.Alert ? "red" : "orange",
							fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
						},
					);
			} else {
				const num = Math.round(((NOW().getTime() - data.time) / 1000 / TREM.Resources.time[data.depth][0].S) * 100);
				// const num = (NOW().getTime() - data.time) / 10 / EarthquakeList[data.id].distance[1].Stime;
				const icon = L.divIcon({
					className : "progress_bar",
					html      : `<div style="background-color: aqua;height: ${num}%;"></div>`,
					iconSize  : [5, 50],
				});

				if (!TREM.EEW.get(data.id).waveProgress) {
					if (EarthquakeList[data.id].CircleS) {
						EarthquakeList[data.id].CircleS.remove();
						EarthquakeList[data.id].CircleS = null;
					} else if (EarthquakeList[data.id].CircleSTW) {
						EarthquakeList[data.id].CircleSTW.remove();
						EarthquakeList[data.id].CircleSTW = null;
					}

					if (EarthquakeList[data.id].CircleP) {
						EarthquakeList[data.id].CircleP.remove();
						EarthquakeList[data.id].CircleP = null;
					} else if (EarthquakeList[data.id].CirclePTW) {
						EarthquakeList[data.id].CirclePTW.remove();
						EarthquakeList[data.id].CirclePTW = null;
					}

					TREM.EEW.get(data.id).waveProgress = L.marker([+data.lat, +data.lon + 0.15], { icon: icon }).addTo(Maps.main);
				} else {
					TREM.EEW.get(data.id).waveProgress.setIcon(icon);
				}
			}
		}

		if (data.cancel)
			for (let index = 0; index < INFO.length; index++)
				if (INFO[index].ID == data.id) {
					INFO[index].alert_type = "alert-box eew-cancel";
					data.timestamp = NOW().getTime() - ((data.lon < 122.18 && data.lat < 25.47 && data.lon > 118.25 && data.lat > 21.77) ? 90_000 : 150_000);

					if (TREM.EEW.get(data.id).waveProgress) {
						TREM.EEW.get(data.id).waveProgress.remove();
						delete TREM.EEW.get(data.id).waveProgress;
					}

					TREM.Earthquake.emit("eewEnd", data.id);
					TREM.EEW.get(INFO[TINFO].ID).Cancel = true;

					if (Object.keys(EarthquakeList).length == 1) {
						clearInterval(eew[data.id].t);
						audio.main = [];
						audio.minor = [];
					}

					break;
				}
	}

	// #region Epicenter Cross Icon

	let epicenterIcon;
	let offsetX = 0;
	let offsetY = 0;

	const cursor = INFO.findIndex((v) => v.ID == data.id) + 1;
	const iconUrl = cursor <= 4 && INFO.length > 1 ? `../image/cross${cursor}.png` : "../image/cross.png";

	if (cursor <= 4 && INFO.length > 1) {
		epicenterIcon = L.icon({
			iconUrl,
			iconSize  : [40, 40],
			className : "epicenterIcon",
		});

		if (cursor == 1) offsetY = 0.03;

		if (cursor == 2) offsetX = 0.03;

		if (cursor == 3) offsetY = -0.03;

		if (cursor == 4) offsetX = -0.03;

	} else {
		epicenterIcon = L.icon({
			iconUrl,
			iconSize  : [30, 30],
			className : "epicenterIcon",
		});
	}

	let epicenterIcon_tooltip = "";

	// main map
	if (!EarthquakeList[data.id].epicenterIcon) {
		epicenterIcon_tooltip = `<div>${data.Unit}</div><div>注意 ${cursor}</div><div>第 ${data.number} 報</div><div>規模: ${data.scale == null ? "?" : data.scale}</div><div>深度: ${data.depth == null ? "?" : data.depth} km</div>`;
		EarthquakeList[data.id].epicenterIcon = L.marker([+data.lat, +data.lon],
			{
				icon         : epicenterIcon,
				zIndexOffset : 6000,
			})
			.addTo(Maps.main)
			.bindTooltip(epicenterIcon_tooltip, {
				offset    : [8, 0],
				permanent : false,
				className : "eew-cursor-tooltip",
			});
	}

	if (EarthquakeList[data.id].epicenterIcon.getElement().src != iconUrl)
		EarthquakeList[data.id].epicenterIcon.getElement().src = iconUrl;

	EarthquakeList[data.id].epicenterIcon.setLatLng([+data.lat, +data.lon]);

	// mini map
	if (!EarthquakeList[data.id].epicenterIconTW) {
		EarthquakeList[data.id].epicenterIconTW = L.marker([+data.lat + offsetY, +data.lon + offsetX], { icon: epicenterIcon }).addTo(Maps.mini);
		EarthquakeList[data.id].epicenterIconTW.getElement().classList.add("hide");
	}

	if (EarthquakeList[data.id].epicenterIconTW.getIcon()?.options?.iconUrl != epicenterIcon.options.iconUrl)
		EarthquakeList[data.id].epicenterIconTW.setIcon(epicenterIcon);

	if (!EarthquakeList[data.id].epicenterIconTW.getLatLng().equals([+data.lat + offsetY, +data.lon + offsetX]))
		EarthquakeList[data.id].epicenterIconTW.setLatLng([+data.lat + offsetY, +data.lon + offsetX]);

	if (!Timers.epicenterBlinker)
		Timers.epicenterBlinker = setInterval(() => {
			const epicenter_blink_state = EarthquakeList[Object.keys(EarthquakeList)[0]]?.epicenterIconTW?.getElement()?.classList?.contains("hide");

			if (epicenter_blink_state != undefined)
				for (const key in EarthquakeList) {
					const el = EarthquakeList[key];

					// if (epicenter_blink_state) {
					// 	if (el.epicenterIcon.getElement().classList.contains("hide"))
					// 		el.epicenterIcon.getElement().classList.remove("hide");
					// } else if (!el.epicenterIcon.getElement().classList.contains("hide")) {
					// 	el.epicenterIcon.getElement().classList.add("hide");
					// }

					if (key == INFO[TINFO].ID) {
						if (epicenter_blink_state) {
							if (el.epicenterIconTW.getElement().classList.contains("hide"))
								el.epicenterIconTW.getElement().classList.remove("hide");
						} else if (!el.epicenterIconTW.getElement().classList.contains("hide")) {
							el.epicenterIconTW.getElement().classList.add("hide");
						}
					} else if (!el.epicenterIconTW.getElement()?.classList?.contains("hide")) {
						el.epicenterIconTW.getElement().classList.add("hide");
					}
				}
		}, 500);

	// #endregion <- Epicenter Cross Icon


	if (NOW().getTime() - EEWshot > 60000)
		EEWshotC = 1;

	if (NOW().getTime() - EEWshot > 30000 && EEWshotC <= 2) {
		EEWshotC++;
		EEWshot = NOW().getTime();

		if (data.replay_time)
			setTimeout(() => {
				ipcRenderer.send("screenshotEEW", {
					Function : "replay_eew",
					ID       : data.id,
					Version  : data.Version,
					Time     : NOW().getTime(),
					Shot     : EEWshotC,
				});
			}, 300);
		else
			setTimeout(() => {
				ipcRenderer.send("screenshotEEW", {
					Function : "eew",
					ID       : data.id,
					Version  : data.Version,
					Time     : NOW().getTime(),
					Shot     : EEWshotC,
				});
			}, 300);
	}

	if (data.cancel) {
		if (Canceltime == 0) Canceltime = NOW().getTime();

		if (NOW().getTime() - Canceltime > 5_000) Cancel = true;
	}

	if (NOW().getTime() - data.timestamp > 300_000 || Cancel) {
		TREM.Earthquake.emit("eewEnd", data.id, data.type);
		// TREM.MapIntensity.clear();

		// remove epicenter cross icons
		EarthquakeList[data.id].epicenterIcon.remove();
		EarthquakeList[data.id].epicenterIconTW.remove();

		for (let index = 0; index < INFO.length; index++)
			if (INFO[index].ID == data.id) {
				TINFO = 0;
				INFO.splice(index, 1);
				break;
			}

		if (TREM.EEW.get(data.id)?.waveProgress) {
			TREM.EEW.get(data.id).waveProgress.remove();
			delete TREM.EEW.get(data.id).waveProgress;
		}


		if (TREM.EEW.get(data.id)?.geojson) {
			TREM.EEW.get(data.id).geojson.remove();
			delete TREM.EEW.get(data.id).geojson;
		}

		clearInterval(EarthquakeList[data.id].Timer);
		document.getElementById("box-10").innerHTML = "";

		if (eew[data.id].t != null) {
			clearInterval(eew[data.id].t);
			eew[data.id].t = null;
		}

		// if (EarthquakeList[data.id].Depth != null) Maps.main.removeLayer(EarthquakeList[data.id].Depth);
		delete EarthquakeList[data.id];
		delete eew[data.id];

		if (Object.keys(EarthquakeList).length == 0) {
			for (let index = 0, keys = Object.keys(eew), n = keys.length; index < n; index++)
				clearInterval(eew[keys[index]].t);
			audio.main = [];
			arrive = "";
			audio.minor = [];
			eew = {};
			EEWAlert = false;
			// hide eew alert
			Timers.ticker = null;
			Cancel = false;
			Canceltime = 0;
			INFO = [];
			Info = { Notify: [], Warn: [], Focus: [] };
			$("#alert-box").removeClass("show");
			$("#map-legends").removeClass("show");
			// hide minimap
			$("#map-tw").removeClass("show");
			// restore reports
			$(roll).fadeIn(200);
			clearInterval(Timers.epicenterBlinker);
			delete Timers.epicenterBlinker;
			clearInterval(Timers.eew);
			Timers.eew = null;
			rts_remove_eew = false;

			if (ReportTag == 0) stopReplay();
		}
	}
}

function tsunami_color(color) {
	return (color == "大於6公尺") ? "#B131FF" : (color == "3至6公尺") ? "red" : (color == "1至3公尺") ? "#FFEF29" : "#5CEE18";
}

function tsunami_color_int(color) {
	return (color == "大於6公尺") ? 3 : (color == "3至6公尺") ? 2 : (color == "1至3公尺") ? 1 : 0;
}

function clear(ID, type) {
	// if (type != "trem-eew" || type != "trem") {
	if (EarthquakeList[ID].CircleS != undefined) EarthquakeList[ID].CircleS = EarthquakeList[ID].CircleS.remove();

	if (EarthquakeList[ID].CircleP != undefined) EarthquakeList[ID].CircleP = EarthquakeList[ID].CircleP.remove();

	if (EarthquakeList[ID].CircleSTW != undefined) Maps.mini.removeLayer(EarthquakeList[ID].CircleSTW);

	if (EarthquakeList[ID].CirclePTW != undefined) Maps.mini.removeLayer(EarthquakeList[ID].CirclePTW);
	// }
}

function updateText() {
	$("#alert-box")[0].className = `${INFO[TINFO].alert_type} ${IntensityToClassString(INFO[TINFO].alert_intensity)}`;
	$("#alert-local")[0].className = `alert-item ${IntensityToClassString(INFO[TINFO].alert_local)}`;
	$("#alert-provider").text(`${INFO.length > 1 ? `${TINFO + 1} ` : ""}${INFO[TINFO].alert_provider}`);
	$("#alert-number").text(`${INFO[TINFO].alert_number}`);
	$("#alert-location").text(INFO[TINFO].alert_location);
	$("#alert-time").text(timeconvert(INFO[TINFO].alert_time).format("YYYY/MM/DD HH:mm:ss"));
	$("#alert-magnitude").text(INFO[TINFO].alert_magnitude);
	$("#alert-depth").text(INFO[TINFO].alert_depth);
	$("#alert-box").addClass("show");
	$("#map-legends").addClass("show");

	if (TREM.EEW.get(INFO[TINFO].ID).Cancel != undefined) {
		$("#alert-p").text("X");
		$("#alert-s").text("X");
	} else if (INFO[TINFO].alert_sTime == null) {
		$("#alert-p").text("?");
		$("#alert-s").text("?");
	} else {
		let num = Math.floor((INFO[TINFO].alert_sTime - NOW().getTime()) / 1000);

		if (num <= 0) num = "";
		$("#alert-s").text(num);

		num = Math.floor((INFO[TINFO].alert_pTime - NOW().getTime()) / 1000);

		if (num <= 0) num = "";
		$("#alert-p").text(num);
	}

	// bring waves to front
	// if (EarthquakeList[INFO[TINFO].ID].CircleP) EarthquakeList[INFO[TINFO].ID].CircleP.bringToFront();
	// if (EarthquakeList[INFO[TINFO].ID].CircleS) EarthquakeList[INFO[TINFO].ID].CircleS.bringToFront();

	for (const key in EarthquakeList) {
		if (!TREM.EEW.get(key)?.epicenterIconTW?.getElement()?.classList?.contains("hide"))
			TREM.EEW.get(key)?.epicenterIconTW?.getElement()?.classList?.add("hide");

		if (!TREM.EEW.get(key)?.CirclePTW?.getElement()?.classList?.contains("hide"))
			TREM.EEW.get(key)?.CirclePTW?.getElement()?.classList?.add("hide");

		if (!TREM.EEW.get(key)?.CircleSTW?.getElement()?.classList?.contains("hide"))
			TREM.EEW.get(key)?.CircleSTW?.getElement()?.classList?.add("hide");

		if (TREM.EEW.get(key)?.geojson)
			TREM.EEW.get(key).geojson.remove();
	}

	if (TREM.EEW.get(INFO[TINFO].ID).epicenterIconTW) TREM.EEW.get(INFO[TINFO].ID).epicenterIconTW.getElement()?.classList?.remove("hide");

	if (TREM.EEW.get(INFO[TINFO].ID).CirclePTW) TREM.EEW.get(INFO[TINFO].ID).CirclePTW.getElement()?.classList?.remove("hide");

	if (TREM.EEW.get(INFO[TINFO].ID).CircleSTW) TREM.EEW.get(INFO[TINFO].ID).CircleSTW.getElement()?.classList?.remove("hide");

	if (TREM.EEW.get(INFO[TINFO].ID)?.geojson) TREM.EEW.get(INFO[TINFO].ID).geojson.addTo(Maps.mini);

	const Num = Math.round(((NOW().getTime() - INFO[TINFO].Time) * 4 / 10) / INFO[TINFO].Depth);
	const Catch = document.getElementById("box-10");

	if (Num <= 100)
		Catch.innerHTML = `<font color="white" size="6"><b>震波到地表進度: ${Num}%</b></font>`;
	else
		Catch.innerHTML = "";
}

const changeView = (args, el, event) => {
	if (event instanceof KeyboardEvent && event?.key !== "Enter" && event?.key !== " ")
		return;

	const currentel = $(".view.show");
	const changeel = $(`#${args}`);

	if (changeel.attr("id") == currentel.attr("id")) return;

	const currentnav = $(".active");
	currentnav.removeClass("active");
	$(el)?.addClass("active");

	currentel.removeClass("show");
	changeel.addClass("show");

	if (changeel.attr("id") == "report") {
		TREM.Report.api_key_verify = api_key_verify;
		TREM.Report.report_trem = setting["report.trem"];
		TREM.Report.station = station;
		toggleNav(false);
	}

	if (changeel.attr("id") == "intensity")
		toggleNav(false);

	if (changeel.attr("id") == "main") {
		TREM.Report.setView("report-list");
		toggleNav(false);
	}

	TREM.emit("viewChange", currentel.attr("id"), changeel.attr("id"));
};

function findClosest(arr, target) {
	return arr.reduce((prev, curr) => (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev));
}

function NOW() {
	// return new Date(ServerTime + (Date.now() - ((ServerT != 0 && setting["Real-time.websocket"] === "exptech") ? ServerT : ServerT_yayacat)));
	return new Date(Date.now());
}

function timeconvert(time) {
	return new Date(time.toLocaleString("en-US", { hourCycle: "h23", timeZone: "Asia/Taipei" }));
}

function globalgc() {
	global.gc();
}

function WebSocket_close() {
	if (ws.readyState === WebSocket.OPEN)
		ws.close();

	if (ws_yayacat.readyState === WebSocket.OPEN)
		ws_yayacat.close();
}

ipcRenderer.on("app-before-quit", () => {
	// 執行網頁內容關閉前的任務...
	WebSocket_close();
	log("WebSocket_close", 1, "TREM", "quit");

	// 通知主程序已準備好退出
	ipcRenderer.send("app-quit-response");
});

ipcRenderer.on("app-before-reload", () => {
	// 執行網頁內容關閉前的任務...
	WebSocket_close();
	log("WebSocket_close", 1, "TREM", "reload");

	// 通知主程序已準備好退出
	ipcRenderer.send("app-quit-reload");
});