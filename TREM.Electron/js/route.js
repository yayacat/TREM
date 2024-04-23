/**
 * @class
 * @template {number} [version = 2]
 * @template {string} [key = ""]
 * @template {number} [random_max_num = 4]
 * @template {number} [random_ws_num = 1~4]
 * @template {number} [random_api_num = 1~2]
 */
class Route {

	/**
   * @typedef BaseUrl
   * @type {`https://lb-${number}.exptech.com.tw/api/v${version}`}
   */

	/**
   * @typedef BaseApiUrl
   * @type {`https://api-${number}.exptech.com.tw/api/v${version}`}
   */

	/**
   * @typedef WSBaseUrl
   * @type {`wss://lb-${number}.exptech.com.tw/websocket`}
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
		return `https://lb-${ this.random_ws_num }.exptech.com.tw/api/v${ version }`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {BaseUrl}
   */
	randomApiBaseUrl(version = this.version) {
		return `https://api-${ this.random_api_num }.exptech.com.tw/api/v${ version }`;
	}

	/**
    * @returns {BaseFileUrl}
    */
	randomBaseFileUrl() {
		return `https://lb-${ this.random_ws_num }.exptech.com.tw/file/resource/`;
	}

	/**
   * @returns {WSBaseUrl}
   */
	randomWSBaseUrl() {
		return `wss://lb-${ this.random_ws_num }.exptech.com.tw/websocket`;
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
	rts(version, timestamp = 0) {
		return this.randomBaseUrl(version) + `/trem/rts${timestamp ? `?time=${timestamp}` : ""}`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @template {number} timestamp
   * @param {timestamp} timestamp
   * @returns {`${BaseUrl}/trem/rts/${timestamp}`}
   */
	rtsReplay(version, timestamp = 0) {
		return this.randomBaseUrl(version) + `/trem/rts/${timestamp}`;
	}

	/**
   * @template {number} version
   * @param {version} version
   * @returns {`${BaseUrl}/eq/eew`}
   */
	eew(version) {
		// this.auto_run();
		return this.randomBaseUrl(version) + "/eq/eew?type=all";
	}

	/**
   * @template {number} version
   * @param {version} version
   * @template {number} timestamp
   * @param {timestamp} timestamp
   * @returns {`${BaseUrl}/eq/eew/${timestamp}`}
   */
	eewReplay(version, timestamp) {
		return this.randomBaseUrl(version) + `/eq/eew/${timestamp}`;
	}
}

module.exports = Route;