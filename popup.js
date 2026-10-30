const DEFAULT_RULES = [
  { code: "HTPROD", headerText: "HT Production", color: "#c62828" },
  { code: "HTPILOT", headerText: "HT Pilot", color: "#218c4f" },
  { code: "SEED", headerText: "SEED", color: "#1769aa" }
];
const rulesContainer = document.getElementById("rules");
const statusElement = document.getElementById("status");

function createField(labelText, value, placeholder, className) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  input.placeholder = placeholder || "";
  input.className = className;
  wrapper.append(label, input);
  return { wrapper, input };
}

function addRuleRow(rule = {}) {
  const row = document.createElement("div");
  row.className = "rule";
  const codeField = createField("URL / folder code", rule.code, "HTPROD", "rule-code");
  const headerField = createField("Sage X3 header text", rule.headerText, "HT Production", "rule-header");
  const colorWrapper = document.createElement("div");
  colorWrapper.className = "field color-field";
  const colorLabel = document.createElement("label");
  colorLabel.textContent = "Color";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = /^#[0-9a-f]{6}$/i.test(rule.color || "") ? rule.color : "#1769aa";
  colorInput.className = "rule-color";
  colorWrapper.append(colorLabel, colorInput);
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove";
  removeButton.textContent = "×";
  removeButton.title = "Remove environment";
  removeButton.addEventListener("click", () => row.remove());
  row.append(codeField.wrapper, headerField.wrapper, colorWrapper, removeButton);
  rulesContainer.appendChild(row);
}

function renderRules(rules) {
  rulesContainer.replaceChildren();
  rules.forEach(addRuleRow);
}
function readRules() {
  return Array.from(rulesContainer.querySelectorAll(".rule")).map(row => ({
    code: row.querySelector(".rule-code").value.trim().toUpperCase(),
    headerText: row.querySelector(".rule-header").value.trim(),
    color: row.querySelector(".rule-color").value
  })).filter(rule => rule.code);
}
async function loadRules() {
  try {
    const stored = await chrome.storage.sync.get("environmentRules");
    const rules = Array.isArray(stored.environmentRules) && stored.environmentRules.length
      ? stored.environmentRules : DEFAULT_RULES;
    renderRules(rules);
  } catch (_) {
    renderRules(DEFAULT_RULES);
    statusElement.textContent = "Could not load saved settings.";
  }
}

document.getElementById("addRule").addEventListener("click", () => {
  addRuleRow({ code: "", headerText: "", color: "#1769aa" });
});
document.getElementById("save").addEventListener("click", async () => {
  const rules = readRules();
  if (!rules.length) {
    statusElement.textContent = "Add at least one environment rule.";
    return;
  }
  const codes = rules.map(rule => rule.code);
  if (new Set(codes).size !== codes.length) {
    statusElement.textContent = "Each environment code must be unique.";
    return;
  }
  try {
    await chrome.storage.sync.set({ environmentRules: rules });
    statusElement.textContent = "Saved. Sage X3 will update automatically.";
  } catch (_) {
    statusElement.textContent = "Unable to save settings. Try again.";
  }
});
document.getElementById("reset").addEventListener("click", async () => {
  renderRules(DEFAULT_RULES);
  try {
    await chrome.storage.sync.set({ environmentRules: DEFAULT_RULES });
    statusElement.textContent = "Default colors restored.";
  } catch (_) {
    statusElement.textContent = "Unable to restore defaults.";
  }
});
loadRules();
