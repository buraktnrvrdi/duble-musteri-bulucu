// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
let electron = require("electron");
let path = require("path");
let fs = require("fs");
let cheerio = require("cheerio");
cheerio = __toESM(cheerio);
let crypto = require("crypto");
let better_sqlite3 = require("better-sqlite3");
better_sqlite3 = __toESM(better_sqlite3);
let os = require("os");
// src/main/paths.ts
var userDir = () => electron.app.getPath("userData");
var cacheDir = () => {
	const d = (0, path.join)(userDir(), "cache");
	(0, fs.mkdirSync)(d, { recursive: true });
	return d;
};
var dbPath = () => (0, path.join)(userDir(), "musteri-bulucu.db");
var settingsPath = () => (0, path.join)(userDir(), "settings.json");
var USER_AGENT = "dubleMusteriBulucu/1.0 (desktop app; public business data only; honors robots.txt)";
// src/shared/sectors.ts
/** Sektör → OSM etiket özellikleri. Her öğe "anahtar=değer1|değer2" biçimindedir (VEYA ile birleşir). */
var DEFAULT_SECTOR_MAP = {
	"Berber": ["shop=hairdresser"],
	"Kuaför": ["shop=hairdresser"],
	"Güzellik merkezi": ["shop=beauty"],
	"Kafe": ["amenity=cafe"],
	"Restoran": ["amenity=restaurant"],
	"Pastane": ["shop=pastry|bakery"],
	"Çiçekçi": ["shop=florist"],
	"Oto yıkama/bakım": ["shop=car_repair", "amenity=car_wash"],
	"Pet kuaför": ["shop=pet_grooming"],
	"Emlak": ["office=estate_agent"],
	"Mobilya": ["shop=furniture"],
	"Fotoğrafçı": ["shop=photo", "craft=photographer"],
	"Teknik servis": ["shop=computer", "craft=electronics_repair"],
	"Araç kiralama": ["amenity=car_rental"],
	"Peyzaj": ["craft=gardener", "shop=garden_centre"],
	"Yoga stüdyosu": ["sport=yoga"],
	"Organizasyon": [
		"shop=party",
		"office=event_management",
		"craft=caterer"
	],
	"Butik": ["shop=clothes|boutique"],
	"Spor salonu": ["leisure=fitness_centre"],
	"Danışmanlık": ["office=consulting|company"]
};
Object.keys(DEFAULT_SECTOR_MAP);
/** Foursquare kategori (alt dize, küçük harf) → sektör. */
var DEFAULT_FSQ_CATEGORY_MAP = {
	"Berber": ["barbershop", "barber"],
	"Kuaför": ["hair salon", "hairdresser"],
	"Güzellik merkezi": [
		"beauty salon",
		"nail salon",
		"spa",
		"beauty"
	],
	"Kafe": [
		"coffee shop",
		"café",
		"cafe"
	],
	"Restoran": ["restaurant"],
	"Pastane": [
		"bakery",
		"dessert shop",
		"pastry"
	],
	"Çiçekçi": ["flower shop", "florist"],
	"Oto yıkama/bakım": [
		"car wash",
		"auto workshop",
		"automotive repair"
	],
	"Pet kuaför": ["pet grooming", "pet service"],
	"Emlak": ["real estate"],
	"Mobilya": ["furniture"],
	"Fotoğrafçı": ["photography", "photographer"],
	"Teknik servis": [
		"computer repair",
		"electronics repair",
		"mobile phone shop"
	],
	"Araç kiralama": ["car rental"],
	"Peyzaj": ["landscaper", "garden center"],
	"Yoga stüdyosu": ["yoga"],
	"Organizasyon": ["event space", "event service"],
	"Butik": ["boutique", "clothing store"],
	"Spor salonu": ["gym", "fitness"],
	"Danışmanlık": ["business service", "consulting"]
};
/** OSM etiketlerinden sektör tahmini (sektör haritasını tersine çevirir). */
function guessSectorFromTags(tags, map) {
	for (const [sector, specs] of Object.entries(map)) for (const spec of specs) {
		const i = spec.indexOf("=");
		if (i < 0) continue;
		const k = spec.slice(0, i);
		const vals = spec.slice(i + 1).split("|");
		if (tags[k] && vals.includes(tags[k])) return sector;
	}
	return null;
}
function guessSectorFromFsq(categories, map) {
	const c = categories.toLowerCase();
	for (const [sector, keys] of Object.entries(map)) if (keys.some((k) => c.includes(k.toLowerCase()))) return sector;
	return null;
}
// src/main/settings.ts
var DEFAULT_SETTINGS = {
	endpoints: [
		"https://overpass-api.de/api/interpreter",
		"https://overpass.kumi.systems/api/interpreter",
		"https://overpass.private.coffee/api/interpreter"
	],
	sectorMap: DEFAULT_SECTOR_MAP,
	fsqCategoryMap: DEFAULT_FSQ_CATEGORY_MAP
};
function loadSettings() {
	try {
		const raw = JSON.parse((0, fs.readFileSync)(settingsPath(), "utf8"));
		return {
			endpoints: Array.isArray(raw.endpoints) && raw.endpoints.length ? raw.endpoints : DEFAULT_SETTINGS.endpoints,
			sectorMap: raw.sectorMap && typeof raw.sectorMap === "object" ? raw.sectorMap : DEFAULT_SETTINGS.sectorMap,
			fsqCategoryMap: raw.fsqCategoryMap && typeof raw.fsqCategoryMap === "object" ? raw.fsqCategoryMap : DEFAULT_SETTINGS.fsqCategoryMap
		};
	} catch {
		return structuredClone(DEFAULT_SETTINGS);
	}
}
/** Doğrular ve kaydeder; hatalıysa Türkçe hata fırlatır. */
function saveSettings(s) {
	const endpoints = (s.endpoints || []).map((e) => e.trim()).filter(Boolean);
	if (!endpoints.length) throw new Error("En az bir Overpass uç noktası gerekli.");
	for (const e of endpoints) {
		let u;
		try {
			u = new URL(e);
		} catch {
			throw new Error("Geçersiz uç nokta adresi: " + e);
		}
		if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Uç nokta http(s) olmalı: " + e);
	}
	for (const [name, specs] of Object.entries(s.sectorMap || {})) if (!Array.isArray(specs) || specs.some((x) => typeof x !== "string" || !x.includes("="))) throw new Error(`"${name}" sektörü için etiketler "anahtar=değer" biçiminde olmalı.`);
	const clean = {
		endpoints,
		sectorMap: s.sectorMap,
		fsqCategoryMap: s.fsqCategoryMap || DEFAULT_SETTINGS.fsqCategoryMap
	};
	(0, fs.writeFileSync)(settingsPath(), JSON.stringify(clean, null, 2), "utf8");
	return clean;
}
// src/shared/phone.ts
function normalizePhone(raw) {
	if (!raw) return null;
	let s = String(raw).trim();
	s = s.split(/(?:dahili|dh\.?|ext\.?|x)\s*\d+/i)[0];
	let digits = s.replace(/[^\d+]/g, "");
	if (!digits) return null;
	if (digits.startsWith("+")) digits = digits.slice(1);
	else if (digits.startsWith("00")) digits = digits.slice(2);
	else if (digits.startsWith("0")) digits = "90" + digits.slice(1);
	else if (digits.length === 10) digits = "90" + digits;
	if (!digits.startsWith("90")) return null;
	const national = digits.slice(2);
	if (national.length !== 10) return null;
	if (!/^[2-5]/.test(national)) return null;
	return {
		e164: "+90" + national,
		isMobile: national.startsWith("5")
	};
}
/** Birden çok numara içeren metni (; , / ile ayrılmış) ayrıştırır, ilk geçerli olanı döner. */
function pickFirstPhone(raw) {
	if (!raw) return null;
	for (const part of String(raw).split(/[;,/|]/)) {
		const n = normalizePhone(part);
		if (n) return n;
	}
	return null;
}
function whatsappUrl(p) {
	if (!p || !p.isMobile) return null;
	return "https://wa.me/" + p.e164.slice(1);
}
// src/shared/extract.ts
var IG_RESERVED = /* @__PURE__ */ new Set([
	"p",
	"reel",
	"reels",
	"explore",
	"stories",
	"accounts",
	"tv",
	"about",
	"developer",
	"legal",
	"directory",
	"web",
	"direct",
	"share",
	"sharer",
	"sharer.php",
	"privacy",
	"login",
	"static",
	"oauth",
	"embed"
]);
var FB_RESERVED = /* @__PURE__ */ new Set([
	"sharer",
	"sharer.php",
	"share",
	"share.php",
	"dialog",
	"plugins",
	"tr",
	"login",
	"login.php",
	"policies",
	"privacy",
	"help",
	"groups",
	"events",
	"watch",
	"marketplace",
	"photo",
	"photo.php",
	"permalink.php",
	"story.php",
	"hashtag",
	"legal",
	"ads",
	"business",
	"pages",
	"profile.php",
	"people",
	"public",
	"l.php",
	"tr-tr",
	"reel",
	"reels",
	"video"
]);
/** Kullanıcı adı biçimi: 1-30 karakter, harf/rakam/nokta/alt çizgi. */
function isValidInstagramUsername(u) {
	if (!/^[A-Za-z0-9._]{1,30}$/.test(u)) return false;
	if (u.startsWith(".") || u.endsWith(".") || u.includes("..")) return false;
	return true;
}
/** Elle yapıştırılan değeri (@kullanici, URL, kullanici) kullanıcı adına çevirir; geçersizse null. */
function parseInstagramInput(input) {
	if (!input) return null;
	let s = input.trim();
	if (!s) return null;
	const m = /instagram\.com\/([^/?#\s]+)/i.exec(s);
	if (m) s = m[1];
	s = s.replace(/^@/, "");
	if (IG_RESERVED.has(s.toLowerCase())) return null;
	return isValidInstagramUsername(s) ? s.toLowerCase() : null;
}
function instagramFromUrl(url) {
	const m = /^(?:https?:)?\/\/(?:www\.|m\.)?instagram\.com\/([^/?#]+)/i.exec(url.trim());
	if (!m) return null;
	let u = decodeURIComponent(m[1]);
	if (IG_RESERVED.has(u.toLowerCase())) return null;
	u = u.replace(/^@/, "");
	return isValidInstagramUsername(u) ? u.toLowerCase() : null;
}
function facebookFromUrl(url) {
	const m = /^(?:https?:)?\/\/(?:www\.|m\.|web\.|tr-tr\.)?(?:facebook\.com|fb\.com)\/([^?#]*)/i.exec(url.trim());
	if (!m) return null;
	const parts = m[1].split("/").filter(Boolean);
	if (!parts.length) return null;
	const first = parts[0];
	if (FB_RESERVED.has(first.toLowerCase())) {
		if (first.toLowerCase() === "pages" && parts.length >= 3) return `pages/${parts[1]}/${parts[2]}`;
		return null;
	}
	if (!/^[A-Za-z0-9.\-_%]+$/.test(first)) return null;
	return first;
}
var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
var BAD_EMAIL_DOMAINS = /(^|\.)(example\.com|sentry\.io|wixpress\.com|domain\.com|email\.com|yourdomain\.com)$/i;
var BAD_EMAIL_EXT = /\.(png|jpe?g|gif|webp|svg|css|js)$/i;
function cleanEmail(raw) {
	let e = decodeURIComponent(raw.trim()).split("?")[0].toLowerCase();
	e = e.replace(/^mailto:/, "");
	if (!EMAIL_RE.test(e)) return null;
	if (BAD_EMAIL_EXT.test(e)) return null;
	if (BAD_EMAIL_DOMAINS.test(e.split("@")[1])) return null;
	return e;
}
function uniq(a) {
	return [...new Set(a)];
}
/** HTML'den herkese açık iletişim bilgilerini çıkarır. */
function extractContacts(html) {
	const out = {
		instagram: [],
		facebook: [],
		emails: [],
		phones: [],
		whatsapp: []
	};
	let $;
	try {
		$ = cheerio.load(html);
	} catch {
		return out;
	}
	const consumeUrl = (href) => {
		const ig = instagramFromUrl(href);
		if (ig) out.instagram.push(ig);
		const fb = facebookFromUrl(href);
		if (fb) out.facebook.push(fb);
	};
	$("a[href]").each((_, el) => {
		const href = ($(el).attr("href") || "").trim();
		if (!href) return;
		if (/^mailto:/i.test(href)) {
			const e = cleanEmail(href);
			if (e) out.emails.push(e);
		} else if (/^tel:/i.test(href)) {
			const p = normalizePhone(decodeURIComponent(href.slice(4)));
			if (p) out.phones.push(p.e164);
		} else if (/(?:wa\.me\/|api\.whatsapp\.com\/send|web\.whatsapp\.com\/send)/i.test(href)) {
			let num = null;
			const m1 = /wa\.me\/(\+?\d+)/i.exec(href);
			const m2 = /[?&]phone=(\+?\d+)/i.exec(href);
			num = m1 && m1[1] || m2 && m2[1] || null;
			if (num) {
				const p = normalizePhone("+" + num.replace(/^\+/, ""));
				if (p) out.whatsapp.push(p.e164);
			}
		} else consumeUrl(href);
	});
	$("script[type=\"application/ld+json\"]").each((_, el) => {
		const txt = $(el).contents().text();
		try {
			walkLd(JSON.parse(txt), out);
		} catch {}
	});
	out.instagram = uniq(out.instagram);
	out.facebook = uniq(out.facebook);
	out.emails = uniq(out.emails);
	out.phones = uniq(out.phones);
	out.whatsapp = uniq(out.whatsapp);
	return out;
}
function walkLd(node, out) {
	if (Array.isArray(node)) return node.forEach((n) => walkLd(n, out));
	if (!node || typeof node !== "object") return;
	const o = node;
	const sameAs = o.sameAs;
	const urls = Array.isArray(sameAs) ? sameAs : typeof sameAs === "string" ? [sameAs] : [];
	for (const u of urls) {
		if (typeof u !== "string") continue;
		const ig = instagramFromUrl(u);
		if (ig) out.instagram.push(ig);
		const fb = facebookFromUrl(u);
		if (fb) out.facebook.push(fb);
	}
	if (typeof o.telephone === "string") {
		const p = normalizePhone(o.telephone);
		if (p) out.phones.push(p.e164);
	}
	if (typeof o.email === "string") {
		const e = cleanEmail(o.email);
		if (e) out.emails.push(e);
	}
	for (const v of Object.values(o)) if (v && typeof v === "object") walkLd(v, out);
}
/** robots.txt: verilen yol * ajanı için yasak mı? (basit ve muhafazakâr) */
function robotsAllows(robotsTxt, path, agentName = "dubleMusteriBulucu") {
	const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean);
	const groups = [];
	let cur = null;
	let lastWasAgent = false;
	for (const l of lines) {
		const i = l.indexOf(":");
		if (i < 0) continue;
		const k = l.slice(0, i).trim().toLowerCase();
		const v = l.slice(i + 1).trim();
		if (k === "user-agent") {
			if (!cur || !lastWasAgent) {
				cur = {
					agents: [],
					rules: []
				};
				groups.push(cur);
			}
			cur.agents.push(v.toLowerCase());
			lastWasAgent = true;
		} else if (k === "allow" || k === "disallow") {
			lastWasAgent = false;
			if (cur) cur.rules.push({
				allow: k === "allow",
				path: v
			});
		} else lastWasAgent = false;
	}
	const me = agentName.toLowerCase();
	const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && me.includes(a)));
	const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
	let best = null;
	for (const g of chosen) for (const r of g.rules) {
		if (!r.path) continue;
		if (matchRobots(r.path, path)) {
			const len = r.path.length;
			if (!best || len > best.len || len === best.len && r.allow) best = {
				allow: r.allow,
				len
			};
		}
	}
	return best ? best.allow : true;
}
function matchRobots(rule, path) {
	const anchored = rule.endsWith("$");
	const body = anchored ? rule.slice(0, -1) : rule;
	return new RegExp("^" + body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : "")).test(path);
}
// src/shared/cities.ts
/** 81 il: plaka kodu → ad. ISO3166-2 etiketi TR-<plaka> biçimindedir. */
var CITIES = [
	["01", "Adana"],
	["02", "Adıyaman"],
	["03", "Afyonkarahisar"],
	["04", "Ağrı"],
	["05", "Amasya"],
	["06", "Ankara"],
	["07", "Antalya"],
	["08", "Artvin"],
	["09", "Aydın"],
	["10", "Balıkesir"],
	["11", "Bilecik"],
	["12", "Bingöl"],
	["13", "Bitlis"],
	["14", "Bolu"],
	["15", "Burdur"],
	["16", "Bursa"],
	["17", "Çanakkale"],
	["18", "Çankırı"],
	["19", "Çorum"],
	["20", "Denizli"],
	["21", "Diyarbakır"],
	["22", "Edirne"],
	["23", "Elazığ"],
	["24", "Erzincan"],
	["25", "Erzurum"],
	["26", "Eskişehir"],
	["27", "Gaziantep"],
	["28", "Giresun"],
	["29", "Gümüşhane"],
	["30", "Hakkâri"],
	["31", "Hatay"],
	["32", "Isparta"],
	["33", "Mersin"],
	["34", "İstanbul"],
	["35", "İzmir"],
	["36", "Kars"],
	["37", "Kastamonu"],
	["38", "Kayseri"],
	["39", "Kırklareli"],
	["40", "Kırşehir"],
	["41", "Kocaeli"],
	["42", "Konya"],
	["43", "Kütahya"],
	["44", "Malatya"],
	["45", "Manisa"],
	["46", "Kahramanmaraş"],
	["47", "Mardin"],
	["48", "Muğla"],
	["49", "Muş"],
	["50", "Nevşehir"],
	["51", "Niğde"],
	["52", "Ordu"],
	["53", "Rize"],
	["54", "Sakarya"],
	["55", "Samsun"],
	["56", "Siirt"],
	["57", "Sinop"],
	["58", "Sivas"],
	["59", "Tekirdağ"],
	["60", "Tokat"],
	["61", "Trabzon"],
	["62", "Tunceli"],
	["63", "Şanlıurfa"],
	["64", "Uşak"],
	["65", "Van"],
	["66", "Yozgat"],
	["67", "Zonguldak"],
	["68", "Aksaray"],
	["69", "Bayburt"],
	["70", "Karaman"],
	["71", "Kırıkkale"],
	["72", "Batman"],
	["73", "Şırnak"],
	["74", "Bartın"],
	["75", "Ardahan"],
	["76", "Iğdır"],
	["77", "Yalova"],
	["78", "Karabük"],
	["79", "Kilis"],
	["80", "Osmaniye"],
	["81", "Düzce"]
].map(([code, name]) => ({
	code,
	name
}));
function cityByName(name) {
	const n = name.toLocaleLowerCase("tr");
	return CITIES.find((c) => c.name.toLocaleLowerCase("tr") === n);
}
function cityByCode(code) {
	return CITIES.find((c) => c.code === code);
}
// src/shared/types.ts
function dataQuality(b) {
	return [
		b.phone_e164 || b.phone,
		b.website,
		b.instagram,
		b.email
	].filter(Boolean).length;
}
// src/shared/overpass-query.ts
var esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
/** "anahtar=a|b" → Overpass filtresi: ["anahtar"~"^(a|b)$"] veya ["anahtar"="a"]. Geçersizse null. */
function specToFilter(spec) {
	const i = spec.indexOf("=");
	if (i <= 0) return null;
	const k = spec.slice(0, i).trim();
	const v = spec.slice(i + 1).trim();
	if (!k || !v || !/^[A-Za-z0-9_:\-]+$/.test(k)) return null;
	const vals = v.split("|").map((x) => x.trim()).filter(Boolean);
	if (!vals.length || vals.some((x) => !/^[A-Za-z0-9_:\-. ]+$/.test(x))) return null;
	if (vals.length === 1) return `["${k}"="${vals[0]}"]`;
	return `["${k}"~"^(${vals.join("|")})$"]`;
}
/** Etiket veya ad regex filtre kümesini döndürür (her biri bir sorgu kolu). */
function buildFilters(input) {
	if (input.nameRegex) return [`["name"~"${esc(input.nameRegex)}",i]`];
	return input.specs.map(specToFilter).filter((x) => !!x);
}
function buildOverpassQuery(input) {
	const filters = buildFilters(input);
	if (!filters.length) throw new Error("Geçerli bir etiket filtresi yok.");
	const to = input.timeout ?? 60;
	let areaDecl;
	if (input.province) {
		const code = input.province.padStart(2, "0");
		if (!cityByCode(code)) throw new Error("Geçersiz il kodu: " + input.province);
		if (input.district && input.district.trim()) areaDecl = `area["ISO3166-2"="TR-${code}"]->.p;\nrel["boundary"="administrative"]["admin_level"="6"]["name"="${esc(input.district.trim())}"](area.p);\nmap_to_area->.a;`;
		else areaDecl = `area["ISO3166-2"="TR-${code}"]->.a;`;
	} else areaDecl = `area["ISO3166-1"="TR"]["admin_level"="2"]->.a;`;
	const body = filters.map((f) => `  nwr${f}["name"](area.a);`).join("\n");
	return `[out:json][timeout:${to}];\n${areaDecl}\n(\n${body}\n);\nout center tags ${Math.max(1, Math.floor(input.limit))};`;
}
function firstTag(tags, keys) {
	for (const k of keys) if (tags[k] && tags[k].trim()) return tags[k].trim();
	return null;
}
function normalizeWebsite(raw) {
	if (!raw) return null;
	let w = raw.trim().split(/[;\s]/)[0];
	if (!w) return null;
	if (!/^https?:\/\//i.test(w)) w = "http://" + w;
	try {
		const u = new URL(w);
		if (!u.hostname.includes(".")) return null;
		return u.toString();
	} catch {
		return null;
	}
}
function elementToBusiness(el, city, sectorMap, forcedSector) {
	const t = el.tags || {};
	const name = (t.name || "").trim();
	if (!name) return null;
	const phoneRaw = firstTag(t, [
		"phone",
		"contact:phone",
		"mobile",
		"contact:mobile"
	]);
	const phone = pickFirstPhone(phoneRaw) || pickFirstPhone(firstTag(t, ["mobile", "contact:mobile"]));
	let website = normalizeWebsite(firstTag(t, [
		"website",
		"contact:website",
		"url"
	]));
	const igRaw = firstTag(t, ["contact:instagram", "instagram"]);
	let ig = igRaw ? parseInstagramInput(igRaw) : null;
	const fbRaw = firstTag(t, ["contact:facebook", "facebook"]);
	let fb = fbRaw ? /facebook\.com|fb\.com/i.test(fbRaw) ? facebookFromUrl(fbRaw) : /^[A-Za-z0-9.\-_]+$/.test(fbRaw) ? fbRaw : null : null;
	if (website) {
		const wIg = instagramFromUrl(website);
		const wFb = facebookFromUrl(website);
		if (wIg || /instagram\.com/i.test(website)) {
			ig = ig || wIg;
			website = null;
		} else if (wFb || /(facebook|fb)\.com/i.test(website)) {
			fb = fb || wFb;
			website = null;
		}
	}
	const emailRaw = firstTag(t, ["email", "contact:email"]);
	const email = emailRaw ? cleanEmail(emailRaw.split(";")[0]) : null;
	const addrParts = [
		t["addr:street"] && t["addr:street"] + (t["addr:housenumber"] ? " No:" + t["addr:housenumber"] : ""),
		t["addr:neighbourhood"] || t["addr:suburb"],
		t["addr:district"] || t["addr:subdistrict"]
	].filter(Boolean);
	const district = t["addr:district"] || t["addr:subdistrict"] || null;
	const lat = el.lat ?? el.center?.lat ?? null;
	const lon = el.lon ?? el.center?.lon ?? null;
	const fs = {};
	const b = {
		source: "OSM",
		source_id: `${el.type}/${el.id}`,
		name,
		sector: forcedSector ?? guessSectorFromTags(t, sectorMap),
		city: city || t["addr:city"] || null,
		district,
		address: addrParts.length ? addrParts.join(", ") : t["addr:full"] || null,
		lat,
		lon,
		phone: phone ? phone.e164 : phoneRaw,
		phone_e164: phone ? phone.e164 : null,
		whatsapp_url: whatsappUrl(phone),
		website,
		has_website: website ? 1 : 0,
		instagram: ig,
		facebook: fb,
		email,
		opening_hours: t.opening_hours || null,
		data_quality: 0,
		status: "Yeni",
		note: null,
		last_contact_at: null,
		field_sources: fs
	};
	for (const k of [
		"phone",
		"website",
		"instagram",
		"facebook",
		"email",
		"opening_hours",
		"address"
	]) if (b[k]) fs[k] = "OSM";
	b.data_quality = dataQuality(b);
	return b;
}
// src/shared/merge.ts
var TR_MAP = {
	ç: "c",
	ğ: "g",
	ı: "i",
	i̇: "i",
	ö: "o",
	ş: "s",
	ü: "u",
	â: "a",
	î: "i",
	û: "u"
};
function normName(s) {
	return s.toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g, (c) => TR_MAP[c] || c).replace(/i̇/g, "i").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function bigrams(s) {
	const m = /* @__PURE__ */ new Map();
	for (let i = 0; i < s.length - 1; i++) {
		const g = s.slice(i, i + 2);
		m.set(g, (m.get(g) || 0) + 1);
	}
	return m;
}
/** Dice katsayısı, 0..1 */
function nameSimilarity(a, b) {
	const x = normName(a);
	const y = normName(b);
	if (!x || !y) return 0;
	if (x === y) return 1;
	const bx = bigrams(x);
	const by = bigrams(y);
	let inter = 0;
	for (const [g, c] of bx) inter += Math.min(c, by.get(g) || 0);
	const total = [...bx.values()].reduce((s, v) => s + v, 0) + [...by.values()].reduce((s, v) => s + v, 0);
	return total ? 2 * inter / total : 0;
}
function distanceMeters(lat1, lon1, lat2, lon2) {
	const R = 6371e3;
	const toRad = (d) => d * Math.PI / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}
function isDuplicate(a, b) {
	if (a.source === b.source && a.source_id === b.source_id) return true;
	if (a.phone_e164 && a.phone_e164 === b.phone_e164) return true;
	if (nameSimilarity(a.name, b.name) >= .85 && a.lat != null && a.lon != null && b.lat != null && b.lon != null) return distanceMeters(a.lat, a.lon, b.lat, b.lon) < 150;
	return false;
}
var FIELDS = [
	"address",
	"district",
	"city",
	"phone",
	"phone_e164",
	"website",
	"instagram",
	"facebook",
	"email",
	"opening_hours",
	"sector",
	"lat",
	"lon"
];
/** primary üzerine secondary'den boş alanları tamamlar; alan kaynaklarını korur. */
function mergeBusinesses(primary, secondary) {
	const out = {
		...primary,
		field_sources: { ...primary.field_sources || {} }
	};
	const srcOf = (b, f) => b.field_sources && b.field_sources[f] || b.source;
	for (const f of FIELDS) if ((out[f] === null || out[f] === "" || out[f] === void 0) && secondary[f] !== null && secondary[f] !== void 0 && secondary[f] !== "") {
		out[f] = secondary[f];
		out.field_sources[f] = srcOf(secondary, f);
	}
	if (out.source !== secondary.source && !out.source.includes(secondary.source)) out.source = out.source + "+" + secondary.source;
	out.has_website = out.website ? 1 : 0;
	const p = normalizePhone(out.phone_e164 || out.phone);
	if (p) out.whatsapp_url = whatsappUrl(p);
	out.data_quality = dataQuality(out);
	return out;
}
/** Listeyi tekrarlardan arındırır; sıra korunur, eşleşenler birleştirilir. */
function dedupeMerge(list) {
	const out = [];
	for (const b of list) {
		const i = out.findIndex((x) => isDuplicate(x, b));
		if (i >= 0) out[i] = mergeBusinesses(out[i], b);
		else out.push(b);
	}
	return out;
}
// src/main/cache.ts
var TTL_MS = 6048e5;
var keyFile = (key) => (0, path.join)(cacheDir(), (0, crypto.createHash)("sha1").update(key).digest("hex") + ".json");
function cacheGet(key) {
	const f = keyFile(key);
	try {
		if (!(0, fs.existsSync)(f)) return null;
		if (Date.now() - (0, fs.statSync)(f).mtimeMs > TTL_MS) return null;
		return JSON.parse((0, fs.readFileSync)(f, "utf8"));
	} catch {
		return null;
	}
}
function cacheSet(key, value) {
	try {
		(0, fs.writeFileSync)(keyFile(key), JSON.stringify(value), "utf8");
	} catch {}
}
function cacheClear() {
	let n = 0;
	try {
		for (const f of (0, fs.readdirSync)(cacheDir())) if (f.endsWith(".json")) {
			(0, fs.rmSync)((0, path.join)(cacheDir(), f));
			n++;
		}
	} catch {}
	return n;
}
// src/main/overpass.ts
var MIN_GAP_MS = 2e3;
var lastStart = 0;
var chain = Promise.resolve();
var AbortedError = class extends Error {
	constructor() {
		super("İptal edildi");
	}
};
function sleep(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(new AbortedError());
		const t = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(t);
			reject(new AbortedError());
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
/** Eşzamanlı istek yok: kuyruğa alır, istekler arası en az 2 sn bırakır. */
function serialized(fn) {
	const run = chain.then(fn, fn);
	chain = run.catch(() => void 0);
	return run;
}
function describeStatus(status) {
	if (status === 429) return "istek kotası aşıldı (429)";
	if (status === 504) return "sunucu zaman aşımı (504)";
	if (status === 502 || status === 503) return `sunucu meşgul (${status})`;
	return `HTTP ${status}`;
}
async function runOverpass(query, endpoints, signal, onStatus) {
	const cached = cacheGet(query);
	if (cached) return {
		elements: cached,
		fromCache: true
	};
	if (!endpoints.length) throw new Error("Hiç Overpass uç noktası tanımlı değil. Ayarlar ekranından ekleyin.");
	return serialized(async () => {
		const maxAttempts = Math.max(4, endpoints.length * 2);
		let lastErr = "";
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			if (signal.aborted) throw new AbortedError();
			const wait = lastStart + MIN_GAP_MS - Date.now();
			if (wait > 0) await sleep(wait, signal);
			const endpoint = endpoints[attempt % endpoints.length];
			lastStart = Date.now();
			let host = endpoint;
			try {
				host = new URL(endpoint).host;
			} catch {}
			try {
				onStatus?.(`Overpass sorgulanıyor: ${host}`);
				const res = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"User-Agent": USER_AGENT,
						Accept: "application/json"
					},
					body: "data=" + encodeURIComponent(query),
					signal: AbortSignal.any([signal, AbortSignal.timeout(9e4)])
				});
				if (res.status === 429 || res.status >= 500) {
					lastErr = describeStatus(res.status);
					const backoff = Math.min(6e4, 2e3 * 2 ** attempt) + Math.random() * 500;
					onStatus?.(`${host}: ${lastErr}. ${Math.round(backoff / 1e3)} sn sonra yedek uç noktayla denenecek…`);
					await sleep(backoff, signal);
					continue;
				}
				if (!res.ok) {
					lastErr = describeStatus(res.status);
					continue;
				}
				const text = await res.text();
				let json;
				try {
					json = JSON.parse(text);
				} catch {
					lastErr = "sunucudan geçersiz yanıt geldi";
					continue;
				}
				if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark) && !(json.elements || []).length) {
					lastErr = "sorgu zaman aşımına uğradı veya çok büyük";
					await sleep(Math.min(3e4, 2e3 * 2 ** attempt), signal);
					continue;
				}
				const elements = json.elements || [];
				cacheSet(query, elements);
				return {
					elements,
					fromCache: false,
					endpoint
				};
			} catch (e) {
				if (signal.aborted) throw new AbortedError();
				const msg = e instanceof Error ? e.message : String(e);
				console.error("[overpass]", host, e instanceof Error && e.cause ? `${msg} (${String(e.cause.message ?? e.cause)})` : msg);
				lastErr = /timeout|aborted/i.test(msg) ? "bağlantı zaman aşımına uğradı" : "ağ bağlantısı kurulamadı";
				await sleep(Math.min(2e4, 1500 * 2 ** attempt), signal);
			}
		}
		throw new Error(`Overpass sunucularına ulaşılamadı (${lastErr}). İnternet bağlantınızı kontrol edin ya da biraz sonra tekrar deneyin.`);
	});
}
// src/main/enrich.ts
var PATHS = [
	"",
	"/iletisim",
	"/contact",
	"/hakkimizda",
	"/about"
];
var TIMEOUT_MS = 8e3;
var HOST_GAP_MS = 1e3;
var MAX_BYTES = 15e5;
var ROBOTS_NAME = "dubleMusteriBulucu";
var hostNext = /* @__PURE__ */ new Map();
var robotsCache = /* @__PURE__ */ new Map();
/** Aynı host'a istekler arası en az 1 sn: bir sonraki slotu rezerve eder. */
async function hostSlot(host, signal) {
	const now = Date.now();
	const at = Math.max(now, hostNext.get(host) ?? 0);
	hostNext.set(host, at + HOST_GAP_MS);
	if (at > now) await sleep(at - now, signal);
}
async function fetchText(url, signal, accept) {
	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": USER_AGENT,
				Accept: accept,
				"Accept-Language": "tr,en;q=0.5"
			},
			redirect: "follow",
			signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
		});
		const type = res.headers.get("content-type") || "";
		const reader = res.body?.getReader();
		if (!reader) return {
			text: "",
			type,
			ok: res.ok,
			finalUrl: res.url
		};
		const chunks = [];
		let total = 0;
		while (total < MAX_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			total += value.length;
		}
		reader.cancel().catch(() => void 0);
		return {
			text: Buffer.concat(chunks).toString("utf8"),
			type,
			ok: res.ok,
			finalUrl: res.url
		};
	} catch {
		return null;
	}
}
async function allowed(origin, path, signal) {
	if (!robotsCache.has(origin)) {
		const host = new URL(origin).host;
		await hostSlot(host, signal);
		const r = await fetchText(origin + "/robots.txt", signal, "text/plain");
		robotsCache.set(origin, r && r.ok && !/html/i.test(r.type) ? r.text : null);
	}
	const txt = robotsCache.get(origin);
	return txt ? robotsAllows(txt, path || "/", ROBOTS_NAME) : true;
}
async function crawlSite(website, signal) {
	let base;
	try {
		base = new URL(website);
	} catch {
		return null;
	}
	if (!/^https?:$/.test(base.protocol)) return null;
	const merged = {
		instagram: [],
		facebook: [],
		emails: [],
		phones: [],
		whatsapp: []
	};
	let any = false;
	const seen = /* @__PURE__ */ new Set();
	for (const p of PATHS) {
		if (signal.aborted) break;
		const url = p === "" ? base.toString() : base.origin + p;
		if (seen.has(url)) continue;
		seen.add(url);
		try {
			if (!await allowed(base.origin, p === "" ? base.pathname : p, signal)) continue;
			await hostSlot(base.host, signal);
			const r = await fetchText(url, signal, "text/html,application/xhtml+xml");
			if (!r || !r.ok || !/html|xml|text/i.test(r.type || "text/html")) {
				if (p === "" && !r) break;
				continue;
			}
			any = true;
			const e = extractContacts(r.text);
			for (const k of [
				"instagram",
				"facebook",
				"emails",
				"phones",
				"whatsapp"
			]) merged[k].push(...e[k]);
		} catch (err) {
			if (signal.aborted) break;
		}
	}
	if (!any) return null;
	for (const k of [
		"instagram",
		"facebook",
		"emails",
		"phones",
		"whatsapp"
	]) merged[k] = [...new Set(merged[k])];
	return merged;
}
/** Çıkarılan bilgilerle işletmeyi doldurur (mevcut alanları ezmez). */
function applyEnrichment(b, e) {
	const out = {
		...b,
		field_sources: { ...b.field_sources || {} }
	};
	if (!out.instagram && e.instagram.length) {
		out.instagram = e.instagram[0];
		out.field_sources.instagram = "WEB";
	}
	if (!out.facebook && e.facebook.length) {
		out.facebook = e.facebook[0];
		out.field_sources.facebook = "WEB";
	}
	if (!out.email && e.emails.length) {
		out.email = e.emails[0];
		out.field_sources.email = "WEB";
	}
	if (!out.phone_e164) {
		const cand = e.whatsapp[0] || e.phones[0];
		const n = cand ? normalizePhone(cand) : null;
		if (n) {
			out.phone = n.e164;
			out.phone_e164 = n.e164;
			out.field_sources.phone = "WEB";
		}
	}
	const pn = normalizePhone(out.phone_e164);
	if (pn) out.whatsapp_url = whatsappUrl(pn) || (e.whatsapp.includes(pn.e164) ? "https://wa.me/" + pn.e164.slice(1) : null);
	else if (e.whatsapp.length) out.whatsapp_url = "https://wa.me/" + e.whatsapp[0].slice(1);
	out.data_quality = dataQuality(out);
	return out;
}
/** Eşzamanlı (varsayılan 5) zenginleştirme. */
async function enrichMany(items, signal, onEach, concurrency = 5) {
	let i = 0;
	const worker = async () => {
		while (!signal.aborted) {
			const idx = i++;
			if (idx >= items.length) return;
			const b = items[idx];
			if (!b.website) continue;
			const e = await crawlSite(b.website, signal).catch(() => null);
			if (signal.aborted) return;
			onEach(b, e ? applyEnrichment(b, e) : b);
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
// src/main/db.ts
var db = null;
var MIGRATIONS = [`CREATE TABLE businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sector TEXT, city TEXT, district TEXT, address TEXT,
    lat REAL, lon REAL,
    phone TEXT, phone_e164 TEXT, whatsapp_url TEXT,
    website TEXT, has_website INTEGER NOT NULL DEFAULT 0,
    instagram TEXT, facebook TEXT, email TEXT, opening_hours TEXT,
    data_quality INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Yeni',
    note TEXT, last_contact_at TEXT,
    field_sources TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source, source_id)
  );
  CREATE INDEX idx_biz_status ON businesses(status);
  CREATE INDEX idx_biz_phone ON businesses(phone_e164);
  CREATE TABLE searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT, sector TEXT, location TEXT,
    requested_count INTEGER, found_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE search_results (
    search_id INTEGER NOT NULL, business_id INTEGER NOT NULL,
    PRIMARY KEY (search_id, business_id)
  );`, `CREATE TABLE fsq_places (
    fsq_place_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT, locality TEXT, region TEXT, postcode TEXT, country TEXT,
    tel TEXT, website TEXT, email TEXT, instagram TEXT, facebook_id TEXT,
    categories TEXT, latitude REAL, longitude REAL,
    locality_norm TEXT, region_norm TEXT
  );
  CREATE INDEX idx_fsq_region ON fsq_places(region_norm);
  CREATE INDEX idx_fsq_locality ON fsq_places(locality_norm);`];
function getDb() {
	if (db) return db;
	db = new better_sqlite3.default(dbPath());
	db.pragma("journal_mode = WAL");
	migrate(db);
	return db;
}
function migrate(d) {
	const cur = d.pragma("user_version", { simple: true });
	for (let v = cur; v < MIGRATIONS.length; v++) d.transaction(() => {
		d.exec(MIGRATIONS[v]);
		d.pragma(`user_version = ${v + 1}`);
	})();
}
function closeDb() {
	db?.close();
	db = null;
}
var COLS = [
	"source",
	"source_id",
	"name",
	"sector",
	"city",
	"district",
	"address",
	"lat",
	"lon",
	"phone",
	"phone_e164",
	"whatsapp_url",
	"website",
	"has_website",
	"instagram",
	"facebook",
	"email",
	"opening_hours",
	"data_quality",
	"status",
	"note",
	"last_contact_at"
];
function rowToBusiness(r) {
	const { field_sources, ...rest } = r;
	let fs;
	try {
		fs = field_sources ? JSON.parse(field_sources) : void 0;
	} catch {
		fs = void 0;
	}
	return {
		...rest,
		field_sources: fs
	};
}
function saveBusinesses(list, searchId) {
	const d = getDb();
	const cols = [...COLS, "field_sources"];
	const insert = d.prepare(`INSERT INTO businesses (${cols.join(",")}) VALUES (${cols.map((c) => "@" + c).join(",")})
     ON CONFLICT(source, source_id) DO UPDATE SET
       name=excluded.name,
       sector=COALESCE(excluded.sector, sector), city=COALESCE(excluded.city, city), district=COALESCE(excluded.district, district),
       address=COALESCE(excluded.address, address), lat=COALESCE(excluded.lat, lat), lon=COALESCE(excluded.lon, lon),
       phone=COALESCE(excluded.phone, phone), phone_e164=COALESCE(excluded.phone_e164, phone_e164),
       whatsapp_url=COALESCE(excluded.whatsapp_url, whatsapp_url),
       website=COALESCE(excluded.website, website), has_website=CASE WHEN COALESCE(excluded.website, website) IS NULL THEN 0 ELSE 1 END,
       instagram=COALESCE(excluded.instagram, instagram), facebook=COALESCE(excluded.facebook, facebook),
       email=COALESCE(excluded.email, email), opening_hours=COALESCE(excluded.opening_hours, opening_hours),
       data_quality=excluded.data_quality, field_sources=excluded.field_sources, updated_at=datetime('now')
     RETURNING id`);
	const link = d.prepare("INSERT OR IGNORE INTO search_results (search_id, business_id) VALUES (?, ?)");
	const ids = [];
	d.transaction(() => {
		for (const b of list) {
			const p = {};
			for (const c of COLS) p[c] = b[c] ?? null;
			p.status = b.status || "Yeni";
			p.has_website = b.website ? 1 : 0;
			p.field_sources = b.field_sources ? JSON.stringify(b.field_sources) : null;
			const row = insert.get(p);
			ids.push(row.id);
			if (searchId) link.run(searchId, row.id);
		}
	})();
	return {
		saved: ids.length,
		ids
	};
}
function listSaved(f) {
	const where = [];
	const args = [];
	if (f.q && f.q.trim()) {
		const like = "%" + f.q.trim().replace(/[%_]/g, "") + "%";
		where.push("(name LIKE ? OR address LIKE ? OR phone LIKE ? OR website LIKE ? OR instagram LIKE ? OR email LIKE ? OR note LIKE ?)");
		args.push(like, like, like, like, like, like, like);
	}
	if (f.sector) where.push("sector = ?"), args.push(f.sector);
	if (f.city) where.push("city = ?"), args.push(f.city);
	if (f.status) where.push("status = ?"), args.push(f.status);
	const sql = `SELECT * FROM businesses ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY updated_at DESC, id DESC`;
	return getDb().prepare(sql).all(...args).map(rowToBusiness);
}
var EDITABLE = /* @__PURE__ */ new Set([
	"name",
	"sector",
	"city",
	"district",
	"address",
	"phone",
	"phone_e164",
	"whatsapp_url",
	"website",
	"has_website",
	"instagram",
	"facebook",
	"email",
	"opening_hours",
	"data_quality",
	"status",
	"note",
	"last_contact_at"
]);
function updateBusiness(id, patch) {
	const d = getDb();
	const keys = Object.keys(patch).filter((k) => EDITABLE.has(k));
	if (keys.length) d.prepare(`UPDATE businesses SET ${keys.map((k) => `${k} = @${k}`).join(", ")}, updated_at = datetime('now') WHERE id = @id`).run({
		...Object.fromEntries(keys.map((k) => [k, patch[k] ?? null])),
		id
	});
	const r = d.prepare("SELECT * FROM businesses WHERE id = ?").get(id);
	return r ? rowToBusiness(r) : null;
}
function deleteBusinesses(ids) {
	const d = getDb();
	const del = d.prepare("DELETE FROM businesses WHERE id = ?");
	const del2 = d.prepare("DELETE FROM search_results WHERE business_id = ?");
	return d.transaction(() => {
		let n = 0;
		for (const id of ids) {
			n += del.run(id).changes;
			del2.run(id);
		}
		return n;
	})();
}
function savedLookup() {
	const rows = getDb().prepare("SELECT source_id, phone_e164, status FROM businesses").all();
	const out = {
		sourceIds: /* @__PURE__ */ new Set(),
		phones: /* @__PURE__ */ new Set(),
		notInterestedIds: /* @__PURE__ */ new Set(),
		notInterestedPhones: /* @__PURE__ */ new Set()
	};
	for (const r of rows) {
		out.sourceIds.add(r.source_id);
		if (r.phone_e164) out.phones.add(r.phone_e164);
		if (r.status === "İlgilenmiyor") {
			out.notInterestedIds.add(r.source_id);
			if (r.phone_e164) out.notInterestedPhones.add(r.phone_e164);
		}
	}
	return out;
}
function facets() {
	const d = getDb();
	return {
		sectors: d.prepare("SELECT DISTINCT sector v FROM businesses WHERE sector IS NOT NULL ORDER BY v").all().map((r) => r.v),
		cities: d.prepare("SELECT DISTINCT city v FROM businesses WHERE city IS NOT NULL ORDER BY v").all().map((r) => r.v)
	};
}
function createSearch(query_text, sector, location, requested) {
	const r = getDb().prepare("INSERT INTO searches (query_text, sector, location, requested_count) VALUES (?,?,?,?)").run(query_text, sector, location, requested);
	return Number(r.lastInsertRowid);
}
function finishSearch(id, found) {
	getDb().prepare("UPDATE searches SET found_count = ? WHERE id = ?").run(found, id);
}
function fsqInsertMany(rows) {
	const d = getDb();
	const ins = d.prepare(`INSERT OR REPLACE INTO fsq_places (fsq_place_id,name,address,locality,region,postcode,country,tel,website,email,instagram,facebook_id,categories,latitude,longitude,locality_norm,region_norm)
     VALUES (@fsq_place_id,@name,@address,@locality,@region,@postcode,@country,@tel,@website,@email,@instagram,@facebook_id,@categories,@latitude,@longitude,@locality_norm,@region_norm)`);
	d.transaction(() => {
		for (const r of rows) ins.run({
			...r,
			locality_norm: r.locality ? normName(r.locality) : null,
			region_norm: r.region ? normName(r.region) : null
		});
	})();
}
function fsqCount() {
	return getDb().prepare("SELECT COUNT(*) c FROM fsq_places").get().c;
}
function fsqClear() {
	getDb().exec("DELETE FROM fsq_places");
}
function fsqIterate(cityNorm, districtNorm) {
	const where = [];
	const args = [];
	if (cityNorm) where.push("(region_norm = ? OR locality_norm = ?)"), args.push(cityNorm, cityNorm);
	if (districtNorm) where.push("locality_norm = ?"), args.push(districtNorm);
	return getDb().prepare(`SELECT * FROM fsq_places ${where.length ? "WHERE " + where.join(" AND ") : ""}`).iterate(...args);
}
// src/shared/csv.ts
/** Basit, akışlı RFC4180 CSV ayrıştırıcı (tırnak içinde satır sonu destekler). */
var CsvParser = class {
	field = "";
	row = [];
	inQuotes = false;
	pendingQuote = false;
	started = false;
	push(chunk) {
		const rows = [];
		let s = chunk;
		if (!this.started) {
			if (s.charCodeAt(0) === 65279) s = s.slice(1);
			this.started = true;
		}
		for (let i = 0; i < s.length; i++) {
			const c = s[i];
			if (this.pendingQuote) {
				this.pendingQuote = false;
				if (c === "\"") {
					this.field += "\"";
					continue;
				}
				this.inQuotes = false;
			}
			if (this.inQuotes) {
				if (c === "\"") this.pendingQuote = true;
				else this.field += c;
				continue;
			}
			if (c === "\"" && this.field === "") this.inQuotes = true;
			else if (c === ",") {
				this.row.push(this.field);
				this.field = "";
			} else if (c === "\n") {
				this.row.push(this.field.replace(/\r$/, ""));
				this.field = "";
				rows.push(this.row);
				this.row = [];
			} else this.field += c;
		}
		return rows;
	}
	end() {
		this.pendingQuote = false;
		this.inQuotes = false;
		if (this.field !== "" || this.row.length) {
			this.row.push(this.field.replace(/\r$/, ""));
			const r = [this.row];
			this.field = "";
			this.row = [];
			return r;
		}
		return [];
	}
};
/** Excel (TR) uyumu için ; ayraçlı, UTF-8 BOM'lu CSV. */
function toCsv(header, rows, sep = ";") {
	const q = (v) => {
		let s = v === null || v === void 0 ? "" : String(v);
		if (/^[=+\-@\t\r]/.test(s) && !/^\+?\d[\d\s]*$/.test(s)) s = "'" + s;
		return /["\n\r;,]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
	};
	return "﻿" + [header, ...rows].map((r) => r.map(q).join(sep)).join("\r\n") + "\r\n";
}
// src/main/fsq.ts
var n = (v) => v && v.trim() ? v.trim() : null;
var num = (v) => {
	const x = v ? parseFloat(v) : NaN;
	return Number.isFinite(x) ? x : null;
};
async function importFsqCsv(path, onProgress) {
	const parser = new CsvParser();
	let header = null;
	let idx = {};
	let batch = [];
	let imported = 0;
	let skipped = 0;
	const catCol = () => idx["fsq_category_labels"] ?? idx["categories"] ?? idx["category"] ?? -1;
	const handle = (rows) => {
		for (const r of rows) {
			if (!header) {
				header = r.map((h) => h.trim().toLowerCase());
				header.forEach((h, i) => idx[h] = i);
				if (idx["name"] === void 0 || idx["fsq_place_id"] === void 0 && idx["fsq_id"] === void 0) throw new Error("CSV başlığı tanınmadı. scripts/fsq_export_tr.py ile üretilen dosyayı seçin (fsq_place_id, name, … sütunları gerekli).");
				continue;
			}
			const g = (k) => idx[k] !== void 0 ? r[idx[k]] : void 0;
			const name = n(g("name"));
			const id = n(g("fsq_place_id")) || n(g("fsq_id"));
			const country = n(g("country"));
			if (!name || !id || country && country.toUpperCase() !== "TR") {
				skipped++;
				continue;
			}
			const ci = catCol();
			batch.push({
				fsq_place_id: id,
				name,
				address: n(g("address")),
				locality: n(g("locality")),
				region: n(g("region")),
				postcode: n(g("postcode")),
				country,
				tel: n(g("tel")),
				website: n(g("website")),
				email: n(g("email")),
				instagram: n(g("instagram")),
				facebook_id: n(g("facebook_id")),
				categories: ci >= 0 ? n(r[ci]) : null,
				latitude: num(g("latitude")),
				longitude: num(g("longitude"))
			});
			if (batch.length >= 2e3) {
				fsqInsertMany(batch);
				imported += batch.length;
				batch = [];
				onProgress(imported);
			}
		}
	};
	await new Promise((resolve, reject) => {
		const s = (0, fs.createReadStream)(path, { encoding: "utf8" });
		s.on("data", (chunk) => {
			try {
				handle(parser.push(chunk));
			} catch (e) {
				s.destroy();
				reject(e);
			}
		});
		s.on("end", () => {
			try {
				handle(parser.end());
				resolve();
			} catch (e) {
				reject(e);
			}
		});
		s.on("error", reject);
	});
	if (batch.length) {
		fsqInsertMany(batch);
		imported += batch.length;
	}
	onProgress(imported);
	return {
		imported,
		skipped
	};
}
function fsqToBusiness(r, fsqMap) {
	const phone = pickFirstPhone(r.tel);
	const website = normalizeWebsite(r.website);
	const ig = r.instagram ? parseInstagramInput(r.instagram) : null;
	const email = r.email ? cleanEmail(r.email) : null;
	const fs = {};
	const b = {
		source: "FSQ",
		source_id: r.fsq_place_id,
		name: r.name,
		sector: r.categories ? guessSectorFromFsq(r.categories, fsqMap) : null,
		city: r.region || r.locality,
		district: r.locality && r.locality !== r.region ? r.locality : null,
		address: r.address,
		lat: r.latitude,
		lon: r.longitude,
		phone: phone ? phone.e164 : r.tel,
		phone_e164: phone ? phone.e164 : null,
		whatsapp_url: whatsappUrl(phone),
		website,
		has_website: website ? 1 : 0,
		instagram: ig,
		facebook: r.facebook_id && /^[A-Za-z0-9.\-_]+$/.test(r.facebook_id) ? r.facebook_id : null,
		email,
		opening_hours: null,
		data_quality: 0,
		status: "Yeni",
		note: null,
		last_contact_at: null,
		field_sources: fs
	};
	for (const k of [
		"address",
		"phone",
		"website",
		"instagram",
		"facebook",
		"email"
	]) if (b[k]) fs[k] = "FSQ";
	b.data_quality = dataQuality(b);
	return b;
}
// src/main/search.ts
var bizKey = (b) => `${b.source}:${b.source_id}`;
function resolveSpecs(p, s) {
	if (p.sector === "__custom__") {
		const v = (p.customValue || "").trim();
		if (!v) throw new Error("Elle yaz alanı boş. Bir kelime ya da \"anahtar=değer\" girin.");
		if (p.customMode === "tag") {
			if (!/^[A-Za-z0-9_:\-]+=[A-Za-z0-9_:\-. |]+$/.test(v)) throw new Error("Etiket \"anahtar=değer\" biçiminde olmalı (ör. shop=bakery).");
			return {
				specs: [v],
				forcedSector: null
			};
		}
		try {
			new RegExp(v);
		} catch {
			throw new Error("Geçersiz düzenli ifade (regex): " + v);
		}
		return {
			specs: [],
			nameRegex: v,
			forcedSector: null
		};
	}
	const specs = s.sectorMap[p.sector];
	if (!specs || !specs.length) throw new Error(`"${p.sector}" için OSM etiketi tanımlı değil. Ayarlar > Eşleme tablosuna ekleyin.`);
	return {
		specs,
		forcedSector: p.sector
	};
}
async function runSearch(p, settings, sink, signal) {
	const target = Math.max(1, Math.min(500, Math.floor(p.count || 50)));
	let resolved;
	try {
		resolved = resolveSpecs(p, settings);
	} catch (e) {
		return {
			searchId: 0,
			found: 0,
			cancelled: false,
			error: e.message
		};
	}
	const provinces = p.allTurkey ? CITIES : p.cities.map((n) => cityByName(n)).filter((c) => !!c);
	if (!provinces.length) return {
		searchId: 0,
		found: 0,
		cancelled: false,
		error: "En az bir şehir seçin ya da \"Türkiye geneli\"ni işaretleyin."
	};
	const sectorLabel = p.sector === "__custom__" ? `Elle: ${p.customValue}` : p.sector;
	const locLabel = p.allTurkey ? "Türkiye geneli" : provinces.map((c) => c.name).join(", ") + (p.district ? " / " + p.district : "");
	const searchId = createSearch(p.customValue || p.sector, sectorLabel, locLabel, target);
	const lookup = savedLookup();
	const seen = /* @__PURE__ */ new Set();
	const emitted = [];
	let found = 0;
	let cancelled = false;
	let errMsg;
	let overpassErr;
	const useFsq = p.useFsq && fsqCount() > 0;
	const passesSavedFilters = (b) => {
		if (p.skipSaved && (lookup.sourceIds.has(b.source_id) || b.phone_e164 && lookup.phones.has(b.phone_e164))) return false;
		if (p.hideNotInterested && (lookup.notInterestedIds.has(b.source_id) || b.phone_e164 && lookup.notInterestedPhones.has(b.phone_e164))) return false;
		return true;
	};
	const passesFilters = (b, final) => {
		if (p.onlyNoWebsite && b.website) return false;
		if (p.onlyWithPhone && !b.phone_e164 && !b.phone) return final ? false : true;
		return true;
	};
	const emitProgress = (phase, message, idx) => sink.progress({
		phase,
		message,
		found,
		target,
		percent: Math.min(100, Math.round(Math.max(found / target * 100, idx / provinces.length * 100 * .5)))
	});
	try {
		for (let i = 0; i < provinces.length && found < target; i++) {
			if (signal.aborted) throw new AbortedError();
			const prov = provinces[i];
			const remaining = target - found;
			const quota = Math.max(1, Math.ceil(remaining / (provinces.length - i)));
			emitProgress("sorgu", `${prov.name} taranıyor (${i + 1}/${provinces.length})…`, i);
			let batch = [];
			try {
				const r = await runOverpass(buildOverpassQuery({
					specs: resolved.specs,
					nameRegex: resolved.nameRegex,
					province: prov.code,
					district: p.district,
					limit: Math.min(1e3, quota * 6 + 20)
				}), settings.endpoints, signal, (m) => sink.progress({
					phase: "ağ",
					message: m,
					found,
					target,
					percent: 0
				}));
				for (const el of r.elements) {
					const b = elementToBusiness(el, prov.name, settings.sectorMap, resolved.forcedSector);
					if (b) batch.push(b);
				}
			} catch (e) {
				if (e instanceof AbortedError) throw e;
				overpassErr = e.message;
				sink.progress({
					phase: "uyarı",
					message: `${prov.name}: ${e.message}`,
					found,
					target,
					percent: 0
				});
			}
			if (useFsq) {
				const cn = normName(prov.name);
				const dn = p.district ? normName(p.district) : null;
				let nm = null;
				if (resolved.nameRegex) nm = new RegExp(resolved.nameRegex, "i");
				const fb = [];
				for (const row of fsqIterate(cn, dn)) {
					if (nm && !nm.test(row.name)) continue;
					if (!nm && resolved.forcedSector && !(row.categories && guessSectorFromFsq(row.categories, settings.fsqCategoryMap) === resolved.forcedSector)) continue;
					if (!nm && !resolved.forcedSector) continue;
					const fbz = fsqToBusiness(row, settings.fsqCategoryMap);
					if (fbz.sector === null && resolved.forcedSector) fbz.sector = resolved.forcedSector;
					fbz.city = prov.name;
					fb.push(fbz);
					if (fb.length >= quota * 6 + 20) break;
				}
				batch.push(...fb);
			}
			batch = dedupeMerge(batch).filter((b) => !seen.has(bizKey(b)) && passesSavedFilters(b));
			batch = batch.filter((b) => !emitted.some((x) => x.phone_e164 && x.phone_e164 === b.phone_e164));
			batch.sort((a, b) => b.data_quality - a.data_quality);
			const pending = [];
			const toAdd = [];
			for (const b of batch) {
				if (!passesFilters(b, false)) continue;
				if (p.onlyWithPhone && !b.phone_e164 && !b.phone) {
					if (b.website) pending.push(b);
					continue;
				}
				if (toAdd.length < Math.min(quota, target - found)) toAdd.push(b);
			}
			if (toAdd.length) {
				toAdd.forEach((b) => seen.add(bizKey(b)));
				emitted.push(...toAdd);
				found += toAdd.length;
				sink.results(toAdd, "add");
			}
			emitProgress("zenginleştirme", `${prov.name}: ${found} işletme bulundu, web siteleri inceleniyor…`, i + 1);
			const toEnrich = [...toAdd, ...pending].filter((b) => b.website);
			if (toEnrich.length) await enrichMany(toEnrich, signal, (orig, enriched) => {
				const key = bizKey(orig);
				if (pending.includes(orig)) {
					if (passesFilters(enriched, true) && found < target && !seen.has(key)) {
						seen.add(key);
						emitted.push(enriched);
						found++;
						sink.results([enriched], "add");
						emitProgress("zenginleştirme", `${found} işletme`, i + 1);
					}
				} else if (enriched !== orig) {
					const k = emitted.findIndex((x) => bizKey(x) === key);
					if (k >= 0) emitted[k] = enriched;
					sink.results([enriched], "update");
				}
			});
		}
	} catch (e) {
		if (e instanceof AbortedError || signal.aborted) cancelled = true;
		else errMsg = e.message;
	}
	if (!errMsg && !cancelled && found === 0 && overpassErr) errMsg = overpassErr;
	finishSearch(searchId, found);
	emitProgress("bitti", cancelled ? "İptal edildi; o ana kadarki sonuçlar korundu." : errMsg ? "Hata" : "Tamamlandı", provinces.length);
	return {
		searchId,
		found,
		cancelled,
		error: errMsg
	};
}
// src/main/ipc.ts
var currentSearch = null;
var wrap = (fn) => async (e, ...a) => {
	try {
		return {
			ok: true,
			data: await fn(e, ...a)
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
	}
};
function openSafe(url) {
	let u;
	try {
		u = new URL(url);
	} catch {
		throw new Error("Geçersiz adres.");
	}
	if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Yalnızca http(s) adresleri açılır.");
	electron.shell.openExternal(u.toString());
}
function registerIpc(getWin) {
	electron.ipcMain.handle("settings:get", wrap(() => loadSettings()));
	electron.ipcMain.handle("settings:save", wrap((_e, s) => saveSettings(s)));
	electron.ipcMain.handle("search:start", wrap(async (e, params) => {
		if (currentSearch) throw new Error("Zaten devam eden bir arama var.");
		const ac = new AbortController();
		currentSearch = ac;
		try {
			return await runSearch(params, loadSettings(), {
				progress: (p) => e.sender.send("search:progress", p),
				results: (items, mode) => e.sender.send("search:results", {
					items,
					mode
				})
			}, ac.signal);
		} finally {
			currentSearch = null;
		}
	}));
	electron.ipcMain.handle("search:cancel", wrap(() => void currentSearch?.abort()));
	electron.ipcMain.handle("saved:list", wrap((_e, f) => listSaved(f || {})));
	electron.ipcMain.handle("saved:save", wrap((_e, items, searchId) => saveBusinesses(items, searchId)));
	electron.ipcMain.handle("saved:update", wrap((_e, id, patch) => {
		const p = { ...patch };
		if ("phone" in p) {
			const n = normalizePhone(p.phone);
			p.phone_e164 = n ? n.e164 : null;
			p.whatsapp_url = whatsappUrl(n);
		}
		if ("instagram" in p && p.instagram) {
			const u = parseInstagramInput(p.instagram);
			if (!u) throw new Error("Geçersiz Instagram kullanıcı adı.");
			p.instagram = u;
		}
		if ("website" in p) p.has_website = p.website ? 1 : 0;
		const r = updateBusiness(id, p);
		if (r) {
			const q = dataQuality(r);
			if (q !== r.data_quality) return updateBusiness(id, { data_quality: q });
		}
		return r;
	}));
	electron.ipcMain.handle("saved:delete", wrap((_e, ids) => deleteBusinesses(ids)));
	electron.ipcMain.handle("saved:facets", wrap(() => facets()));
	electron.ipcMain.handle("saved:exportCsv", wrap(async (_e, f) => {
		const rows = listSaved(f || {});
		const win = getWin();
		const opts = {
			title: "CSV olarak kaydet",
			defaultPath: "kayitli-isletmeler.csv",
			filters: [{
				name: "CSV",
				extensions: ["csv"]
			}]
		};
		const r = win ? await electron.dialog.showSaveDialog(win, opts) : await electron.dialog.showSaveDialog(opts);
		if (r.canceled || !r.filePath) return {
			path: null,
			count: 0
		};
		const header = [
			"Ad",
			"Sektör",
			"İl",
			"İlçe",
			"Adres",
			"Telefon",
			"WhatsApp",
			"Web sitesi",
			"Instagram",
			"Facebook",
			"E-posta",
			"Çalışma saatleri",
			"Durum",
			"Not",
			"Son iletişim",
			"Kaynak",
			"Veri doluluğu"
		];
		const data = rows.map((b) => [
			b.name,
			b.sector,
			b.city,
			b.district,
			b.address,
			b.phone_e164 || b.phone,
			b.whatsapp_url,
			b.website,
			b.instagram ? "https://www.instagram.com/" + b.instagram + "/" : "",
			b.facebook ? "https://www.facebook.com/" + b.facebook : "",
			b.email,
			b.opening_hours,
			b.status,
			b.note,
			b.last_contact_at,
			b.source,
			b.data_quality
		]);
		(0, fs.writeFileSync)(r.filePath, toCsv(header, data), "utf8");
		return {
			path: r.filePath,
			count: rows.length
		};
	}));
	const q = (s) => encodeURIComponent(s);
	electron.ipcMain.handle("external:google", wrap((_e, name, city) => openSafe(`https://www.google.com/search?q=${q(`${name} ${city || ""}`.trim())}`)));
	electron.ipcMain.handle("external:instagramSearch", wrap((_e, name, city) => openSafe(`https://www.google.com/search?q=${q(`site:instagram.com "${name}" ${city || ""}`.trim())}`)));
	electron.ipcMain.handle("external:open", wrap((_e, url) => openSafe(url)));
	electron.ipcMain.handle("instagram:validate", wrap((_e, input) => parseInstagramInput(input)));
	electron.ipcMain.handle("fsq:count", wrap(() => fsqCount()));
	electron.ipcMain.handle("fsq:clear", wrap(() => fsqClear()));
	electron.ipcMain.handle("fsq:import", wrap(async (e) => {
		const win = getWin();
		const opts = {
			title: "Foursquare CSV dosyasını seç",
			properties: ["openFile"],
			filters: [{
				name: "CSV",
				extensions: ["csv"]
			}]
		};
		const r = win ? await electron.dialog.showOpenDialog(win, opts) : await electron.dialog.showOpenDialog(opts);
		if (r.canceled || !r.filePaths[0]) return null;
		return {
			...await importFsqCsv(r.filePaths[0], (n) => e.sender.send("fsq:progress", n)),
			total: fsqCount()
		};
	}));
	electron.ipcMain.handle("cache:clear", wrap(() => cacheClear()));
}
// src/main/selftest.ts
/** Geliştirici duman testi: DUBLE_SELFTEST=1 electron . — gerçek Overpass'a bir kez sorar, DB'yi dener. */
async function selfTest() {
	const out = [];
	try {
		getDb();
		if (process.env.ST_FSQ_CSV) {
			const imp = await importFsqCsv(process.env.ST_FSQ_CSV, () => void 0);
			const found = [];
			for (const r of fsqIterate(normName("İstanbul"), null)) found.push(fsqToBusiness(r, loadSettings().fsqCategoryMap).name + "|" + fsqToBusiness(r, loadSettings().fsqCategoryMap).sector);
			console.log("[fsq]", JSON.stringify(imp), fsqCount(), found.join(" ; "));
			const res = [];
			const r = await runSearch({
				sector: "Berber",
				allTurkey: false,
				cities: ["İstanbul"],
				district: "",
				count: 10,
				onlyNoWebsite: false,
				onlyWithPhone: false,
				skipSaved: false,
				hideNotInterested: false,
				useFsq: true
			}, {
				...loadSettings(),
				endpoints: ["http://127.0.0.1:9/x"]
			}, {
				progress: () => void 0,
				results: (i) => res.push(...i)
			}, new AbortController().signal);
			console.log("[fsq-arama]", JSON.stringify(r).slice(0, 120), res.map((b) => b.name + ":" + b.phone_e164 + ":" + b.source).join(" ; "));
			electron.app.quit();
			return;
		}
		const ac = new AbortController();
		const t0 = Date.now();
		const r = await runSearch({
			sector: process.env.ST_SECTOR || "Kafe",
			allTurkey: false,
			cities: [process.env.ST_CITY || "Çanakkale"],
			district: process.env.ST_DISTRICT || "",
			count: 10,
			onlyNoWebsite: false,
			onlyWithPhone: false,
			skipSaved: true,
			hideNotInterested: true,
			useFsq: false
		}, loadSettings(), {
			progress: (p) => console.log("[ilerleme]", p.phase, p.message, `${p.found}/${p.target}`),
			results: (items, mode) => {
				if (mode === "add") out.push(...items);
				else for (const it of items) {
					const i = out.findIndex((x) => x.source_id === it.source_id);
					if (i >= 0) out[i] = it;
				}
			}
		}, ac.signal);
		console.log("[sonuç]", JSON.stringify(r), `${((Date.now() - t0) / 1e3).toFixed(1)} sn`);
		for (const b of out) console.log(" -", b.name, "|", b.phone_e164, "|", b.website, "|", b.instagram, "|", b.email);
		const s = saveBusinesses(out, r.searchId);
		const again = saveBusinesses(out, r.searchId);
		const list = listSaved({});
		if (list.length) updateBusiness(list[0].id, {
			status: "Mesaj atıldı",
			note: "test"
		});
		console.log("[db]", s.saved, again.saved, list.length, listSaved({ status: "Mesaj atıldı" }).length);
		console.log(r.error ? "SELFTEST FAIL: " + r.error : list.length === out.length && out.length > 0 ? "SELFTEST OK" : "SELFTEST FAIL: sayı uyuşmuyor");
	} catch (e) {
		console.log("SELFTEST FAIL", e);
	}
	electron.app.quit();
}
var tmpUserData = () => (0, fs.mkdtempSync)((0, path.join)((0, os.tmpdir)(), "dmb-"));
// src/main/index.ts
var win = null;
function createWindow() {
	win = new electron.BrowserWindow({
		width: 1360,
		height: 860,
		minWidth: 1e3,
		minHeight: 640,
		backgroundColor: "#F7F4EC",
		title: "duble Müşteri Bulucu",
		icon: (0, path.join)(__dirname, "../../build/icon.png"),
		webPreferences: {
			preload: (0, path.join)(__dirname, "../preload/index.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	});
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:\/\//i.test(url)) electron.shell.openExternal(url);
		return { action: "deny" };
	});
	win.webContents.on("will-navigate", (e, url) => {
		if (!url.startsWith("file://") && !url.startsWith("http://localhost")) e.preventDefault();
	});
	if (process.env["ELECTRON_RENDERER_URL"]) win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
	else win.loadFile((0, path.join)(__dirname, "../renderer/index.html"));
	win.on("closed", () => win = null);
}
if (process.env.DUBLE_SELFTEST) electron.app.setPath("userData", tmpUserData());
electron.app.whenReady().then(() => {
	if (process.env.DUBLE_SELFTEST) return void selfTest();
	getDb();
	registerIpc(() => win);
	createWindow();
	electron.app.on("activate", () => {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
electron.app.on("window-all-closed", () => {
	if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("before-quit", closeDb);
process.on("unhandledRejection", (e) => console.error("Yakalanmamış söz reddi:", e));
process.on("uncaughtException", (e) => console.error("Yakalanmamış hata:", e));
