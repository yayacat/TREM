/**
 * @class
 * @template {number} [version = 2]
 * @template {string} [key = ""]
 * @template {number} [random_max_num = 4]
 * @template {number} [random_ws_num = 1~4]
 */
class Route {

	/**
   * @typedef BaseUrl
   * @type {`https://lb-${number}.exptech.com.tw/api/v${version}`}
   */

	/**
   * @constructor
   * @param {{version: version, key: key, random_max_num: random_max_num}} options
   */
	constructor(options = {}) {
		this.version = options.version ?? 2;
		this.key = options.key ?? "";
		this.random_max_num = options.random_max_num ?? 4;
		this.random_ws_num = this.randomWSNum();
	}

	/**
   * @template {string} key
   * @param {key} key
   */
	setkey(key) {
		this.key = key;
	}

	/**
   * @returns {number}
   */
	randomWSNum() {
		return Math.ceil(Math.random() * this.random_max_num);
	}

	/**
   * @returns {BaseUrl}
   */
	randomBaseUrl() {
		return `https://lb-${this.random_ws_num}.exptech.com.tw/api/v${this.version}`;
	}

	/**
   * @template {number} limit
   * @param {limit} [limit]
   * @returns {`${BaseUrl}/eq/report?limit=${limit}&key=${key}`}
   */
	earthquakeReportList(limit = "") {
		return this.randomBaseUrl() + `/eq/report?limit=${limit}&key=${this.key}`;
	}

	/**
   * @template {string} id
   * @param {id} id
   * @returns {`${BaseUrl}/eq/report/${id}`}
   */
	earthquakeReport(id) {
		return this.randomBaseUrl() + `/eq/report/${id}`;
	}

	/**
   * @template {number} timestamp
   * @param {timestamp} timestamp
   * @returns {`${BaseUrl}/trem/rts?time=${timestamp}`}
   */
	rts(timestamp) {
		return this.randomBaseUrl() + `/trem/rts?time=${timestamp}`;
	}
}

module.exports = Route;