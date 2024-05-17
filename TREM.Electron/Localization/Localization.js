const Dictionary = require("./Dictionary.js");

class Localization {
	constructor(defaultLocale, fallbackLocale = "zh-TW") {
		this.defaultLocale = defaultLocale;
		this.fallbackLocale = this.fallbackLocaler(fallbackLocale);

		for (const locale of Localization.availableLocales)
			this[locale] = new Dictionary(locale);
	}

	static availableLocales = [
		"en",
		"ja",
		"kr",
		"ru",
		"zh-CN",
		"zh-TW",
	];

	fallbackLocaler(value) {
		if (Localization.availableLocales.includes(value)) return value;
		else if (Localization.availableLocales.includes(value.slice(0, 2))) return value.slice(0, 2);
		else if (value.startsWith("zh")) return "zh-TW";
		else return "en";
	}

	matchLocale(value) {
		value = this.fallbackLocaler(value);
		return value;
	}

	setLocale(locale) {
		this.defaultLocale = locale;
	}

	getString(id, locale) {
		return this[locale]?.get(id) ?? this[this.defaultLocale]?.get(id) ?? this[this.fallbackLocale]?.get(id) ?? id;
	}
}

module.exports = Localization;
