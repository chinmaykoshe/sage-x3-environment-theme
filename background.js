// Sage X3 Environment Theme: per-tab toolbar badge.
function compactBadge(code) {
    const value = String(code || "DEV").toUpperCase();
    return (value.startsWith("HT") ? value.slice(2) : value).slice(0, 4) || "DEV";
}

async function setBadge(tabId, environment) {
    if (typeof tabId !== "number") return;
    const matched = Boolean(environment && environment.code);
    const code = matched ? environment.code : "DEV";
    const text = matched ? compactBadge(code) : "DEV";
    const color = matched && environment.color ? environment.color : "#1769aa";
    const title = matched ? `Sage X3 - ${code}` : "Sage X3 - Development / default environment";
    try {
        await chrome.action.setBadgeText({ tabId, text });
        await chrome.action.setBadgeBackgroundColor({ tabId, color });
        await chrome.action.setTitle({ tabId, title });
    } catch (_) {}
}

function requestDetection(tabId) {
    chrome.tabs.sendMessage(tabId, { type: "HT_X3_RECHECK" }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.type === "HT_X3_ENVIRONMENT" && typeof sender.tab?.id === "number") {
        setBadge(sender.tab.id, message.environment || null);
    }
});

chrome.tabs.onActivated.addListener(({ tabId }) => requestDetection(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete" || changeInfo.url) requestDetection(tabId);
});
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    try {
        const [tab] = await chrome.tabs.query({ active: true, windowId });
        if (tab?.id !== undefined) requestDetection(tab.id);
    } catch (_) {}
});
async function initializeActiveTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id !== undefined) requestDetection(tab.id);
    } catch (_) {}
}
chrome.runtime.onInstalled.addListener(initializeActiveTab);
chrome.runtime.onStartup.addListener(initializeActiveTab);
