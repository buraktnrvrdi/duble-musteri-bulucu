let electron = require("electron");
// src/preload/index.ts
var call = async (ch, ...a) => {
	const r = await electron.ipcRenderer.invoke(ch, ...a);
	if (!r.ok) throw new Error(r.error);
	return r.data;
};
var on = (ch, cb) => {
	const h = (_, v) => cb(v);
	electron.ipcRenderer.on(ch, h);
	return () => {
		electron.ipcRenderer.removeListener(ch, h);
	};
};
electron.contextBridge.exposeInMainWorld("api", {
	getSettings: () => call("settings:get"),
	saveSettings: (s) => call("settings:save", s),
	startSearch: (p) => call("search:start", p),
	cancelSearch: () => call("search:cancel"),
	onProgress: (cb) => on("search:progress", cb),
	onResults: (cb) => on("search:results", cb),
	listSaved: (f) => call("saved:list", f),
	saveBusinesses: (items, searchId) => call("saved:save", items, searchId),
	updateBusiness: (id, patch) => call("saved:update", id, patch),
	deleteBusinesses: (ids) => call("saved:delete", ids),
	facets: () => call("saved:facets"),
	exportCsv: (f) => call("saved:exportCsv", f),
	googleVerify: (name, city) => call("external:google", name, city),
	instagramSearch: (name, city) => call("external:instagramSearch", name, city),
	openUrl: (url) => call("external:open", url),
	validateInstagram: (v) => call("instagram:validate", v),
	fsqCount: () => call("fsq:count"),
	fsqClear: () => call("fsq:clear"),
	fsqImport: () => call("fsq:import"),
	onFsqProgress: (cb) => on("fsq:progress", cb),
	clearCache: () => call("cache:clear")
});
