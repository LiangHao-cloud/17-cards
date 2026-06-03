import { DEBUG_MODE_SETTING, MODULE_ID, SOCKET, STATE_SETTING } from "./constants.js";
import { SeventeenCardsApp } from "./app.js";
import { applyAction } from "./socket-controller.js";
import { emptyState } from "./state.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, STATE_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: emptyState()
  });

  game.settings.register(MODULE_ID, DEBUG_MODE_SETTING, {
    name: "Debug / Cheat Mode",
    hint: "Expose full card locations to Gamemasters for development and testing.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, applyAction);
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = { open: () => SeventeenCardsApp.show() };
  createOpenButton();
});

Hooks.on("updateSetting", (setting) => {
  const stateKey = `${MODULE_ID}.${STATE_SETTING}`;
  const debugKey = `${MODULE_ID}.${DEBUG_MODE_SETTING}`;
  if (setting.key === stateKey || setting.key === debugKey || (setting.namespace === MODULE_ID && [STATE_SETTING, DEBUG_MODE_SETTING].includes(setting.key))) {
    SeventeenCardsApp.renderIfOpen();
  }
});

function createOpenButton() {
  if (document.getElementById("seventeen-cards-open")) return;

  const button = document.createElement("button");
  button.id = "seventeen-cards-open";
  button.type = "button";
  button.title = "17 Cards";
  button.innerHTML = `<i class="fas fa-dice"></i><span>17 Cards</span>`;
  button.addEventListener("click", () => SeventeenCardsApp.show());

  const target = document.getElementById("ui-top") || document.body;
  target.appendChild(button);
}
