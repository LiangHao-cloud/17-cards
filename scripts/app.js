import { PHASE_LABELS, PHASES, SIDES } from "./constants.js";
import { cardToText } from "./cards.js";
import { currentRaiseLimits } from "./game-actions.js";
import { canActForSide, canSeeHand, sideLabel } from "./permissions.js";
import { requestAction } from "./socket-controller.js";
import { getState } from "./state.js";

export class SeventeenCardsApp extends Application {
  static instance = null;

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
    this.instance.render(true);
  }

  static renderIfOpen() {
    ui.windows[this.instance?.appId]?.render(false);
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

  async _renderInner(data) {
    return $(this.buildHtml(data));
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("[data-action='start']").on("click", async () => {
      const form = html.find(".seventeen-cards-setup")[0];
      const data = new FormData(form);
      await requestAction("start", {
        gmChips: Number(data.get("gmChips")),
        playerChips: Number(data.get("playerChips")),
        operatorUserId: data.get("operatorUserId"),
        dealer: data.get("dealer")
      });
    });

    html.find("[data-action='reset']").on("click", () => requestAction("reset"));
    html.find("[data-action='confirm']").on("click", () => requestAction("confirm"));

    html.find("[data-bet-action]").on("click", async (event) => {
      const button = event.currentTarget;
      const action = button.dataset.betAction;
      const side = button.dataset.side;
      const amountInput = html.find(`[data-raise-input='${side}']`);
      await requestAction(action, {
        side,
        amount: Number(amountInput.val())
      });
    });

    html.find("[data-action='exchange']").on("click", async (event) => {
      const side = event.currentTarget.dataset.side;
      const indexes = html.find(`[data-exchange='${side}']:checked`).map((_, input) => Number(input.value)).get();
      await requestAction("exchange", { side, indexes });
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
      <p class="seventeen-cards__last">${state.lastAction}</p>
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
        ${this.renderBetControls(data, side, canUseBetActions)}
        ${canExchange ? `<button type="button" data-action="exchange" data-side="${side}"><i class="fas fa-repeat"></i> Exchange Selected</button>` : ""}
      </article>
    `;
  }

  renderCard(card, index, side, visible, canExchange) {
    const label = visible ? cardToText(card) : "Hidden";
    return `
      <label class="seventeen-cards-card ${visible ? "" : "is-hidden"}">
        ${canExchange ? `<input type="checkbox" data-exchange="${side}" value="${index}">` : ""}
        <span>${label}</span>
      </label>
    `;
  }

  renderBetControls(data, side, enabled) {
    const limits = data.raiseLimits;
    if (!limits) return "";
    const disabled = enabled ? "" : "disabled";
    return `
      <div class="seventeen-cards-bets">
        <button type="button" data-bet-action="call" data-side="${side}" ${disabled}>Call</button>
        <button type="button" data-bet-action="fold" data-side="${side}" ${disabled}>Fold</button>
        <input type="number" data-raise-input="${side}" min="${limits.min}" max="${limits.max}" step="1" value="${limits.min}" ${disabled}>
        <button type="button" data-bet-action="raise" data-side="${side}" ${disabled}>Raise</button>
      </div>
      <p class="seventeen-cards-hint">Raise ${limits.min}-${limits.max}</p>
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
