const time = require("./time.json");

module.exports = {
	area      : require("./area.json"),
	areav2    : require("./areav2.json"),
	region    : require("./region.json"),
	regionv2  : require("./region_v2.json"),
	time,
	time_list : Object.keys(time),
	icon      : {
		cross(options) {
			if (options) {
				let style = "";

				if (Array.isArray(options.size))
					style += `height:${options.size[0]}px;width:${options.size[1]}px;`;
				else if (options.size != undefined)
					style += `height:${options.size}px;width:${options.size}px;`;

				if (options.opacity)
					style += `opacity:${options.opacity};`;

				if (options.zIndexOffset)
					style += `z-index:${options.zIndexOffset};`;

				if (style != "" && options.className != undefined)
					return `<svg xmlns="http://www.w3.org/2000/svg" class="${options.className}" style="${style}" viewBox="0 0 76 76"><path class="cross-inner" d="M59.33,73a3,3,0,0,1-2.12-.88L38,52.92,18.78,72.13a3,3,0,0,1-4.24,0L3.88,61.46a3,3,0,0,1,0-4.24L23.09,38,3.88,18.8a3,3,0,0,1,0-4.25L14.54,3.88a3,3,0,0,1,4.25,0L38,23.1,57.21,3.88A3,3,0,0,1,59.33,3h0a3,3,0,0,1,2.13.88L72.12,14.55a3,3,0,0,1,0,4.25L52.91,38,72.12,57.22a3,3,0,0,1,0,4.24L61.45,72.12A3,3,0,0,1,59.33,73Z"/><path class="cross-outer" d="M59.33,6,70,16.68,48.67,38,70,59.34,59.33,70,38,48.68,16.66,70,6,59.34,27.33,38,6,16.68,16.66,6,38,27.34,59.33,6m0-6a6,6,0,0,0-4.24,1.76L38,18.85,20.91,1.76A6,6,0,0,0,16.66,0h0a6,6,0,0,0-4.24,1.76L1.75,12.43a6,6,0,0,0,0,8.49L18.84,38,1.76,55.1a6,6,0,0,0,0,8.48L12.42,74.25a6,6,0,0,0,8.49,0L38,57.16,55.09,74.25a6,6,0,0,0,8.49,0L74.24,63.58a6,6,0,0,0,0-8.48L57.15,38,74.24,20.92a6,6,0,0,0,0-8.49L63.58,1.76A6,6,0,0,0,59.33,0Z"/></svg>`;
				else if (options.className != undefined)
					return `<svg xmlns="http://www.w3.org/2000/svg" class="${options.className}" viewBox="0 0 76 76"><path class="cross-inner" d="M59.33,73a3,3,0,0,1-2.12-.88L38,52.92,18.78,72.13a3,3,0,0,1-4.24,0L3.88,61.46a3,3,0,0,1,0-4.24L23.09,38,3.88,18.8a3,3,0,0,1,0-4.25L14.54,3.88a3,3,0,0,1,4.25,0L38,23.1,57.21,3.88A3,3,0,0,1,59.33,3h0a3,3,0,0,1,2.13.88L72.12,14.55a3,3,0,0,1,0,4.25L52.91,38,72.12,57.22a3,3,0,0,1,0,4.24L61.45,72.12A3,3,0,0,1,59.33,73Z"/><path class="cross-outer" d="M59.33,6,70,16.68,48.67,38,70,59.34,59.33,70,38,48.68,16.66,70,6,59.34,27.33,38,6,16.68,16.66,6,38,27.34,59.33,6m0-6a6,6,0,0,0-4.24,1.76L38,18.85,20.91,1.76A6,6,0,0,0,16.66,0h0a6,6,0,0,0-4.24,1.76L1.75,12.43a6,6,0,0,0,0,8.49L18.84,38,1.76,55.1a6,6,0,0,0,0,8.48L12.42,74.25a6,6,0,0,0,8.49,0L38,57.16,55.09,74.25a6,6,0,0,0,8.49,0L74.24,63.58a6,6,0,0,0,0-8.48L57.15,38,74.24,20.92a6,6,0,0,0,0-8.49L63.58,1.76A6,6,0,0,0,59.33,0Z"/></svg>`;
			}

			return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 76 76\"><path class=\"cross-inner\" d=\"M59.33,73a3,3,0,0,1-2.12-.88L38,52.92,18.78,72.13a3,3,0,0,1-4.24,0L3.88,61.46a3,3,0,0,1,0-4.24L23.09,38,3.88,18.8a3,3,0,0,1,0-4.25L14.54,3.88a3,3,0,0,1,4.25,0L38,23.1,57.21,3.88A3,3,0,0,1,59.33,3h0a3,3,0,0,1,2.13.88L72.12,14.55a3,3,0,0,1,0,4.25L52.91,38,72.12,57.22a3,3,0,0,1,0,4.24L61.45,72.12A3,3,0,0,1,59.33,73Z\"/><path class=\"cross-outer\" d=\"M59.33,6,70,16.68,48.67,38,70,59.34,59.33,70,38,48.68,16.66,70,6,59.34,27.33,38,6,16.68,16.66,6,38,27.34,59.33,6m0-6a6,6,0,0,0-4.24,1.76L38,18.85,20.91,1.76A6,6,0,0,0,16.66,0h0a6,6,0,0,0-4.24,1.76L1.75,12.43a6,6,0,0,0,0,8.49L18.84,38,1.76,55.1a6,6,0,0,0,0,8.48L12.42,74.25a6,6,0,0,0,8.49,0L38,57.16,55.09,74.25a6,6,0,0,0,8.49,0L74.24,63.58a6,6,0,0,0,0-8.48L57.15,38,74.24,20.92a6,6,0,0,0,0-8.49L63.58,1.76A6,6,0,0,0,59.33,0Z\"/></svg>";
		},
		oldcross: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 76 76\"><path class=\"cross-inner\" d=\"M59.33,73a3,3,0,0,1-2.12-.88L38,52.92,18.78,72.13a3,3,0,0,1-4.24,0L3.88,61.46a3,3,0,0,1,0-4.24L23.09,38,3.88,18.8a3,3,0,0,1,0-4.25L14.54,3.88a3,3,0,0,1,4.25,0L38,23.1,57.21,3.88A3,3,0,0,1,59.33,3h0a3,3,0,0,1,2.13.88L72.12,14.55a3,3,0,0,1,0,4.25L52.91,38,72.12,57.22a3,3,0,0,1,0,4.24L61.45,72.12A3,3,0,0,1,59.33,73Z\"/><path class=\"cross-outer\" d=\"M59.33,6,70,16.68,48.67,38,70,59.34,59.33,70,38,48.68,16.66,70,6,59.34,27.33,38,6,16.68,16.66,6,38,27.34,59.33,6m0-6a6,6,0,0,0-4.24,1.76L38,18.85,20.91,1.76A6,6,0,0,0,16.66,0h0a6,6,0,0,0-4.24,1.76L1.75,12.43a6,6,0,0,0,0,8.49L18.84,38,1.76,55.1a6,6,0,0,0,0,8.48L12.42,74.25a6,6,0,0,0,8.49,0L38,57.16,55.09,74.25a6,6,0,0,0,8.49,0L74.24,63.58a6,6,0,0,0,0-8.48L57.15,38,74.24,20.92a6,6,0,0,0,0-8.49L63.58,1.76A6,6,0,0,0,59.33,0Z\"/></svg>",
	},
	square(options) {
		if (options) {
			let style = "";

			if (Array.isArray(options.size))
				style += `height:${options.size[0]}px;width:${options.size[1]}px;`;
		  	else if (options.size != undefined)
				style += `height:${options.size}px;width:${options.size}px;`;

		  	if (options.opacity)
				style += `opacity:${options.opacity};`;

		  	if (options.zIndexOffset)
				style += `z-index:${options.zIndexOffset};`;

		  	if (style != "" && options.className != undefined)
				return `<svg xmlns="http://www.w3.org/2000/svg" class="${options.className}" style="${style}" viewBox="0 0 76 76"><rect class="square-outer" width="76" height="76" rx="8" ry="8"></rect><rect class="square-inner" x="8" y="8" width="60" height="60" rx="4" ry="4"></rect></svg>`;
		  	else if (options.className != undefined)
				return `<svg xmlns="http://www.w3.org/2000/svg" class="${options.className}" viewBox="0 0 76 76"><rect class="square-outer" width="76" height="76" rx="8" ry="8"></rect><rect class="square-inner" x="8" y="8" width="60" height="60" rx="4" ry="4"></rect></svg>`;
		}

		return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 76 76\"><rect class=\"square-outer\" width=\"76\" height=\"76\" rx=\"8\" ry=\"8\"></rect><rect class=\"square-inner\" x=\"8\" y=\"8\" width=\"60\" height=\"60\" rx=\"4\" ry=\"4\"></rect></svg>";
	},
};
