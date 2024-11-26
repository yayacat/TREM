/**
 * @class
 * @template {number} [version = 2]
 * @template {string} [key = ""]
 * @template {number} [random_max_num = 4]
 * @template {number} [random_ws_num = 1~4]
 * @template {number} [random_api_num = 1~2]
 * @template {string} [global_url = ["com.tw", "dev"]]
 */
class Route {

	/**
   * @typedef BaseLbUrl
   * @type {`https://lb-${number}.exptech.${global_url}`}
   */

	/**
   * @typedef BaseUrl
   * @type {`https://lb-${number}.exptech.${global_url}/api/v${version}`}
   */

	/**
   * @typedef BaseApiUrl
   * @type {`https://api-${number}.exptech.${global_url}/api/v${version}`}
   */

	/**
   * @typedef BaseETUrl
   * @type {`https://api-1.exptech.${global_url}/api/v${version}/et/`}
   */

	/**
   * @typedef WSBaseUrl
   * @type {`wss://lb-${number}.exptech.${global_url}/websocket`}
   */

	/**
   * @constructor
   * @param {{version: version, key: key, random_max_num: random_max_num, random_ws_num: random_ws_num, ws_num: ws_num, ws_num_bk: ws_num_bk}} options
   */
	constructor(options = {}) {
		this.version = options.version ?? 2;
		this.key = options.key ?? "";
		this.random_max_num = options.random_max_num ?? 4;
		this.random_ws_num = this.randomWSNum();
		this.random_api_num = this.randomAPINum();
		this.ws_num = -1;
		this.ws_num_bk = -1;
		this.global_url = ["dev"];
		this.random_global_url = this.auto_run_global_url();
	}

	getRandomElement(list) {
		const index = Math.floor(Math.random() * list.length);
		return list[index];
	}

	/**
   * @template {string} key
   * @param {key} key
   */
	setkey(key) {
		this.key = key;
	}

	auto_run() {
		this.random_ws_num = this.randomWSNum();
		return this.random_ws_num;
	}

	auto_run_global_url() {
		const index = this.randomGlobalUrlNum();
		this.random_global_url = this.global_url[index];
		return this.random_global_url;
	}

	auto_api_run() {
		this.random_api_num = this.randomAPINum();
		return this.random_api_num;
	}

	/**
   * @returns {number}
   */
	randomWSNum() {
		return Math.ceil(Math.random() * this.random_max_num);
	}

	/**
   * @returns {number}
   */
	randomGlobalUrlNum() {
		return Math.floor(Math.random() * this.global_url.length);
	}

	/**
   * @returns {number}
   */
	randomAPINum() {
		return Math.ceil(Math.random() * 2);
	}

	/**
   * @returns {ws_num,ws_num_bk}
   */
	random_num() {
		let ws_num, ws_num_bk;

		do {
			ws_num = this.randomWSNum();
			ws_num_bk = this.randomWSNum();
		} while (ws_num === ws_num_bk);

		return { ws_num, ws_num_bk };
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {BaseUrl}
   */
	randomBaseUrl(version = this.version) {
		return `https://lb-${ this.random_ws_num }.exptech.${this.random_global_url}/api/v${ version }`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {BaseApiUrl}
   */
	randomApiBaseUrl(version = this.version) {
		return `https://api-${ this.random_api_num }.exptech.${this.random_global_url}/api/v${ version }`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {BaseETUrl}
   */
	randomETBaseUrl(version = this.version) {
		return `https://api-1.exptech.${this.random_global_url}/api/v${ version }/et/`;
	}

	/**
    * @returns {BaseFileUrl}
    */
	tremStation(version = this.version) {
		return this.randomApiBaseUrl(version) + "/trem/station";
	}

	/**
   * @returns {WSBaseUrl}
   */
	randomWSBaseUrl() {
		return `wss://lb-${ this.random_ws_num }.exptech.${this.random_global_url}/websocket`;
	}

	/**
   * @template {number} limit
   * @param {limit} [limit]
   * @returns {`${BaseUrl}/eq/report?limit=${limit}&key=${key}`}
   */
	earthquakeReportList(limit = "") {
		return this.randomApiBaseUrl() + `/eq/report?limit=${limit}${this.key == "" ? "" : `&key=${this.key}`}`;
	}

	/**
   * @template {string} id
   * @param {id} id
   * @returns {`${BaseUrl}/eq/report/${id}`}
   */
	earthquakeReport(id) {
		return this.randomApiBaseUrl() + `/eq/report/${id}`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @template {number} timestamp
   * @param {timestamp} timestamp
   * @returns {`${BaseUrl}/trem/rts?time=${timestamp}`}
   */
	rts(version, timestamp = 0, url) {
		let reurl;

		if (url == 0)
			reurl = this.randomBaseUrl(version) + `/trem/rts${timestamp ? `?time=${timestamp}` : ""}`;
		else if (url == 1)
			reurl = this.randomApiBaseUrl(version) + `/trem/rts${timestamp ? `?time=${timestamp}` : ""}`;
		return reurl;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @template {number} timestamp
   * @param {timestamp} timestamp
   * @returns {`${BaseUrl}/trem/rts/${timestamp}`}
   */
	rtsReplay(version, timestamp = 0) {
		return this.randomApiBaseUrl(version) + `/trem/rts/${timestamp}`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {`${BaseUrl}/eq/eew`}
   */
	eew(version, url) {
		let reurl;

		if (url == 0)
			reurl = this.randomBaseUrl(version) + "/eq/eew?type=all";
		else if (url == 1)
			reurl = this.randomApiBaseUrl(version) + "/eq/eew?type=all";
		// this.auto_run();
		return reurl;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @template {number} timestamp
   * @param {timestamp} timestamp
   * @returns {`${BaseUrl}/eq/eew/${timestamp}`}
   */
	eewReplay(version, timestamp) {
		return this.randomApiBaseUrl(version) + `/eq/eew/${timestamp}`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {`${BaseLbUrl}/ntp`}
   */
	ntp() {
		return `https://lb-${ this.random_ws_num }.exptech.${this.random_global_url}/ntp`;
	}
}

module.exports = Route;