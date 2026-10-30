// Detect Sage X3 environment using both URL folder codes and Sage X3 header metadata.
const DEFAULT_RULES = [
    { code: "HTPROD", headerText: "HT Production", color: "#c62828" },
    { code: "HTPILOT", headerText: "HT Pilot", color: "#218c4f" },
    { code: "SEED", headerText: "SEED", color: "#1769aa" }
];
const DEFAULT_COLOR = "#1769aa";
const STYLE_ID = "ht-x3-environment-theme-style";
let environmentRules = DEFAULT_RULES;
let observer;
let debounceHandle;
let lastSignature = "";

function normalize(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function decodeUrl(value) {
    let result = String(value || "");
    for (let i = 0; i < 5; i++) {
        try {
            const decoded = decodeURIComponent(result);
            if (decoded === result) break;
            result = decoded;
        } catch (_) { break; }
    }
    return result;
}
function collectHeaderText() {
    const values = [];
    // The inspected Sage X3 DOM exposes the environment as #s_app[data-s-endpoint].
    const appRoot = document.querySelector("#s_app[data-s-endpoint], [data-s-endpoint]");
    if (appRoot) {
        values.push(appRoot.getAttribute("data-s-endpoint") || "");
        values.push(appRoot.getAttribute("data-s-role") || "");
    }
    const endpoint = document.querySelector(".s_endpoint_profile_endpoint");
    if (endpoint) values.push(endpoint.innerText || endpoint.textContent || "");
    return values.filter(Boolean).join(" | ");
}
function getMatchedRule() {
    const url = normalize(decodeUrl(window.location.href));
    const header = normalize(collectHeaderText());
    for (const rule of environmentRules) {
        const code = normalize(rule.code);
        if (!code) continue;
        const aliases = String(rule.headerText || "").split(";").map(normalize).filter(Boolean);
        if (url.includes(code) || header.includes(code) || aliases.some(alias => header.includes(alias))) {
            return rule;
        }
    }
    return null;
}
function ensureThemeStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        header.s_profile_bar[data-ht-x3-environment],
        header.s_profile_bar[data-ht-x3-environment] > ul.s_profile_bar_bar {
            background-color: var(--ht-x3-environment-color) !important;
            background-image: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}
function applyHeaderColor(rule) {
    const header = document.querySelector("header.s_profile_bar");
    if (!header) return;
    ensureThemeStyle();
    const code = rule ? String(rule.code).toUpperCase() : "DEV";
    const color = rule?.color || DEFAULT_COLOR;
    if (header.getAttribute("data-ht-x3-environment") !== code) {
        header.setAttribute("data-ht-x3-environment", code);
    }
    if (header.style.getPropertyValue("--ht-x3-environment-color") !== color) {
        header.style.setProperty("--ht-x3-environment-color", color);
    }
}
function publishEnvironment(rule) {
    const payload = rule ? { code: rule.code, color: rule.color } : null;
    const signature = payload ? `${payload.code}|${payload.color}` : "DEV|";
    if (signature === lastSignature) return;
    lastSignature = signature;
    chrome.runtime.sendMessage({ type: "HT_X3_ENVIRONMENT", environment: payload }).catch(() => {});
}
function detectAndApply() {
    const rule = getMatchedRule();
    applyHeaderColor(rule);
    publishEnvironment(rule);
}
function scheduleDetection() {
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(detectAndApply, 250);
}
async function loadRules() {
    try {
        const stored = await chrome.storage.sync.get("environmentRules");
        if (Array.isArray(stored.environmentRules) && stored.environmentRules.length) {
            environmentRules = stored.environmentRules;
        }
    } catch (_) { environmentRules = DEFAULT_RULES; }
    detectAndApply();
}
chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "HT_X3_RECHECK") detectAndApply();
});
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.environmentRules) {
        const next = changes.environmentRules.newValue;
        environmentRules = Array.isArray(next) && next.length ? next : DEFAULT_RULES;
        detectAndApply();
    }
});
function startObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(scheduleDetection);
    observer.observe(document.documentElement, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ["data-s-endpoint", "data-s-role"]
    });
}
loadRules();
startObserver();
document.addEventListener("visibilitychange", () => { if (!document.hidden) detectAndApply(); });
window.addEventListener("load", detectAndApply);
