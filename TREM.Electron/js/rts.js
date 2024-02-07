const { getCurrentWindow } = require("@electron/remote");
const echarts = require("echarts");
const Route = require("../js/route.js");
const route = new Route();
const win = getCurrentWindow();

document.onreadystatechange = () => {
	if (document.readyState == "complete")
		handleWindowControls();
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

const wave_count = +localStorage.getItem("displayWaveCount") ?? 8;

let ws = new WebSocket(route.randomWSBaseUrl());
let Reconnect = 0;

let Realtimestation = app.Configuration.data["Real-time.station"];
let Realtimestation1 = app.Configuration.data["Real-time.station.1"];
let Realtimestation2 = app.Configuration.data["Real-time.station.2"];
let Realtimestation3 = app.Configuration.data["Real-time.station.3"];
let Realtimestation4 = app.Configuration.data["Real-time.station.4"];
let Realtimestation5 = app.Configuration.data["Real-time.station.5"];
let themecolor = app.Configuration.data["theme.color"];
let themedark = app.Configuration.data["theme.dark"];

let chartuuids = [
	Realtimestation1,
	Realtimestation2,
	Realtimestation3,
	Realtimestation4,
	Realtimestation5,
	Realtimestation,
];

let WS_rtw;
let ServerT_rtw = 0;

function reconnect() {
	if (Date.now() - Reconnect < 500) return;
	Reconnect = Date.now();

	if (ws != null) {
		ws.close();
		ws = null;
	}

	ws = new WebSocket(route.randomWSBaseUrl());
	connect(1000);
}

const connect = (retryTimeout) => {
	ws.onclose = function() {
		console.log(`WebSocket closed. Reconnect after ${retryTimeout / 1000}s`);
		WS_rtw = false;
		reconnect();
	};

	ws.onerror = function(err) {
		console.log(err);
		WS_rtw = false;
		reconnect();
	};

	ws.onopen = function() {
		const key = app.Configuration.data["rtw.key.only"] ? (app.Configuration.data["rtw.api.key"] != "" ? app.Configuration.data["rtw.api.key"] : "") : (app.Configuration.data["api.key"] != "" ? app.Configuration.data["api.key"] : "");
		ws.send(JSON.stringify({
			type    : "start",
			key     : key,
			service : ["trem.rtw"],
			config  : {
				"trem.rtw": [
					parseInt(Realtimestation1.split("-")[2]),
					parseInt(Realtimestation2.split("-")[2]),
					parseInt(Realtimestation3.split("-")[2]),
					parseInt(Realtimestation4.split("-")[2]),
					parseInt(Realtimestation5.split("-")[2]),
					parseInt(Realtimestation.split("-")[2]),
				],
			},
		}));
	};

	ws.onmessage = function(raw) {
		const parsed = JSON.parse(raw.data);
		WS_rtw = true;
		ServerT_rtw = Date.now();

		// console.log(parsed);

		switch (parsed.type) {
			case "data": {
				switch (parsed.data.type) {
					case "rtw": {
						wave(parsed.data);
						break;
					}
				}

				break;
			}

			default: break;
		}
	};
};

const data = {
	stations: {},
};
const timer = {};

const Real_time_station_run = () => {
	chartuuids = [
		Realtimestation1,
		Realtimestation2,
		Realtimestation3,
		Realtimestation4,
		Realtimestation5,
		Realtimestation,
	];
	const key = app.Configuration.data["rtw.key.only"] ? (app.Configuration.data["rtw.api.key"] != "" ? app.Configuration.data["rtw.api.key"] : "") : (app.Configuration.data["api.key"] != "" ? app.Configuration.data["api.key"] : "");
	ws.send(JSON.stringify({
		type    : "start",
		key     : key,
		service : ["trem.rtw"],
		config  : {
			"trem.rtw": [
				parseInt(Realtimestation1.split("-")[2]),
				parseInt(Realtimestation2.split("-")[2]),
				parseInt(Realtimestation3.split("-")[2]),
				parseInt(Realtimestation4.split("-")[2]),
				parseInt(Realtimestation5.split("-")[2]),
				parseInt(Realtimestation.split("-")[2]),
			],
		},
	}));
	setCharts([
		Realtimestation1.split("-")[2],
		Realtimestation2.split("-")[2],
		Realtimestation3.split("-")[2],
		Realtimestation4.split("-")[2],
		Realtimestation5.split("-")[2],
		Realtimestation.split("-")[2],
	]);
};

const Real_time_station = () => {
	try {
		if (Realtimestation != app.Configuration.data["Real-time.station"]) {
			Realtimestation = app.Configuration.data["Real-time.station"];
			Real_time_station_run();
		} else if (Realtimestation1 != app.Configuration.data["Real-time.station.1"]) {
			Realtimestation1 = app.Configuration.data["Real-time.station.1"];
			Real_time_station_run();
		} else if (Realtimestation2 != app.Configuration.data["Real-time.station.2"]) {
			Realtimestation2 = app.Configuration.data["Real-time.station.2"];
			Real_time_station_run();
		} else if (Realtimestation3 != app.Configuration.data["Real-time.station.3"]) {
			Realtimestation3 = app.Configuration.data["Real-time.station.3"];
			Real_time_station_run();
		} else if (Realtimestation4 != app.Configuration.data["Real-time.station.4"]) {
			Realtimestation4 = app.Configuration.data["Real-time.station.4"];
			Real_time_station_run();
		} else if (Realtimestation5 != app.Configuration.data["Real-time.station.5"]) {
			Realtimestation5 = app.Configuration.data["Real-time.station.5"];
			Real_time_station_run();
		} else if (themecolor != app.Configuration.data["theme.color"]) {
			themecolor = app.Configuration.data["theme.color"];
			setCharts([
				Realtimestation1.split("-")[2],
				Realtimestation2.split("-")[2],
				Realtimestation3.split("-")[2],
				Realtimestation4.split("-")[2],
				Realtimestation5.split("-")[2],
				Realtimestation.split("-")[2],
			]);
		} else if (themedark != app.Configuration.data["theme.dark"]) {
			themedark = app.Configuration.data["theme.dark"];
			setCharts([
				Realtimestation1.split("-")[2],
				Realtimestation2.split("-")[2],
				Realtimestation3.split("-")[2],
				Realtimestation4.split("-")[2],
				Realtimestation5.split("-")[2],
				Realtimestation.split("-")[2],
			]);
		}
	} catch (error) {
		console.warn("Failed to load station data!", error);
	}
};

const fetch_files = async () => {
	try {
		let res;
		const s = {};

		if (app.Configuration.data["Real-time.local"]) res = require(path.resolve(__dirname, "../station.json"));
		else res = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();

		if (!res) res = await (await fetch("https://cdn.jsdelivr.net/gh/ExpTechTW/API@master/Json/earthquake/station.json")).json();

		if (!res) res = await (await fetch("https://exptech.com.tw/api/v1/file?path=/resource/station.json")).json();

		if (res) {
			for (let i = 0, k = Object.keys(res), n = k.length; i < n; i++) {
				const id = k[i];

				if (res[id].Long > 118)
					s[id.split("-")[2]] = { uuid: id, ...res[id] };
			}

			data.stations = s;
		}
	} catch (error) {
		console.warn("Failed to load station data!", error);
	}
};

const charts = [
	echarts.init(document.getElementById("wave-1"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-2"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-3"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-4"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-5"), null, { height: 560 / 6, width: 400 }),
	echarts.init(document.getElementById("wave-6"), null, { height: 560 / 6, width: 400 }),
];
const chartdata = [
	[],
	[],
	[],
	[],
	[],
	[],
];

for (let i = 0; i < wave_count; i++) {
	const dom = document.createElement("div");
	document.getElementById("wave-container").append(dom);
	charts.push(echarts.init(dom, null, { height: 560 / wave_count, width: 400 }));
	chartdata.push([]);
}

/**
 * @param {string[]} ids
 */
const setCharts = (ids) => {
	for (let i = 0; i < 6; i++)
		if (data.stations?.[ids[i]]?.uuid) {
			if (chartuuids[i] != data.stations[ids[i]].uuid) {
				chartuuids[i] = data.stations[ids[i]].uuid;
				chartdata[i] = [];
			}

			charts[i].setOption({
				title: {
					text: `${data.stations[ids[i]].Loc} | ${chartuuids[i]}`,
				},
			});
		} else {
			chartuuids.splice(i, 1);
			charts[i].clear();
			charts[i].setOption({
				title: {
					textStyle: {
						fontSize : 10,
						color    : (themedark ? "rgb(230, 225, 229)" : "rgb(26, 28, 25)"),
					},
				},
				xAxis: {
					type      : "time",
					splitLine : {
						show: false,
					},
					show: false,
				},
				yAxis: {
					type      : "value",
					animation : false,
					splitLine : {
						show: false,
					},
					axisLabel: {
						interval : 1,
						fontSize : 10,
					},
				},
				grid: {
					top    : 16,
					right  : 0,
					bottom : 0,
				},
				series: [
					{
						type       : "line",
						showSymbol : false,
						data       : [],
						color      : themecolor,
					},
				],
			});
		}
};

const wave = (wave_data) => {
	// console.log(wave_data);

	const time = wave_data.time;
	const wave_data_id = wave_data.id;
	const n = wave_data.Z.length;
	const timeOffset = 500 / n;
	const now = new Date(Date.now());

	const arr = [];

	let id;

	for (const i in chartuuids)
		if (parseInt(chartuuids[i].split("-")[2]) === wave_data_id)
			id = i;


	for (let i = 0; i < n; i++) {
		const calculatedTime = time + (i * timeOffset);
		chartdata[id].push({
			name  : now.getTime(),
			value : [new Date(calculatedTime).getTime(), Math.round(+wave_data.Z[i] * 1000)],
		});
	}

	while (true)
		if (chartdata[id].length > (chartuuids[id].startsWith("H") ? 2950 : 1180)) {
			chartdata[id].shift();
		} else if (chartdata[id].length == (chartuuids[id].startsWith("H") ? 2950 : 1180)) {
			break;
		} else if (chartdata[id].length != (chartuuids[id].startsWith("H") ? 2950 : 1180)) {
			chartdata[id].shift();
			chartdata[id].unshift({
				name  : new Date(time - 60_000).getTime(),
				value : [new Date(time - 60_000).getTime(), null],
			});
			break;
		}

	const values = chartdata[id].map(v => v.value[1]);
	const maxmin = Math.max(Math.abs(Math.max(...values)), Math.abs(Math.min(...values)));

	charts[id].setOption({
		animation : false,
		yAxis     : {
			max : maxmin < (chartuuids[id].startsWith("H") ? 1 : 1000) ? (chartuuids[id].startsWith("H") ? 1 : 1000) : maxmin,
			min : -(maxmin < (chartuuids[id].startsWith("H") ? 1 : 1000) ? (chartuuids[id].startsWith("H") ? 1 : 1000) : maxmin),
		},
		series: [
			{
				type : "line",
				data : chartdata[id],
			},
		],
	});
};

async function init() {
	connect(1000);

	if (!timer.WS_rtw)
		timer.WS_rtw = setInterval(() => {
			if ((Date.now() - ServerT_rtw > 60_000 && ServerT_rtw != 0) && !WS_rtw) reconnect();
		}, 3000);
	await (async () => {
		await fetch_files();

		if (!timer.stations)
			timer.stations = setInterval(fetch_files, 300_000);

		if (!timer.Realtimestation)
			timer.Realtimestation = setInterval(Real_time_station, 1_000);
	})().catch(e => {
		log(e, 3, "rts", "init");
		dump({ level: 2, message: e });
	});
	setCharts([
		Realtimestation1.split("-")[2],
		Realtimestation2.split("-")[2],
		Realtimestation3.split("-")[2],
		Realtimestation4.split("-")[2],
		Realtimestation5.split("-")[2],
		Realtimestation.split("-")[2],
	]);
	for (const chart of charts)
		chart.setOption({
			title: {
				textStyle: {
					fontSize : 10,
					color    : (themedark ? "rgb(230, 225, 229)" : "rgb(26, 28, 25)"),
				},
			},
			xAxis: {
				type      : "time",
				splitLine : {
					show: false,
				},
				show: false,
			},
			yAxis: {
				type      : "value",
				animation : false,
				splitLine : {
					show: false,
				},
				axisLabel: {
					interval : 1,
					fontSize : 10,
				},
			},
			grid: {
				top    : 16,
				right  : 0,
				bottom : 0,
			},
			series: [
				{
					type       : "line",
					showSymbol : false,
					data       : [],
					color      : themecolor,
				},
			],
		});
}