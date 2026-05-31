import { MODULE_ID, SOCKET, STATE_SETTING } from "./constants.js";
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
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, applyAction);
});

Hooks.on("updateSetting", (setting) => {
  if (setting.key === `${MODULE_ID}.${STATE_SETTING}` || (setting.namespace === MODULE_ID && setting.key === STATE_SETTING)) {
    SeventeenCardsApp.renderIfOpen();
  }
});

Hooks.on("renderSceneControls", (_controls, html) => {
  const button = $(`<li class="scene-control seventeen-cards-control" title="17 Cards"><i class="fas fa-dice"></i></li>`);
  button.on("click", () => SeventeenCardsApp.show());
  html.find(".main-controls").append(button);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.find((control) => control.name === "token");
  if (!tokens) return;
  tokens.tools.push({
    name: "seventeen-cards",
    title: "17 Cards",
    icon: "fas fa-dice",
    button: true,
    onClick: () => SeventeenCardsApp.show()
  });
});
