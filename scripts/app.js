import { PHASE_LABELS, PHASES, SIDES } from "./constants.js";
import { cardToText } from "./cards.js";
import { currentRaiseLimits } from "./game-actions.js";
import { canActForSide, canSeeHand, sideLabel } from "./permissions.js";
import { requestAction } from "./socket-controller.js";
import { getState } from "./state.js";

const ApplicationV2 = foundry.applications?.api?.ApplicationV2;
const BaseApplication = ApplicationV2 || Application;
const IS_APPLICATION_V2 = Boolean(ApplicationV2);

export class SeventeenCardsApp extends BaseApplication {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "seventeen-cards",
    window: {
      title: "17 Cards",
      resizable: true
    },
    position: {
      width: 680
    },
    classes: ["seventeen-cards-app"]
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "seventeen-cards",
      title: "17 Cards",
      template: null,
      width: 680,
      height: "auto",
      resizable: true,
      classes: ["seventeen-cards-app"]
    });
  }

  static show() {
    if (!this.instance) this.instance = new this();
    if (IS_APPLICATION_V2) this.instance.render({ force: true });
    else this.instance.render(true);
  }

  static renderIfOpen() {
    if (!this.instance) return;
    if (IS_APPLICATION_V2) this.instance.render({ force: true });
    else ui.windows[this.instance.appId]?.render(false);
  }

  async _prepareContext() {
    return this.getData();
  }

  getData() {
    const state = getState();
    const users = game.users.filter((user) => !user.isGM && user.active);
    const raiseLimits = currentRaiseLimits(state);
    return {
      state,
      users,
      isGM: game.user.isGM,
      isOperator: game.user.id === state.operatorUserId,
      phaseLabel: PHASE_LABELS[state.phase],
      raiseLimits
    };
  }

  async _renderHTML(context) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.buildHtml(context);
    return wrapper.firstElementChild;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.activateDomListeners(this.element);
  }

  async _renderInner(data) {
    return $(this.buildHtml(data));
  }

  activateListeners(html) {
    super.activateListeners(html);
    const element = html instanceof HTMLElement ? html : html[0];
    this.activateDomListeners(element);
  }

  activateDomListeners(element) {
    if (!element) return;
    if (element.dataset.listenersBound === "true") return;
    element.dataset.listenersBound = "true";

    element.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-exchange-card]");
      if (card && element.contains(card)) {
        const input = card.querySelector("input[type='checkbox']");
        if (input && !input.disabled) {
          event.preventDefault();
          input.checked = !input.checked;
          card.classList.toggle("is-selected", input.checked);
        }
        return;
      }

      const button = event.target.closest("button");
      if (!button || !element.contains(button) || button.disabled) return;

      if (button.dataset.action === "start") {
        const form = element.querySelector(".seventeen-cards-setup");
        const data = new FormData(form);
        await requestAction("start", {
          gmChips: Number(data.get("gmChips")),
          playerChips: Number(data.get("playerChips")),
          operatorUserId: data.get("operatorUserId"),
          dealer: data.get("dealer")
        });
        return;
      }

      if (button.dataset.action === "reset") {
        await requestAction("reset");
        return;
      }

      if (button.dataset.action === "confirm") {
        await requestAction("confirm");
        return;
      }

      if (button.dataset.betAction) {
        const side = button.dataset.side;
        const amountInput = element.querySelector(`[data-raise-input='${side}']`);
        await requestAction(button.dataset.betAction, {
          side,
          amount: Number(amountInput?.value)
        });
        return;
      }

      if (button.dataset.action === "exchange") {
        const side = button.dataset.side;
        const indexes = [...element.querySelectorAll(`[data-exchange='${side}']:checked`)].map((input) => Number(input.value));
        await requestAction("exchange", { side, indexes });
      }
    });
  }

  buildHtml(data) {
    const { state } = data;
    return `
      <section class="seventeen-cards">
        ${this.renderHeader(data)}
        ${data.isGM ? this.renderSetup(data) : ""}
        ${state.active || state.phase === PHASES.MATCH_END ? this.renderTable(data) : this.renderEmpty()}
      </section>
    `;
  }

  renderHeader(data) {
    return `
      <header class="seventeen-cards__header">
        <div>
          <h2>17 Cards</h2>
          <p>Round ${data.state.round || 0}/${data.state.maxRounds} - ${data.phaseLabel}</p>
        </div>
        <div class="seventeen-cards__actions">
          ${data.isGM ? `<button type="button" data-action="reset"><i class="fas fa-rotate-left"></i> Reset</button>` : ""}
        </div>
      </header>
    `;
  }

  renderSetup(data) {
    const state = data.state;
    const users = data.users.map((user) => `
      <option value="${user.id}" ${state.operatorUserId === user.id ? "selected" : ""}>${user.name}</option>
    `).join("");

    return `
      <form class="seventeen-cards-setup">
        <label>
          GM Chips
          <input type="number" name="gmChips" min="5" step="1" value="${state.chips[SIDES.GM] ?? 100}">
        </label>
        <label>
          Player Chips
          <input type="number" name="playerChips" min="5" step="1" value="${state.chips[SIDES.PLAYERS] ?? 100}">
        </label>
        <label>
          Player Operator
          <select name="operatorUserId">
            <option value="">Select active player</option>
            ${users}
          </select>
        </label>
        <label>
          Dealer
          <select name="dealer">
            <option value="${SIDES.GM}" ${state.dealer === SIDES.GM ? "selected" : ""}>Gamemaster</option>
            <option value="${SIDES.PLAYERS}" ${state.dealer === SIDES.PLAYERS ? "selected" : ""}>Players</option>
          </select>
        </label>
        <button type="button" data-action="start"><i class="fas fa-play"></i> Start Match</button>
      </form>
    `;
  }

  renderEmpty() {
    return `<p class="seventeen-cards__empty">The GM can start a 17 Cards match from this panel.</p>`;
  }

  renderTable(data) {
    const { state } = data;
    return `
      <div class="seventeen-cards__status">
        <span>House: ${state.house}</span>
        <span>Committed: GM ${state.committed[SIDES.GM]} / Players ${state.committed[SIDES.PLAYERS]}</span>
        <span>Turn: ${state.turn ? sideLabel(state.turn) : "GM confirmation"}</span>
      </div>
      ${this.renderActionLog(data)}
      <div class="seventeen-cards__sides">
        ${this.renderSide(data, SIDES.GM)}
        ${this.renderSide(data, SIDES.PLAYERS)}
      </div>
      ${this.renderResult(data)}
      ${this.renderGmConfirm(data)}
    `;
  }

  renderSide(data, side) {
    const { state } = data;
    const isTurn = state.turn === side;
    const canAct = canActForSide(state, side);
    const canUseBetActions = canAct && isTurn && [PHASES.FIRST_BETTING, PHASES.SECOND_BETTING].includes(state.phase);
    const canExchange = canAct && state.phase === PHASES.EXCHANGE && !state.exchangeDone[side];
    const visible = canSeeHand(state, side);

    return `
      <article class="seventeen-cards-side ${isTurn ? "is-turn" : ""}">
        <header>
          <h3>${sideLabel(side)}</h3>
          <strong>${state.chips[side]} chips</strong>
        </header>
        <div class="seventeen-cards-hand">
          ${state.hands[side].map((card, index) => this.renderCard(card, index, side, visible, canExchange)).join("")}
        </div>
        <div class="seventeen-cards-side__meta">
          <span>Committed ${state.committed[side]}</span>
          ${state.exchangeDone[side] ? "<span>Exchange done</span>" : ""}
        </div>
        ${this.renderExchangeLog(data, side, visible)}
        ${this.renderBetControls(data, side, canUseBetActions)}
        ${canExchange ? `<button type="button" data-action="exchange" data-side="${side}"><i class="fas fa-repeat"></i> Exchange Selected</button>` : ""}
      </article>
    `;
  }

  renderCard(card, index, side, visible, canExchange) {
    const label = visible ? cardToText(card) : "?";
    return `
      <label class="seventeen-cards-card ${visible ? "" : "is-hidden"} ${canExchange ? "can-exchange" : ""}" ${canExchange ? `data-exchange-card="${side}"` : ""}>
        ${canExchange ? `<input type="checkbox" data-exchange="${side}" value="${index}" aria-label="Exchange ${label}">` : ""}
        <span>${label}</span>
      </label>
    `;
  }

  renderBetControls(data, side, enabled) {
    const limits = data.raiseLimits;
    if (!limits) return "";
    const disabled = enabled ? "" : "disabled";
    const hasCallAmount = Number(limits.callAmount) > 0;
    const canRaise = enabled && limits.min <= limits.max;
    const raiseDisabled = canRaise ? "" : "disabled";
    const callLabel = hasCallAmount ? `Call ${limits.callAmount}` : "Call";
    return `
      <div class="seventeen-cards-bets">
        <button type="button" data-bet-action="call" data-side="${side}" ${disabled}>${callLabel}</button>
        <button type="button" data-bet-action="fold" data-side="${side}" ${disabled}>Fold</button>
        <input type="number" data-raise-input="${side}" min="${limits.min}" max="${limits.max}" step="1" value="${Math.min(limits.min, limits.max)}" ${raiseDisabled}>
        <button type="button" data-bet-action="raise" data-side="${side}" ${raiseDisabled}>Raise to</button>
      </div>
      <p class="seventeen-cards-hint">${canRaise ? `Raise to ${limits.min}-${limits.max}` : `Maximum bet reached. ${hasCallAmount ? `Call ${limits.callAmount} or fold.` : "Call or fold."}`}</p>
    `;
  }

  renderActionLog(data) {
    const logs = data.state.roundLogs?.actions?.length ? data.state.roundLogs.actions : [data.state.lastAction];
    return `
      <section class="seventeen-cards-log" aria-label="Round log">
        ${logs.map((log) => `<p>${log}</p>`).join("")}
      </section>
    `;
  }

  renderExchangeLog(data, side, visible) {
    if (!visible) {
      return `
        <details class="seventeen-cards-exchange-log">
          <summary>Exchange Log</summary>
          <p>?</p>
        </details>
      `;
    }

    const exchanges = data.state.roundLogs?.exchanges?.[side] || [];
    const body = exchanges.length
      ? exchanges.map((entry, index) => `
        <p>
          <strong>${index + 1}.</strong>
          Out: ${entry.discarded.length ? entry.discarded.join(", ") : "none"}
        </p>
      `).join("")
      : "<p>No cards exchanged this round.</p>";

    return `
      <details class="seventeen-cards-exchange-log">
        <summary>Exchange Log</summary>
        ${body}
      </details>
    `;
  }

  renderResult(data) {
    const result = data.state.result;
    if (!result) return "";
    return `
      <section class="seventeen-cards-result">
        <h3>Result</h3>
        <p>${result.reason || ""}</p>
        ${result.handRank ? `<p>Winning hand: ${result.handRank}</p>` : ""}
        ${result.matchReason ? `<p>${result.matchReason}</p>` : ""}
      </section>
    `;
  }

  renderGmConfirm(data) {
    if (!data.isGM) return "";
    const confirmable = [PHASES.FIRST_BETTING, PHASES.EXCHANGE, PHASES.SECOND_BETTING, PHASES.SHOWDOWN, PHASES.ROUND_END].includes(data.state.phase);
    if (!confirmable || data.state.phase === PHASES.MATCH_END) return "";
    const label = data.state.phase === PHASES.SHOWDOWN ? "Resolve Showdown" : data.state.phase === PHASES.ROUND_END ? "Next Round" : "Confirm Next Phase";
    return `
      <footer class="seventeen-cards__footer">
        <button type="button" data-action="confirm"><i class="fas fa-forward"></i> ${label}</button>
      </footer>
    `;
  }
}
