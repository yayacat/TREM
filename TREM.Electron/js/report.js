/* global maplibregl:false, Maps: false, IntensityToClassString: false, Maps.report: true, IntensityI: false, changeView: false, replay: true, replayT: true */

TREM.Report = {
	cache               : new Map(),
	view                : "report-list",
	reportList          : [],
	reportListElement   : document.getElementById("report-list-container"),
	lock                : false,
	clock               : null,
	api_key_verify      : false,
	station             : {},
	report_trem         : false,
	report_trem_station : {},
	report_trem_data    : [],
	report_eew_data     : [],
	report_station      : {},
	epicenterIcon       : null,
	report_circle_trem  : null,
	report_circle_cwb   : null,
	report_circle_rf    : null,
	replayHttp          : false,
	route               : route,

	/**
	 * @type {maplibregl.Marker[]}
	 */
	_markersTREM          : [],
	_markers              : [],
	_markersGroup         : null,
	_lastFocus            : [],
	_filterHasReplay      : false,
	_filterHasNumber      : false,
	_filterMagnitude      : false,
	_filterMagnitudeValue : 5,
	_filterIntensity      : false,
	_filterIntensityValue : 4,
	_filterTREM           : false,
	_filterCWA            : true,
	_filterDate           : false,
	_filterDateValue      : "",
	_filterMonth          : false,
	_filterMonthValue     : "",
	_reportItemTemplate   : document.getElementById("template-report-list-item"),
	_report_trem_data     : storage.getItem("report_trem_data") ?? [],
	_report_eew_data      : storage.getItem("report_eew_data") ?? [],
	_report_Temp          : null,
	get _mapPaddingLeft() {
		return document.getElementById("map-report").offsetWidth / 2;
	},
	unloadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) {
			this.reportListElement.replaceChildren();
			this._clearMap();
		}
	},
	loadReports(skipCheck = false) {
		if (this.view == "report-list" || skipCheck) {
			const fragment = new DocumentFragment();
			const reports = Array.from(this.cache, ([k, v]) => v);

			for (const report of reports)
				if (!report.originTime) {
					const now_format = (time) => new Date(time.toLocaleString("en-US", { hourCycle: "h23", timeZone: "Asia/Taipei" })).format("YYYY/MM/DD HH:mm:ss");
					report.originTime = now_format(new Date(report.time));
					this.cache.set(report.id, report);

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
				}

			this.reportList = reports
				.filter(v => this._filterHasNumber ? (v.earthquakeNo ? v.earthquakeNo % 1000 != 0 : v.no % 1000 != 0) : true)
				.filter(v => this._filterHasReplay ? v.ID?.length : true)
				.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == -1 ? v.magnitudeValue == 0.0 : this._filterMagnitudeValue == 0 ? v.magnitudeValue < 1.0 : this._filterMagnitudeValue == 1 ? v.magnitudeValue < 2.0 : this._filterMagnitudeValue == 2 ? v.magnitudeValue < 3.0 : this._filterMagnitudeValue == 3 ? v.magnitudeValue < 4.0 : this._filterMagnitudeValue == 45 ? v.magnitudeValue < 4.5 : v.magnitudeValue >= 4.5 : true)
				.filter(v => this._filterIntensity ? (v.data ? v.data[0]?.areaIntensity == this._filterIntensityValue : v.int == this._filterIntensityValue) : true)
				.filter(v => this._filterTREM ? (v.location ? v.location.startsWith("地震資訊") : v.loc.startsWith("地震資訊")) : true)
				.filter(v => this._filterCWA ? (v.identifier ? (v.identifier.startsWith("CWA") || v.identifier.startsWith("CWB")) : v.id.match(/-/g).length === 3) : true)
				.filter(v => this._filterDate ? v.originTime.split(" ")[0] == this._filterDateValue : true)
				.filter(v => this._filterMonth ? (v.originTime ? ((v.originTime.split(" ")[0].split("/")[0] + "/" + v.originTime.split(" ")[0].split("/")[1]) == this._filterMonthValue) : false) : false);

			for (const report of reports) {
				// if (setting["exptech.key"] == "" && report.data[0].areaIntensity == 0) continue;
				const element = this._createReportItem(report);

				if (report.mag) report.magnitudeValue = report.mag;

				if (
					(this._filterHasNumber && !(report.earthquakeNo ? report.earthquakeNo % 1000 : report.no % 1000))
					|| (this._filterHasReplay && !(report.ID?.length))
					|| (this._filterMagnitude && !(this._filterMagnitudeValue == -1 ? report.magnitudeValue == 0.0 : this._filterMagnitudeValue == 0 ? report.magnitudeValue < 1.0 : this._filterMagnitudeValue == 1 ? report.magnitudeValue < 2.0 : this._filterMagnitudeValue == 2 ? report.magnitudeValue < 3.0 : this._filterMagnitudeValue == 3 ? report.magnitudeValue < 4.0 : this._filterMagnitudeValue == 45 ? report.magnitudeValue < 4.5 : report.magnitudeValue >= 4.5))
					|| (this._filterIntensity && !(report.data ? report.data[0]?.areaIntensity == this._filterIntensityValue : report.int == this._filterIntensityValue))
					|| (this._filterTREM && !(report.location ? report.location.startsWith("地震資訊") : report.loc.startsWith("地震資訊")))
					|| (this._filterCWA && !(report.identifier ? (report.identifier.startsWith("CWA") || report.identifier.startsWith("CWB")) : report.id.match(/-/g).length === 3))
					|| (this._filterDate && !(report.originTime.split(" ")[0] == this._filterDateValue))
					|| (this._filterMonth && !((report.originTime.split(" ")[0].split("/")[0] + "/" + report.originTime.split(" ")[0].split("/")[1]) == this._filterMonthValue))) {
					element.classList.add("hide");
					element.style.display = "none";
				} else {
					this._markers.push(L.marker(
						[report.epicenterLat ?? report.lat, report.epicenterLon ?? report.lon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.oldcross,
								iconSize  : [(report.magnitudeValue * 4) ?? (report.mag * 4), (report.magnitudeValue * 4) ?? (report.mag * 4)],
								className : `epicenterIcon ${report.data ? IntensityToClassString(report.data[0]?.areaIntensity) : IntensityToClassString(report.int)}`,
							}),
							opacity      : (reports.length - reports.indexOf(report)) / reports.length,
							zIndexOffset : 1000 + reports.length - reports.indexOf(report),
						})
						.on("click", () => {
							TREM.set_report_overview = 0;
							this.setView("report-overview", report.identifier ?? report.id);
						}));
					this._markersGroup = L.featureGroup(this._markers).addTo(Maps.report);
				}

				fragment.appendChild(element);
			}

			document.getElementById("report-detail-header-number").innerText = `共 ${this.reportList.length} 個`;
			this.reportListElement.appendChild(fragment);
		}
	},
	_createReportItem(report) {
		const el = document.importNode(this._reportItemTemplate.content, true).querySelector(".report-list-item");

		if (report.data) {
			el.id = report.identifier;
			el.className += ` ${IntensityToClassString(report.data[0]?.areaIntensity)}`;
			el.querySelector(".report-list-item-location").innerText = report.location;
			el.querySelector(".report-list-item-id").innerText = TREM.Localization.getString(report.location.startsWith("地震資訊") ? "Report_Title_Local" : (report.earthquakeNo % 1000 ? report.earthquakeNo : "Report_Title_Small"));
			el.querySelector(".report-list-item-unit-Magnitude").innerText = (report.location.startsWith("地震資訊")) ? "d" : "L";
			el.querySelector(".report-list-item-Magnitude").innerText = report.magnitudeValue == 0 ? "0.0" : report.magnitudeValue;
			el.querySelector(".report-list-item-time").innerText = report.originTime.replace(/-/g, "/");

			el.querySelector("button").value = report.identifier;
			el.querySelector("button").addEventListener("click", function() {
				TREM.Report.setView("report-overview", this.value);
			});
			ripple(el.querySelector("button"));
		} else {
			el.id = report.id;
			el.className += ` ${IntensityToClassString(report.int)}`;
			el.querySelector(".report-list-item-location").innerText = report.loc;
			el.querySelector(".report-list-item-id").innerText = TREM.Localization.getString(report.loc.startsWith("地震資訊") ? "Report_Title_Local" : (report.no % 1000 ? report.no : "Report_Title_Small"));
			el.querySelector(".report-list-item-unit-Magnitude").innerText = (report.loc.startsWith("地震資訊")) ? "d" : "L";
			el.querySelector(".report-list-item-Magnitude").innerText = report.mag == 0 ? "0.0" : report.mag;
			const time = new Date(new Date(report.time).toLocaleString("en-US", { hourCycle: "h23", timeZone: "Asia/Taipei" })).format("YYYY/MM/DD HH:mm:ss");
			el.querySelector(".report-list-item-time").innerText = time;

			el.querySelector("button").value = report.id;
			el.querySelector("button").addEventListener("click", function() {
				TREM.Report.setView("report-overview", this.value);
			});
			ripple(el.querySelector("button"));
		}

		return el;
	},

	/**
	 * @param {*} key
	 * @param {*} value
	 * @param {HTMLSelectElement} select
	 */
	_handleFilter(key, value, select) {
		const oldlist = [...this.reportList];
		this[`_${key}`] = value;

		if (key == "filterTREM" && value) {
			const element = document.getElementById("report-label-filter-hasNumber");
			element.classList.add("hide");
			element.style.display = "none";
			const element1 = document.getElementById("report-label-filter-intensity");
			element1.classList.add("hide");
			element1.style.display = "none";
			const element2 = document.getElementById("report-label-filter-CWA");
			element2.classList.add("hide");
			element2.style.display = "none";
			this._filterHasNumber = false;
			this._filterIntensity = false;
			this._filterCWA = false;
		} else if (key == "filterTREM" && !value) {
			const element = document.getElementById("report-label-filter-hasNumber");
			element.classList.remove("hide");
			element.style.display = "block";
			const element1 = document.getElementById("report-label-filter-intensity");
			element1.classList.remove("hide");
			element1.style.display = "block";
			const element2 = document.getElementById("report-label-filter-CWA");
			element2.classList.remove("hide");
			element2.style.display = "block";
			this._filterCWA = true;
			const element3 = document.getElementById("report-filter-CWA");
			element3.checked = true;
			const element5 = document.getElementById("report-filter-hasNumber");
			element5.checked = false;
			const element6 = document.getElementById("report-filter-intensity");
			element6.checked = false;
		}

		if (select) {
			const parent = document.getElementById(select.id.slice(0, select.id.length - 6));

			if (!parent.checked)
				return parent.click();
		}

		this._filterDateValue = this._filterDateValue.replace(/-/g, "/");
		this._filterMonthValue = this._filterMonthValue.replace(/-/g, "/");

		this.reportList = Array.from(this.cache, ([k, v]) => v)
			.filter(v => this._filterHasNumber ? (v.earthquakeNo ? v.earthquakeNo % 1000 != 0 : v.no % 1000 != 0) : true)
			.filter(v => this._filterHasReplay ? v.ID?.length : true)
			.filter(v => this._filterMagnitude ? this._filterMagnitudeValue == -1 ? v.magnitudeValue == 0.0 : this._filterMagnitudeValue == 0 ? v.magnitudeValue < 1.0 : this._filterMagnitudeValue == 1 ? v.magnitudeValue < 2.0 : this._filterMagnitudeValue == 2 ? v.magnitudeValue < 3.0 : this._filterMagnitudeValue == 3 ? v.magnitudeValue < 4.0 : this._filterMagnitudeValue == 45 ? v.magnitudeValue < 4.5 : v.magnitudeValue >= 4.5 : true)
			.filter(v => this._filterIntensity ? (v.data ? v.data[0]?.areaIntensity == this._filterIntensityValue : v.int == this._filterIntensityValue) : true)
			.filter(v => this._filterTREM ? (v.location ? v.location.startsWith("地震資訊") : v.loc.startsWith("地震資訊")) : true)
			.filter(v => this._filterCWA ? (v.identifier ? (v.identifier.startsWith("CWA") || v.identifier.startsWith("CWB")) : v.id.match(/-/g).length === 3) : true)
			.filter(v => this._filterDate ? v.originTime.split(" ")[0] == this._filterDateValue : true)
			.filter(v => this._filterMonth ? (v.originTime.split(" ")[0].split("/")[0] + "/" + v.originTime.split(" ")[0].split("/")[1]) == this._filterMonthValue : true);

		document.getElementById("report-detail-header-number").innerText = `共 ${this.reportList.length} 個`;
		this._updateReports(oldlist, this.reportList);
	},
	setView(view, reportIdentifier) {
		if (this.view == view)
			if (!reportIdentifier)
				return;

		const oldView = document.getElementById(this.view);
		let newView = document.getElementById(view);

		document.getElementById("report-detail-body").style.height = `${oldView.offsetHeight + 16 }px`;
		document.getElementById("report-detail-body").style.width = `${oldView.offsetWidth + 16 }px`;

		switch (view) {
			case "report-list": {
				this._clearMap(true);
				this.loadReports(true);
				this._focusMap();
				this._setup_api_key_verify();
				document.getElementById("report-detail-back").classList.add("hide");
				document.getElementById("report-detail-refresh").classList.remove("hide");
				document.getElementById("report-detail-header-number").style.display = "";
				break;
			}

			case "report-overview": {
				if (this.view == "report-list") this.unloadReports(true);
				this._setupReport(this.cache.get(reportIdentifier));
				document.getElementById("report-detail-back").classList.remove("hide");
				document.getElementById("report-detail-refresh").classList.add("hide");
				document.getElementById("report-detail-header-number").style.display = "none";
				break;
			}

			case "eq-report-overview": {
				if (this.view == "report-list") this.unloadReports(true);
				this._setupReport(reportIdentifier);
				document.getElementById("report-detail-back").classList.remove("hide");
				document.getElementById("report-detail-refresh").classList.add("hide");
				document.getElementById("report-detail-header-number").style.display = "none";
				break;
			}

			default:
				break;
		}

		if (view == "eq-report-overview") {
			view = "report-overview";
			newView = document.getElementById(view);
		}

		if (this.view != view) {
			oldView.classList.remove("show");
			newView.style.position = "absolute";
			newView.style.visibility = "visible";
			document.getElementById("report-detail-body").style.height = `${newView.offsetHeight + 16 }px`;
			document.getElementById("report-detail-body").style.width = `${newView.offsetWidth + 16 }px`;
			setTimeout(() => {
				oldView.style.visibility = "hidden";
				newView.classList.add("show");
			}, 250);
		}

		setTimeout(() => {
			newView.style.position = "";
			document.getElementById("report-detail-body").style.height = "";
			document.getElementById("report-detail-body").style.width = "";
		}, 500);

		this.view = view;
	},
	replay(id) {
		const report = this.cache.get(id);

		if (replay != 0) return;
		changeView("main", "#mainView_btn");

		// let list = [];

		if (report.download) {
			const oldtime = new Date(report.originTime.replace(/-/g, "/")).getTime();
			ipcRenderer.send("testoldtime", oldtime);
		}

		// if (report.ID.length) {
		// 	list = list.concat(report.ID);
		// 	ipcRenderer.send("testEEW", list);
		// }

		// if (report.trem) {
		// 	list = list.concat(report.trem);
		// 	ipcRenderer.send("testEEW", list);
		// }

		if (!report.download || !report.ID.length || !report.trem) {
			this.replayHttp = true;
			const oldtime = new Date(report.originTime.replace(/-/g, "/")).getTime();
			ipcRenderer.send("testoldtimeEEW", oldtime);
		}
	},
	replaydownloader(id) {
		if (this.lock) return;

		this.lock = true;
		const report = this.cache.get(id);
		console.debug(report);

		let time = new Date(report.originTime.replace(/-/g, "/")).getTime() - 5000;
		const time_hold = String(time / 1000);
		const _end_time = time + 205000;

		const downloader_progress = document.getElementById("downloader_progress");
		const progressStep = 206;
		let progresstemp = 0;

		fs.mkdirSync(path.join(path.join(app.getPath("userData"), "replay_data"), time_hold), { recursive: true });

		if (ReportTag) ReportTag = 0;

		if (!report.download) {
			document.getElementById("report-replay-downloader-text").innerText = "下載中...";
			this.clock = setInterval(() => {
				if (report.download) return;

				if (time > _end_time) {
					clearInterval(this.clock);
					console.debug("Finish!");
					document.getElementById("report-replay-downloader-icon").innerText = "download_done";
					document.getElementById("report-replay-downloader-text").innerText = "下載完成!";
					downloader_progress.style.display = "none";
					report.download = true;
					this.cache.set(report.identifier, report);
					this.lock = false;
					return;
				}

				const result = {
					rts : {},
					eew : {
						eew  : [],
						time : time,
					},
				};
				const gettime = time / 1000;
				fetch(this.route.rtsReplay(1, time))
					.then((res) => {
						if (res.ok) {
							// console.debug(res);
							res.json().then(res1 => {
								// console.debug(res1);
								result.rts = res1;
								fetch(this.route.eewReplay(1, time))
									.then((res0) => {
										if (res0.ok) {
											// console.debug(res);
											res0.json().then(res2 => {
												result.eew = res2;
												fs.writeFile(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${gettime}.trem`, JSON.stringify(result), () => {
													time += 1000;

													if (!report.download) {
														progresstemp += (1 / progressStep) * 1;
														downloader_progress.value = progresstemp;
														downloader_progress.title = `${Math.round(progresstemp * 10000) / 100}%`;
														downloader_progress.style.display = "";
													}
												});
											});
										} else {
											console.error(res0);

											switch (res0.status) {
												case 429: {
													log(res0.status, 3, "replaydownloader", "Report");
													dump({ level: 2, message: res0.status });
													break;
												}

												case 404: {
													log(res0.status, 3, "replaydownloader", "Report");
													dump({ level: 2, message: res0.status });
													time += 1000;
													break;
												}

												case 500: {
													log(res.status, 3, "replaydownloader", "Report");
													dump({ level: 2, message: res.status });
													break;
												}

												default: break;
											}
										}
									}).catch(err => {
										this.lock = false;
										console.log(err.message);
										log(err, 3, "replaydownloader", "Report");
										dump({ level: 2, message: err });
									});
							});
						} else {
							console.error(res);

							switch (res.status) {
								case 429: {
									log(res.status, 3, "replaydownloader", "Report");
									dump({ level: 2, message: res.status });
									break;
								}

								case 404: {
									log(res.status, 3, "replaydownloader", "Report");
									dump({ level: 2, message: res.status });
									time += 1000;
									break;
								}

								case 500: {
									log(res.status, 3, "replaydownloader", "Report");
									dump({ level: 2, message: res.status });
									break;
								}

								default: break;
							}
						}
					}).catch(err => {
						this.lock = false;
						console.log(err.message);
						log(err, 3, "replaydownloader", "Report");
						dump({ level: 2, message: err });
					});
			}, 500);
		} else {
			downloader_progress.style.display = "none";
			console.debug("Finish!(is download)");
			this.lock = false;
		}
	},
	replaydownloaderrm(id) {
		const report = this.cache.get(id);
		const time = new Date(report.originTime.replace(/-/g, "/")).getTime() - 5000;
		const time_hold = String(time / 1000);

		fs.rm(path.join(path.join(app.getPath("userData"), "replay_data"), time_hold), { recursive: true }, () => {
			document.getElementById("report-replay-downloader-icon").innerText = "download";
			document.getElementById("report-replay-downloader-text").innerText = "下載";
			document.getElementById("downloader_progress").style.display = "none";
			report.download = false;
			this.cache.set(report.identifier, report);

			if (this.lock) {
				this.lock = false;
				clearInterval(this.clock);
			}
		});
	},
	back() {
		if (TREM.set_report_overview != 0)
			TREM.backindexButton();

		switch (this.view) {
			case "report-overview":
				this.setView("report-list");
				break;

			default:
				break;
		}
	},
	refreshList() {
		this.unloadReports();
		this.loadReports();
		this._focusMap();
		this._setup_api_key_verify();
	},
	copyReport(id) {
		const report = this.cache.get(id);
		const string = [];

		if (report.location)
			string.push(`　　　　　　　　　　${report.location.startsWith("地震資訊") ? "地震資訊" : "中央氣象署"}地震測報中心　${TREM.Localization.getString(report.location.startsWith("地震資訊") ? "Report_Title_Local" : (report.earthquakeNo % 1000 ? `第${report.earthquakeNo.toString().slice(-3)}號有感地震報告` : "Report_Title_Small"))}`);
		else if (report.loc)
			string.push(`　　　　　　　　　　${report.loc.startsWith("地震資訊") ? "地震資訊" : "中央氣象署"}地震測報中心　${TREM.Localization.getString(report.loc.startsWith("地震資訊") ? "Report_Title_Local" : (report.no % 1000 ? `第${report.no.toString().slice(-3)}號有感地震報告` : "Report_Title_Small"))}`);

		const time = new Date(report.originTime);
		string.push(`　　　　　　　　　　發　震　時　間： ${time.getFullYear() - 1911}年${(time.getMonth() + 1 < 10 ? " " : "") + (time.getMonth() + 1)}月${(time.getDate() < 10 ? " " : "") + time.getDate()}日${(time.getHours() < 10 ? " " : "") + time.getHours()}時${(time.getMinutes() < 10 ? " " : "") + time.getMinutes()}分${(time.getSeconds() < 10 ? " " : "") + time.getSeconds()}秒`);
		string.push(`　　　　　　　　　　震　央　位　置： 北　緯　 ${report.epicenterLat ? report.epicenterLat.toFixed(2) : report.lat.toFixed(2)} °`);
		string.push(`　　　　　　　　　　　　　　　　　　 東  經　${report.epicenterLon ? report.epicenterLon.toFixed(2) : report.lon.toFixed(2)} °`);
		string.push(`　　　　　　　　　　震　源　深　度：　 ${report.depth < 10 ? " " : ""}${report.depth.toFixed(1)}  公里`);
		string.push(`　　　　　　　　　　芮　氏　規　模：　  ${report.magnitudeValue ? report.magnitudeValue.toFixed(1) : report.mag.toFixed(1)}`);
		string.push(`　　　　　　　　　　相　對　位　置： ${report.location ?? report.loc}`);
		string.push("");
		string.push("                                 各 地 震 度 級");
		string.push("");

		const name = (text) => text.length < 3 ? text.split("").join("　") : text;
		const int = (number) => `${IntensityI(number)}級`.replace("-級", "弱").replace("+級", "強");
		const areas = [];

		if (report.data)
			for (const areaData of report.data) {
				const areaString = [];
				areaString.push(`${areaData.areaName}地區最大震度 ${int(areaData.areaIntensity)}`);
				for (const stationData of areaData.eqStation)
					areaString.push(`　　　${name(stationData.stationName)} ${int(stationData.stationIntensity)}　　　`);

				areas.push(areaString);
			}
		else if (report.list)
			for (let index = 0, keys = Object.keys(report.list), n = keys.length; index < n; index++) {
				const areaString = [];
				areaString.push(`${keys[index]}地區最大震度 ${int(report.list[keys[index]].int)}`);

				for (let station_index = 0, station_keys = Object.keys(report.list[keys[index]].town), o = station_keys.length; station_index < o; station_index++)
					areaString.push(`　　　${name(station_keys[station_index])} ${int(report.list[keys[index]].town[station_keys[station_index]].int)}　　　`);

				areas.push(areaString);
			}

		let count = areas.length;

		if (count > 2)
			while (count > 0) {
				const threeAreas = [
					areas.shift(),
					areas.shift(),
					areas.shift(),
				];
				const whichToLoop = threeAreas[threeAreas.reduce((p, c, i, a) => a[p]?.length > c?.length ? p : i, 0)];
				const theLine = [];

				for (const index in whichToLoop) {
					const a = threeAreas[0][index];
					const b = threeAreas[1][index];
					const c = threeAreas[2][index];
					let strToPush = "";

					if (a)
						strToPush += a;
					else
						strToPush += "　　　　　　　　　　　";

					if (b)
						strToPush += `　　　${b}`;
					else
						strToPush += "　　　　　　　　　　　　　　";

					if (c)
						strToPush += `　　　${c}`;
					else
						strToPush += "　　　　　　　　　　　";
					theLine.push(strToPush.trimEnd());
				}

				string.push(theLine.join("\n"));
				count -= 3;
				continue;
			}
		else
			for (const area of areas) {
				const theLine = [];

				for (const str of area) {
					let strToPush = "";

					if (str)
						strToPush += `　　　　　　　　　　　　　　${str}`;

					theLine.push(strToPush.trimEnd());
				}

				string.push(theLine.join("\n"));
			}

		const filepath = path.join(app.getPath("temp"), `TREM_Report_${id}.txt`);
		fs.writeFileSync(filepath, string.join("\n"), { encoding: "utf-8" });
		ipcRenderer.send("openFolder", filepath);
		setTimeout(() => fs.rmSync(filepath), 5_000);
	},

	/**
	 * @param {EarthquakeReport[]} oldlist
	 * @param {EarthquakeReport[]} newlist
	 */
	_updateReports(oldlist, newlist) {
		const removed = oldlist.filter(v => !newlist.includes(v));
		const added = newlist.filter(v => !oldlist.includes(v));
		const keys = [...this.cache.keys()];

		this._clearMap();

		for (const report of removed)
			if (report.identifier)
				this._hideItem(document.getElementById(report.identifier));
			else if (report.id)
				this._hideItem(document.getElementById(report.id));

		for (const report of added)
			if (report.identifier)
				this._showItem(document.getElementById(report.identifier));
			else if (report.id)
				this._showItem(document.getElementById(report.id));

		for (const report of newlist) {
			if (report.identifier)
				this._markers.push(L.marker(
					[report.epicenterLat, report.epicenterLon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [report.magnitudeValue * 4, report.magnitudeValue * 4],
							className : `epicenterIcon ${IntensityToClassString(report.data[0]?.areaIntensity)}`,
						}),
						opacity      : (newlist.length - newlist.indexOf(report)) / newlist.length,
						zIndexOffset : 1000 + this.cache.size - keys.indexOf(report.identifier),
					})
					.on("click", () => {
						TREM.set_report_overview = 0;
						this.setView("report-overview", report.identifier);
					}));
			else if (report.id)
				this._markers.push(L.marker(
					[report.lat, report.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [report.mag * 4, report.mag * 4],
							className : `epicenterIcon ${IntensityToClassString(report.int)}`,
						}),
						opacity      : (newlist.length - newlist.indexOf(report)) / newlist.length,
						zIndexOffset : 1000 + this.cache.size - keys.indexOf(report.id),
					})
					.on("click", () => {
						TREM.set_report_overview = 0;
						this.setView("report-overview", report.id);
					}));

			this._markersGroup = L.featureGroup(this._markers).addTo(Maps.report);
		}
	},

	/**
	 * @param {HTMLElement} element
	 */
	_hideItem(element) {
		element.classList.add("hide");
		setTimeout(() => element.style.display = "none", 200);
	},

	/**
	 * @param {HTMLElement} element
	 * @param {HTMLElement} reference
	 */
	_showItem(element) {
		element.style.display = "";
		setTimeout(() => element.classList.remove("hide"), 10);
	},
	_focusMap(...args) {
		if (args.length) {
			this._lastFocus = [...args];
			Maps.report.fitBounds(...args);
		} else if (this._lastFocus.length) {
			Maps.report.fitBounds(...this._lastFocus);
		} else {
			this._lastFocus = [[[25.35, 119.4], [21.9, 122.22]], { paddingTopLeft: [this._mapPaddingLeft, 0] }];
			Maps.report.fitBounds(...this._lastFocus);
		}
	},
	_clearMap(resetFoucs = false) {
		if (this._markers.length) {
			for (const marker of this._markers)
				marker.remove();
			this._markers = [];
		}

		if (resetFoucs) {
			this._lastFocus = [];
			this._focusMap();
		}
	},

	/**
	 * @param {EarthquakeReport} report
	 */
	_setupReport(report) {
		this._clearMap();

		console.debug(report);

		if (!report) return;

		if (report.location) {
			document.getElementById("report-overview-number").innerText = TREM.Localization.getString(report.location.startsWith("地震資訊") ? "Report_Title_Local" : (report.earthquakeNo % 1000 ? report.earthquakeNo : "Report_Title_Small"));
			document.getElementById("report-overview-location").innerText = report.location;
			const time = new Date((new Date(`${report.originTime} GMT+08:00`)).toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
			document.getElementById("report-overview-time").innerText = report.originTime;
			document.getElementById("report-overview-latitude").innerText = report.epicenterLat;
			document.getElementById("report-overview-longitude").innerText = report.epicenterLon;

			if (report.location.startsWith("地震資訊")) {
				document.getElementById("report-overview-intensity").parentElement.parentElement.style.display = "none";
			} else {
				document.getElementById("report-overview-intensity").parentElement.parentElement.style.display = "";
				const int = `${IntensityI(report.data[0]?.areaIntensity)}`.split("");
				document.getElementById("report-overview-intensity").innerText = int[0];
				document.getElementById("report-overview-intensity").className = (int[1] == "+") ? "strong"
					: (int[1] == "-") ? "weak"
						: "";
			}

			document.getElementById("report-overview-intensity-location").innerText = (report.location.startsWith("地震資訊")) ? "" : `${report.data[0].areaName} ${report.data[0].eqStation[0].stationName}`;
			document.getElementById("report-overview-unit-magnitude").innerText = (report.location.startsWith("地震資訊")) ? "d" : "L";
			document.getElementById("report-overview-magnitude").innerText = report.magnitudeValue == 0 ? "0.0" : report.magnitudeValue;
			document.getElementById("report-overview-depth").innerText = report.depth;

			// if (report.location.startsWith("地震資訊")) {
			// 	document.getElementById("report-detail-copy").style.display = "none";
			// } else {
			// 	document.getElementById("report-detail-copy").style.display = "";
			// 	document.getElementById("report-detail-copy").value = report.identifier;
			// }
			document.getElementById("report-detail-copy").style.display = "";
			document.getElementById("report-detail-copy").value = report.identifier;

			document.getElementById("report-replay").value = report.identifier;
			document.getElementById("report-replay-downloader").value = report.identifier;

			if (report.trem[0]) {
				document.getElementById("report-TREM").value = `https://exptech.com.tw/api/v1/file/trem-info.html?id=${report.trem[0]}`;
				document.getElementById("report-TREM").style.display = "";
			} else {
				document.getElementById("report-TREM").style.display = "none";
			}

			const timed = new Date(report.originTime.replace(/-/g, "/")).getTime() - 5000;
			const time_hold = String(timed / 1000);
			const _end_timed = (timed / 1000) + 305;

			fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${time_hold}.trem`, (err) => {
				if (!err) {
					document.getElementById("report-replay-downloader-icon").innerText = "download_done";
					document.getElementById("report-replay-downloader-text").innerText = "已下載!";
					report.download = true;
					this.cache.set(report.identifier, report);
					fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${_end_timed}.trem`, (err) => {
						if (err) {
							document.getElementById("report-replay-downloader-icon").innerText = "download";
							document.getElementById("report-replay-downloader-text").innerText = "下載中...";
							report.download = false;
							this.cache.set(report.identifier, report);
						}
					});
				} else {
					document.getElementById("report-replay-downloader-icon").innerText = "download";
					document.getElementById("report-replay-downloader-text").innerText = "下載";
					report.download = false;
					this.cache.set(report.identifier, report);
				}
			});

			if (report.location.startsWith("地震資訊")) {
				document.getElementById("report-cwb").style.display = "none";
				document.getElementById("report-scweb").style.display = "none";
			} else {
				document.getElementById("report-cwb").style.display = "";
				document.getElementById("report-scweb").style.display = "";

				const cwb_code = "EQ"
					+ report.earthquakeNo
					+ "-"
					+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
					+ (time.getDate() < 10 ? "0" : "") + time.getDate()
					+ "-"
					+ (time.getHours() < 10 ? "0" : "") + time.getHours()
					+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
					+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds();
				document.getElementById("report-cwb").value = `https://www.cwa.gov.tw/V8/C/E/EQ/${cwb_code}.html`;

				const scweb_code = ""
					+ time.getFullYear()
					+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
					+ (time.getDate() < 10 ? "0" : "") + time.getDate()
					+ (time.getHours() < 10 ? "0" : "") + time.getHours()
					+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
					+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds()
					+ (report.magnitudeValue * 10)
					+ (report.earthquakeNo % 1000 ? report.earthquakeNo.toString().slice(-3) : "");
				document.getElementById("report-scweb").value = `https://scweb.cwa.gov.tw/zh-tw/earthquake/details/${scweb_code}`;
			}

			let Station_i = 0;
			this.report_station = {};

			if (report.data.length)
				for (const data of report.data)
					for (const eqStation of data.eqStation) {
						const station_tooltip = `<div>測站地名: ${data.areaName} ${eqStation.stationName}</div><div>距離震央: ${eqStation.distance} km</div><div>震度: ${IntensityI(eqStation.stationIntensity)}</div>`;
						this.report_station[Station_i] = L.marker(
							[eqStation.stationLat, eqStation.stationLon],
							{
								icon: L.divIcon({
									iconSize  : [16, 16],
									className : `map-intensity-icon ${IntensityToClassString(eqStation.stationIntensity)}`,
								}),
								zIndexOffset: 200 + eqStation.stationIntensity,
							}).bindTooltip(station_tooltip, {
							offset    : [8, 0],
							permanent : false,
							className : "report-cursor-tooltip",
						});
						this._markers.push(this.report_station[Station_i]);
						Station_i += 1;
					}

			// console.log(this.report_station);
			this.epicenterIcon = null;
			this.epicenterIcon = L.marker(
				[report.epicenterLat, report.epicenterLon],
				{
					icon: L.divIcon({
						html      : TREM.Resources.icon.oldcross,
						iconSize  : [32, 32],
						className : "epicenterIcon",
					}),
					zIndexOffset: 5000,
				});
			this._markers.push(this.epicenterIcon);

			this.report_trem_data = this._report_trem_data;
			this.report_eew_data = this._report_eew_data;
			this._report_Temp = report;
			this._setuptremget(report);
			this._setupeewget(report);
		} else if (report.loc) {
			if (!report.list) {
				fetch(this.route.earthquakeReport(report.id))
					.then((res) => {
						if (res.ok) {
							console.debug(res);

							res.json().then(res1 => {
								console.debug(res1);

								report.list = res1.list;

								let Max_Level = 0;
								let Max_Level_areaName = "";
								let Max_Level_stationName = "";
								let Max_Level_distance = Number.POSITIVE_INFINITY;

								if (report.list) {
									for (let index = 0, keys = Object.keys(report.list), n = keys.length; index < n; index++) {
										const areaName = keys[index];

										if (Max_Level < report.list[areaName].int) {
											Max_Level = report.list[areaName].int;
											Max_Level_areaName = areaName;
											Max_Level_distance = Number.POSITIVE_INFINITY;
										}

										for (let station_index = 0, station_keys = Object.keys(report.list[areaName].town), o = station_keys.length; station_index < o; station_index++) {
											const station_name = station_keys[station_index];
											const station = report.list[areaName].town[station_name];
											const distance = TREM.Utils.twoPointDistance(
												{ lat: report.lat, lon: report.lon },
												{ lat: station.lat, lon: station.lon },
											).toFixed(2);
											report.list[areaName].town[station_name].distance = distance;

											if (Max_Level_distance > parseFloat(distance))
												if (Max_Level_areaName === areaName) {
													if (Max_Level === station.int) {
														Max_Level_stationName = station_name;
														Max_Level_distance = parseFloat(distance);
													}
												} else if (Max_Level === station.int) {
													Max_Level_areaName = areaName;
													Max_Level_stationName = station_name;
													Max_Level_distance = parseFloat(distance);
												}

										}
									}

									report.Max_Level = Max_Level;
									report.Max_Level_areaName = Max_Level_areaName;
									report.Max_Level_stationName = Max_Level_stationName;
								}

								ipcRenderer.send("report-Notification", report);

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
								ipcRenderer.send("ReportGET");

								document.getElementById("report-overview-number").innerText = TREM.Localization.getString(report.loc.startsWith("地震資訊") ? "Report_Title_Local" : (report.no % 1000 ? report.no : "Report_Title_Small"));
								document.getElementById("report-overview-location").innerText = report.loc;
								const time = new Date(new Date(report.time).toLocaleString("en-US", { hourCycle: "h23", timeZone: "Asia/Taipei" }));
								document.getElementById("report-overview-time").innerText = time.format("YYYY/MM/DD HH:mm:ss");
								document.getElementById("report-overview-latitude").innerText = report.lat;
								document.getElementById("report-overview-longitude").innerText = report.lon;

								if (report.loc.startsWith("地震資訊")) {
									document.getElementById("report-overview-intensity").parentElement.parentElement.style.display = "none";
								} else {
									document.getElementById("report-overview-intensity").parentElement.parentElement.style.display = "";
									const int = `${IntensityI(report.Max_Level)}`.split("");
									document.getElementById("report-overview-intensity").innerText = int[0];
									document.getElementById("report-overview-intensity").className = (int[1] == "+") ? "strong"
										: (int[1] == "-") ? "weak"
											: "";
								}

								document.getElementById("report-overview-intensity-location").innerText = (report.loc.startsWith("地震資訊")) ? "" : `${report.Max_Level_areaName} ${report.Max_Level_stationName}`;
								document.getElementById("report-overview-unit-magnitude").innerText = (report.loc.startsWith("地震資訊")) ? "d" : "L";
								document.getElementById("report-overview-magnitude").innerText = report.mag == 0 ? "0.0" : report.mag;
								document.getElementById("report-overview-depth").innerText = report.depth;

								// if (report.location.startsWith("地震資訊")) {
								// 	document.getElementById("report-detail-copy").style.display = "none";
								// } else {
								// 	document.getElementById("report-detail-copy").style.display = "";
								// 	document.getElementById("report-detail-copy").value = report.identifier;
								// }
								document.getElementById("report-detail-copy").style.display = "";
								document.getElementById("report-detail-copy").value = report.id;

								// document.getElementById("report-replay").value = report.id;
								// document.getElementById("report-replay-downloader").value = report.id;

								// if (report.trem[0]) {
								// 	document.getElementById("report-TREM").value = `https://exptech.com.tw/api/v1/file/trem-info.html?id=${report.trem[0]}`;
								// 	document.getElementById("report-TREM").style.display = "";
								// } else {
								// 	document.getElementById("report-TREM").style.display = "none";
								// }

								const timed = (report.time - 5000);
								const time_hold = String(timed / 1000);
								const _end_timed = (timed / 1000) + 305;

								fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${time_hold}.trem`, (err) => {
									if (!err) {
										document.getElementById("report-replay-downloader-icon").innerText = "download_done";
										document.getElementById("report-replay-downloader-text").innerText = "已下載!";
										report.download = true;
										this.cache.set(report.id, report);
										fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${_end_timed}.trem`, (err) => {
											if (err) {
												document.getElementById("report-replay-downloader-icon").innerText = "download";
												document.getElementById("report-replay-downloader-text").innerText = "下載中...";
												report.download = false;
												this.cache.set(report.id, report);
											}
										});
									} else {
										document.getElementById("report-replay-downloader-icon").innerText = "download";
										document.getElementById("report-replay-downloader-text").innerText = "下載";
										report.download = false;
										this.cache.set(report.id, report);
									}
								});

								if (report.loc.startsWith("地震資訊")) {
									document.getElementById("report-cwb").style.display = "none";
									document.getElementById("report-scweb").style.display = "none";
								} else {
									document.getElementById("report-cwb").style.display = "";
									document.getElementById("report-scweb").style.display = "";

									const cwb_code = "EQ"
										+ report.no
										+ "-"
										+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
										+ (time.getDate() < 10 ? "0" : "") + time.getDate()
										+ "-"
										+ (time.getHours() < 10 ? "0" : "") + time.getHours()
										+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
										+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds();
									document.getElementById("report-cwb").value = `https://www.cwa.gov.tw/V8/C/E/EQ/${cwb_code}.html`;

									const scweb_code = ""
										+ time.getFullYear()
										+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
										+ (time.getDate() < 10 ? "0" : "") + time.getDate()
										+ (time.getHours() < 10 ? "0" : "") + time.getHours()
										+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
										+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds()
										+ (report.mag * 10)
										+ (report.no % 1000 ? report.no.toString().slice(-3) : "");
									document.getElementById("report-scweb").value = `https://scweb.cwa.gov.tw/zh-tw/earthquake/details/${scweb_code}`;
								}

								let Station_i = 0;
								this.report_station = {};

								if (Object.keys(report.list).length)
									for (let index = 0, keys = Object.keys(report.list), n = keys.length; index < n; index++)
										for (let station_index = 0, station_keys = Object.keys(report.list[keys[index]].town), o = station_keys.length; station_index < o; station_index++) {
											const station = report.list[keys[index]].town[station_keys[station_index]];
											const station_tooltip = `<div>測站地名: ${keys[index]} ${station_keys[station_index]}</div><div>距離震央: ${station.distance} km</div><div>震度: ${IntensityI(station.int)}</div>`;
											this.report_station[Station_i] = L.marker(
												[station.lat, station.lon],
												{
													icon: L.divIcon({
														iconSize  : [16, 16],
														className : `map-intensity-icon ${IntensityToClassString(station.int)}`,
													}),
													zIndexOffset: 200 + station.int,
												}).bindTooltip(station_tooltip, {
												offset    : [8, 0],
												permanent : false,
												className : "report-cursor-tooltip",
											});
											this._markers.push(this.report_station[Station_i]);
											Station_i += 1;
										}

								// console.log(this.report_station);
								this.epicenterIcon = null;
								this.epicenterIcon = L.marker(
									[report.lat, report.lon],
									{
										icon: L.divIcon({
											html      : TREM.Resources.icon.oldcross,
											iconSize  : [32, 32],
											className : "epicenterIcon",
										}),
										zIndexOffset: 5000,
									});
								this._markers.push(this.epicenterIcon);

								this.report_trem_data = this._report_trem_data;
								this.report_eew_data = this._report_eew_data;
								this._report_Temp = report;
								this._setuptremget(report);
								this._setupeewget(report);
							});
						} else {
							console.error(res);

							switch (res.status) {
								case 429: {
									log(res.status, 3, "report_list_info", "Report");
									dump({ level: 2, message: res.status });
									break;
								}

								case 404: {
									log(res.status, 3, "report_list_info", "Report");
									dump({ level: 2, message: res.status });
									break;
								}

								case 500: {
									log(res.status, 3, "report_list_info", "Report");
									dump({ level: 2, message: res.status });
									break;
								}

								default: break;
							}
						}
					}).catch(err => {
						console.log(err.message);
						log(err, 3, "report_list", "Report");
						dump({ level: 2, message: err });
						return "err";
					});
			} else if (report.list) {
				if (!report.Max_Level) {
					let Max_Level = 0;
					let Max_Level_areaName = "";
					let Max_Level_stationName = "";
					let Max_Level_distance = Number.POSITIVE_INFINITY;

					for (let index = 0, keys = Object.keys(report.list), n = keys.length; index < n; index++) {
						const areaName = keys[index];

						if (Max_Level < report.list[areaName].int) {
							Max_Level = report.list[areaName].int;
							Max_Level_areaName = areaName;
							Max_Level_distance = Number.POSITIVE_INFINITY;
						}

						for (let station_index = 0, station_keys = Object.keys(report.list[areaName].town), o = station_keys.length; station_index < o; station_index++) {
							const station_name = station_keys[station_index];
							const station = report.list[areaName].town[station_name];
							const distance = TREM.Utils.twoPointDistance(
								{ lat: report.lat, lon: report.lon },
								{ lat: station.lat, lon: station.lon },
							).toFixed(2);
							report.list[areaName].town[station_name].distance = distance;

							if (Max_Level_distance > parseFloat(distance))
								if (Max_Level_areaName === areaName) {
									if (Max_Level === station.int) {
										Max_Level_stationName = station_name;
										Max_Level_distance = parseFloat(distance);
									}
								} else if (Max_Level === station.int) {
									Max_Level_areaName = areaName;
									Max_Level_stationName = station_name;
									Max_Level_distance = parseFloat(distance);
								}

						}
					}

					report.Max_Level = Max_Level;
					report.Max_Level_areaName = Max_Level_areaName;
					report.Max_Level_stationName = Max_Level_stationName;
				}

				ipcRenderer.send("report-Notification", report);

				document.getElementById("report-overview-number").innerText = TREM.Localization.getString(report.loc.startsWith("地震資訊") ? "Report_Title_Local" : (report.no % 1000 ? report.no : "Report_Title_Small"));
				document.getElementById("report-overview-location").innerText = report.loc;
				const time = new Date(new Date(report.time).toLocaleString("en-US", { hourCycle: "h23", timeZone: "Asia/Taipei" }));
				document.getElementById("report-overview-time").innerText = time.format("YYYY/MM/DD HH:mm:ss");
				document.getElementById("report-overview-latitude").innerText = report.lat;
				document.getElementById("report-overview-longitude").innerText = report.lon;

				if (report.loc.startsWith("地震資訊")) {
					document.getElementById("report-overview-intensity").parentElement.parentElement.style.display = "none";
				} else {
					document.getElementById("report-overview-intensity").parentElement.parentElement.style.display = "";
					const int = `${IntensityI(report.Max_Level)}`.split("");
					document.getElementById("report-overview-intensity").innerText = int[0];
					document.getElementById("report-overview-intensity").className = (int[1] == "+") ? "strong"
						: (int[1] == "-") ? "weak"
							: "";
				}

				document.getElementById("report-overview-intensity-location").innerText = (report.loc.startsWith("地震資訊")) ? "" : `${report.Max_Level_areaName} ${report.Max_Level_stationName}`;
				document.getElementById("report-overview-unit-magnitude").innerText = (report.loc.startsWith("地震資訊")) ? "d" : "L";
				document.getElementById("report-overview-magnitude").innerText = report.mag == 0 ? "0.0" : report.mag;
				document.getElementById("report-overview-depth").innerText = report.depth;

				// if (report.location.startsWith("地震資訊")) {
				// 	document.getElementById("report-detail-copy").style.display = "none";
				// } else {
				// 	document.getElementById("report-detail-copy").style.display = "";
				// 	document.getElementById("report-detail-copy").value = report.identifier;
				// }
				document.getElementById("report-detail-copy").style.display = "";
				document.getElementById("report-detail-copy").value = report.id;

				// document.getElementById("report-replay").value = report.id;
				// document.getElementById("report-replay-downloader").value = report.id;

				// if (report.trem[0]) {
				// 	document.getElementById("report-TREM").value = `https://exptech.com.tw/api/v1/file/trem-info.html?id=${report.trem[0]}`;
				// 	document.getElementById("report-TREM").style.display = "";
				// } else {
				// 	document.getElementById("report-TREM").style.display = "none";
				// }

				const timed = (report.time - 5000);
				const time_hold = String(timed / 1000);
				const _end_timed = (timed / 1000) + 305;

				fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${time_hold}.trem`, (err) => {
					if (!err) {
						document.getElementById("report-replay-downloader-icon").innerText = "download_done";
						document.getElementById("report-replay-downloader-text").innerText = "已下載!";
						report.download = true;
						this.cache.set(report.id, report);
						fs.access(`${path.join(path.join(app.getPath("userData"), "replay_data"), time_hold)}/${_end_timed}.trem`, (err) => {
							if (err) {
								document.getElementById("report-replay-downloader-icon").innerText = "download";
								document.getElementById("report-replay-downloader-text").innerText = "下載中...";
								report.download = false;
								this.cache.set(report.id, report);
							}
						});
					} else {
						if (document.getElementById("report-replay-downloader-icon")) document.getElementById("report-replay-downloader-icon").innerText = "download";

						if (document.getElementById("report-replay-downloader-text")) document.getElementById("report-replay-downloader-text").innerText = "下載";
						report.download = false;
						this.cache.set(report.id, report);
					}
				});

				if (report.loc.startsWith("地震資訊")) {
					document.getElementById("report-cwb").style.display = "none";
					document.getElementById("report-scweb").style.display = "none";
				} else {
					document.getElementById("report-cwb").style.display = "";
					document.getElementById("report-scweb").style.display = "";

					const cwb_code = "EQ"
						+ report.no
						+ "-"
						+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
						+ (time.getDate() < 10 ? "0" : "") + time.getDate()
						+ "-"
						+ (time.getHours() < 10 ? "0" : "") + time.getHours()
						+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
						+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds();
					document.getElementById("report-cwb").value = `https://www.cwa.gov.tw/V8/C/E/EQ/${cwb_code}.html`;

					const scweb_code = ""
						+ time.getFullYear()
						+ (time.getMonth() + 1 < 10 ? "0" : "") + (time.getMonth() + 1)
						+ (time.getDate() < 10 ? "0" : "") + time.getDate()
						+ (time.getHours() < 10 ? "0" : "") + time.getHours()
						+ (time.getMinutes() < 10 ? "0" : "") + time.getMinutes()
						+ (time.getSeconds() < 10 ? "0" : "") + time.getSeconds()
						+ (report.mag * 10)
						+ (report.no % 1000 ? report.no.toString().slice(-3) : "");
					document.getElementById("report-scweb").value = `https://scweb.cwa.gov.tw/zh-tw/earthquake/details/${scweb_code}`;
				}

				let Station_i = 0;
				this.report_station = {};

				if (Object.keys(report.list).length)
					for (let index = 0, keys = Object.keys(report.list), n = keys.length; index < n; index++)
						for (let station_index = 0, station_keys = Object.keys(report.list[keys[index]].town), o = station_keys.length; station_index < o; station_index++) {
							const station = report.list[keys[index]].town[station_keys[station_index]];
							const station_tooltip = `<div>測站地名: ${keys[index]} ${station_keys[station_index]}</div><div>距離震央: ${station.distance} km</div><div>震度: ${IntensityI(station.int)}</div>`;
							this.report_station[Station_i] = L.marker(
								[station.lat, station.lon],
								{
									icon: L.divIcon({
										iconSize  : [16, 16],
										className : `map-intensity-icon ${IntensityToClassString(station.int)}`,
									}),
									zIndexOffset: 200 + station.int,
								}).bindTooltip(station_tooltip, {
								offset    : [8, 0],
								permanent : false,
								className : "report-cursor-tooltip",
							});
							this._markers.push(this.report_station[Station_i]);
							Station_i += 1;
						}

				// console.log(this.report_station);
				this.epicenterIcon = null;
				this.epicenterIcon = L.marker(
					[report.lat, report.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [32, 32],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					});
				this._markers.push(this.epicenterIcon);

				this.report_trem_data = this._report_trem_data;
				this.report_eew_data = this._report_eew_data;
				this._report_Temp = report;
				this._setuptremget(report);
				this._setupeewget(report);
			}
		}
	},
	_setupeewget(report) {
		if (report.ID)
			if (report.ID.length != 0)
				if (!this.report_eew_data[report.ID[0]])
					fetch(`https://exptech.com.tw/api/v1/earthquake/eew-info/${report.ID[0]}`)
						.then((res) => {
							if (res.ok) {
								console.debug(res);

								res.json().then(res1 => {
									console.debug(res1);
									this._report_eew_data[report.ID[0]] = res1;
									this.report_eew_data[report.ID[0]] = this._report_eew_data[report.ID[0]];
									storage.setItem("report_eew_data", this._report_eew_data);
									this._setupeewmarker(report);
								});
							} else {
								console.error(res);

								switch (res.status) {
									case 429: {
										log(res.status, 3, "report_trem_info", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 404: {
										log(res.status, 3, "report_trem_info", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 500: {
										log(res.status, 3, "report_trem_info", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									default: break;
								}

								this._setupzoomPredict();
							}
						}).catch(err => {
							console.log(err.message);
							log(err, 3, "report_eew", "Report");
							dump({ level: 2, message: err });
							this._setupzoomPredict();
						});
				else
					this._setupeewmarker(report);
	},
	_setupeewmarker(report) {
		if (this.report_eew_data[report.ID[0]]) {
			const res = this.report_eew_data[report.ID[0]];

			for (let i = 0; i < res.length; i++) {
				const eew = res[i].eq;
				const latlng = L.latLng(eew.lat, eew.lon);
				const latlng1 = L.latLng(report.epicenterLat, report.epicenterLon);
				const distance = latlng.distanceTo(latlng1);
				const eew_epicenterIcon = L.marker(
					[eew.lat, eew.lon],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [16, 16],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					}).bindTooltip(`<div class="report_station_box">CWA EEW<div>報數: 第 ${eew.no} 報</div><div>位置: ${eew.loc} | ${eew.lat}°N  ${eew.lon} °E</div><div>規模: M ${eew.scale}</div><div>深度: ${eew.depth} km</div><div>預估最大震度: ${IntensityI(eew.max)}</div><div>與CWA震央距: ${(distance / 1000).toFixed(2)} km</div></div>`, {
					offset    : [8, 0],
					permanent : false,
					className : "report-cursor-tooltip",
					opacity   : 1,
				});
				this._markers.push(eew_epicenterIcon);
				this._setupzoomPredict();
			}
		}
	},
	_setuptremget(report) {
		if (this.report_trem)
			if (report.trem && Array.isArray(report.trem)) {
				if (!this.report_trem_data[report.trem[0]]?.trem)
					fetch(`https://exptech.com.tw/api/v1/earthquake/trem-info/${report.trem[0]}`)
						.then((res) => {
							if (res.ok) {
								console.debug(res);

								res.json().then(res1 => {
									console.debug(res1);
									this._report_trem_data[report.trem[0]] = res1;
									this.report_trem_data[report.trem[0]] = this._report_trem_data[report.trem[0]];
									storage.setItem("report_trem_data", this._report_trem_data);
									this._setuptremmarker(report);
								});
							} else {
								console.error(res);

								switch (res.status) {
									case 429: {
										log(res.status, 3, "report_trem_info", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 404: {
										log(res.status, 3, "report_trem_info", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 500: {
										log(res.status, 3, "report_trem_info", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									default: break;
								}

								this._setupzoomPredict();
							}
						}).catch(err => {
							console.log(err.message);
							log(err, 3, "report_trem", "Report");
							dump({ level: 2, message: err });
							this._setupzoomPredict();
						});

				if (!this.report_trem_data[report.trem[0]])
					fetch(`https://exptech.com.tw/api/v1/file?path=/trem_report/${report.trem[0]}.json`)
						.then((res) => {
							if (res.ok) {
								console.debug(res);

								res.json().then(res1 => {
									console.debug(res1);
									this._report_trem_data[report.trem[0]] = res1;
									this.report_trem_data[report.trem[0]] = this._report_trem_data[report.trem[0]];
									storage.setItem("report_trem_data", this._report_trem_data);
									this._setuptremmarker(report);
								});
							} else {
								console.error(res);

								switch (res.status) {
									case 429: {
										log(res.status, 3, "report_trem", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 404: {
										log(res.status, 3, "report_trem", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 500: {
										log(res.status, 3, "report_trem", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									default: break;
								}

								this._setupzoomPredict();
							}
						}).catch(err => {
							console.log(err.message);
							log(err, 3, "report_trem", "Report");
							dump({ level: 2, message: err });
							this._setupzoomPredict();
						});
				else if (!this.report_trem_data[report.trem[0]].trem || !this.report_trem_data[report.trem[0]].eew || !this.report_trem_data[report.trem[0]].note?.rf)
					fetch(`https://exptech.com.tw/api/v1/file?path=/trem_report/${report.trem[0]}.json`)
						.then((res) => {
							if (res.ok) {
								console.debug(res);

								res.json().then(res1 => {
									console.debug(res1);
									this._report_trem_data[report.trem[0]] = res1;
									this.report_trem_data[report.trem[0]] = this._report_trem_data[report.trem[0]];
									storage.setItem("report_trem_data", this._report_trem_data);
									this._setuptremmarker(report);
								});
							} else {
								console.error(res);

								switch (res.status) {
									case 429: {
										log(res.status, 3, "report_trem", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 404: {
										log(res.status, 3, "report_trem", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									case 500: {
										log(res.status, 3, "report_trem", "Report");
										dump({ level: 2, message: res.status });
										break;
									}

									default: break;
								}

								this._setupzoomPredict();
							}
						}).catch(err => {
							console.log(err.message);
							log(err, 3, "report_trem", "Report");
							dump({ level: 2, message: err });
							this._setupzoomPredict();
						});
				else
					this._setuptremmarker(report);
			} else {
				this._setupzoomPredict();
			}
		else
			this._setupzoomPredict();
	},
	_setuptremmarker(report) {
		this.report_trem_station = {};

		if (this.report_trem_data[report.trem[0]]) {
			let Station_i0 = 0;
			const res = this.report_trem_data[report.trem[0]];

			for (let index0 = 0; index0 < res.station.length; index0++) {
				const info = res.station[index0];

				for (let index = 0, keys = Object.keys(this.station), n = keys.length; index < n; index++) {
					const uuid = keys[index];

					if (info.uuid == uuid) {
						const station_deta = this.station[uuid];
						const latlng = L.latLng(station_deta.Lat, station_deta.Long);
						const latlng1 = L.latLng(report.epicenterLat, report.epicenterLon);
						const distance = latlng.distanceTo(latlng1);
						const station_markers_tooltip = `<div>UUID: ${uuid}</div><div>鄉鎮: ${station_deta.Loc}</div><div>PGA: ${info.pga} gal</div><div>PGV: ${info.pgv} kine</div><div>震度: ${IntensityI(info.intensity)}</div><div>距離震央: ${(distance / 1000).toFixed(2)} km</div>`;
						this.report_trem_station[Station_i0] = L.marker(
							[station_deta.Lat, uuid.startsWith("H") ? station_deta.Long + 0.005 : station_deta.Long],
							{
								icon: L.divIcon({
									iconSize  : [16, 16],
									className : `map-intensity-icon rt-icon trem ${info.intensity != 0 ? "pga" : ""} ${IntensityToClassString(info.intensity)}`,
								}),
								keyboard     : false,
								zIndexOffset : 100 + info.intensity,
							}).bindTooltip(station_markers_tooltip, {
							offset    : [8, 0],
							permanent : false,
							className : "report-cursor-tooltip",
						});

						this._markers.push(this.report_trem_station[Station_i0]);
						this._setupzoomPredict();
						Station_i0 += 1;
					}
				}
			}

			if (res.trem)
				for (let index0 = 0; index0 < res.trem.eew.length; index0++) {
					const trem_eew = res.trem.eew[index0];
					const latlng = L.latLng(trem_eew.lat, trem_eew.lon);
					const latlng1 = L.latLng(report.epicenterLat, report.epicenterLon);
					const distance = latlng.distanceTo(latlng1);
					const trem_epicenterIcon = L.marker(
						[trem_eew.lat, trem_eew.lon],
						{
							icon: L.divIcon({
								html      : TREM.Resources.icon.oldcross,
								iconSize  : [16, 16],
								className : "epicenterIcon",
							}),
							zIndexOffset: 5000,
						}).bindTooltip(`<div class="report_station_box"><div>報數: 第 ${index0 + 1} 報</div><div>位置: ${trem_eew.location} | ${trem_eew.lat}°N  ${trem_eew.lon} °E</div><div>類型: ${trem_eew.model}</div><div>規模: M ${trem_eew.scale}</div><div>深度: ${trem_eew.depth} km</div><div>預估最大震度: ${IntensityI(trem_eew.max)}</div><div>與CWA震央距: ${(distance / 1000).toFixed(2)} km</div></div>`, {
						offset    : [8, 0],
						permanent : false,
						className : "report-cursor-tooltip",
						opacity   : 1,
					});
					this._markers.push(trem_epicenterIcon);
					this._setupzoomPredict();
				}

			if (res.alert) {
				if (this.report_circle_trem) this.report_circle_trem.remove();
				this.report_circle_trem = L.circle([report.epicenterLat, report.epicenterLon], {
					color     : "grey",
					fillColor : "transparent",
					radius    : this.speed_to_dis((res.alert - new Date(report.originTime.replaceAll("/", "-")).getTime()) / 1000, report.depth),
					className : "s_wave",
					weight    : 1,
				});
				this._markers.push(this.report_circle_trem);
			}

			if (res.eew) {
				if (this.report_circle_cwb) this.report_circle_cwb.remove();
				this.report_circle_cwb = L.circle([report.epicenterLat, report.epicenterLon], {
					color     : "red",
					fillColor : "transparent",
					radius    : this.speed_to_dis((res.eew - new Date(report.originTime.replaceAll("/", "-")).getTime()) / 1000, report.depth),
					className : "s_wave",
					weight    : 1,
				});
				this._markers.push(this.report_circle_cwb);
			}

			if (res.note?.rf) {
				if (this.report_circle_rf) this.report_circle_rf.remove();
				this.report_circle_rf = L.circle([report.epicenterLat, report.epicenterLon], {
					color     : "black",
					fillColor : "transparent",
					radius    : this.speed_to_dis((res.note.rf - new Date(report.originTime.replaceAll("/", "-")).getTime()) / 1000, report.depth),
					className : "s_wave",
					weight    : 1,
				});
				this._markers.push(this.report_circle_rf);
			}

			this._setupzoomPredict();
		}
		// console.log(this.report_trem_station);
	},
	speed_to_dis(sec, depth) {
		for (let i = 1; i <= 1000; i++)
			if (_speed(depth, i).Stime > sec) return i * 1000;
		return 0;
	},
	_setupzoomPredict() {
		this._markersGroup = L.featureGroup(this._markers).addTo(Maps.report);

		const zoomPredict = (Maps.report.getBoundsZoom(this._markersGroup.getBounds()) - Maps.report.getMinZoom()) / (Maps.report.getMaxZoom() * (1.5 ** (Maps.report.getBoundsZoom(this._markersGroup.getBounds()) - Maps.report.getMinZoom())));
		const offsetHeightPredict = (document.getElementById("map-report").offsetHeight * zoomPredict) + 50;
		this._focusMap(this._markersGroup.getBounds(), {
			paddingTopLeft     : [document.getElementById("map-report").offsetWidth / 2, offsetHeightPredict],
			paddingBottomRight : [document.getElementById("map-report").offsetWidth * zoomPredict, offsetHeightPredict],
		});
	},
	_setup_api_key_verify() {
		if (!this.api_key_verify) {
			const element = document.getElementById("report-label-filter-TREM");
			element.classList.add("hide");
			element.style.display = "none";
		} else if (this.api_key_verify) {
			const element = document.getElementById("report-label-filter-TREM");
			element.classList.remove("hide");
			element.style.display = "block";
		}
	},
};

TREM.on("viewChange", (oldView, newView) => {
	switch (oldView) {
		case "report": {
			TREM.Report.unloadReports();
			TREM.Report._setup_api_key_verify();
			break;
		}

		default:
			break;
	}

	switch (newView) {
		case "report": {
			TREM.Report.unloadReports();
			TREM.Report.loadReports();
			TREM.Report._focusMap();
			TREM.Report._setup_api_key_verify();

			if (TREM.Report.view != "report-overview" && TREM.Report._filterDateValue == "" && TREM.Report._filterMonthValue == "") {
				const input = document.getElementById("report-filter-month-value");
				const today = new Date();
				const mm = String(today.getMonth() + 1).padStart(2, "0");
				const yyyy = today.getFullYear();
				input.value = yyyy + "-" + mm;
				const checkbox = document.getElementById("report-filter-month");
				checkbox.checked = true;
				TREM.Report._handleFilter("filterMonthValue", input.value);
				TREM.Report._handleFilter("filterMonth", true);
			}

			break;
		}

		default:
			break;
	}
});