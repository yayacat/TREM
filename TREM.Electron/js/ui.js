const { ipcRenderer } = require("electron");
const EventEmitter = require("node:events");
const TREM = new EventEmitter();

document.addEventListener("keydown", (event) => {
	if (event.key == "F11")
		ipcRenderer.send("toggleFullscreen");

	if (event.key == "F10")
		ipcRenderer.send("openDevtoolF10");

	if (event.key == "Escape") ipcRenderer.send("hide");

	if (event.ctrlKey && event.shiftKey && event.key.toLocaleLowerCase() == "i")
		ipcRenderer.send("openDevtool");

	if (event.ctrlKey && event.key.toLocaleLowerCase() == "r")
		ipcRenderer.send("reloadpage");
});

const toggleNav = state => {
	if (state == undefined) {
		$("#nav-rail").toggleClass("hide");
		state = !$("#nav-rail").hasClass("hide");
	}

	if (state) {
		$("#nav-rail").removeClass("hide");

		if (setting["nav.ui.autoclose"]) {
			TREM.toggleNavTime = NOW().getTime();
			console.debug("toggleNavTime: ", TREM.toggleNavTime);
		}
	} else {
		$("#nav-rail").addClass("hide");

		if (setting["nav.ui.autoclose"] && TREM.toggleNavTime != 0) {
			TREM.toggleNavTime = 0;
			console.debug("toggleNavTime end: ", TREM.toggleNavTime);
		}
	}

	$("#togglenav_btn span.material-symbols-rounded").text(state ? "first_page" : "last_page");
};

document.addEventListener("keyup", (event) => {
	if (event.key == "F12")
		ipcRenderer.send("screenshot");
}, false);