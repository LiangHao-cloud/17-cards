import { SOCKET } from "./constants.js";
import { confirmNextPhase, handleCall, handleExchange, handleFold, handleRaise, startMatch } from "./game-actions.js";
import { emptyState, getState, setState } from "./state.js";
import { enforceSocketPermission, isPrimaryActiveGm, requireGmUser } from "./permissions.js";

export async function requestAction(action, payload = {}) {
  if (game.user.isGM) {
    await applyAction({ action, payload, userId: game.user.id, direct: true });
    return;
  }
  game.socket.emit(SOCKET, { action, payload, userId: game.user.id });
}

export async function applyAction({ action, payload, userId, direct = false }) {
  if (!game.user.isGM) return;
  if (!direct && !isPrimaryActiveGm()) return;

  try {
    const state = getState();
    const user = game.users.get(userId);
    let next = state;

    if (action === "start") {
      requireGmUser(user);
      next = startMatch(payload);
    } else if (action === "reset") {
      requireGmUser(user);
      next = emptyState();
    } else if (action === "call") {
      enforceSocketPermission(state, payload.side, user);
      next = handleCall(state, payload.side);
    } else if (action === "raise") {
      enforceSocketPermission(state, payload.side, user);
      next = handleRaise(state, payload.side, payload.amount);
    } else if (action === "fold") {
      enforceSocketPermission(state, payload.side, user);
      next = handleFold(state, payload.side);
    } else if (action === "exchange") {
      enforceSocketPermission(state, payload.side, user);
      next = handleExchange(state, payload.side, payload.indexes || []);
    } else if (action === "confirm") {
      requireGmUser(user);
      next = confirmNextPhase(state);
    }

    await setState(next);
  } catch (error) {
    ui.notifications.warn(error.message);
  }
}
