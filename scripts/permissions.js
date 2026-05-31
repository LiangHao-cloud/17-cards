import { SIDES } from "./constants.js";

export function sideLabel(side) {
  return side === SIDES.GM ? "Gamemaster" : "Players";
}

export function otherSide(side) {
  return side === SIDES.GM ? SIDES.PLAYERS : SIDES.GM;
}

export function canActForSide(state, side) {
  if (side === SIDES.GM) return game.user.isGM;
  return side === SIDES.PLAYERS && game.user.id === state.operatorUserId;
}

export function canSeeHand(state, side) {
  if (game.user.isGM) return true;
  return side === SIDES.PLAYERS && state.active;
}

export function requireGmUser(user) {
  if (!user?.isGM) throw new Error("Only the Gamemaster can do that.");
}

export function enforceSocketPermission(state, side, user) {
  if (side === SIDES.GM && user?.isGM) return;
  if (side === SIDES.PLAYERS && user?.id === state.operatorUserId) return;
  throw new Error("You are not allowed to act for that side.");
}

export function isPrimaryActiveGm() {
  return game.user.id === game.users.find((user) => user.active && user.isGM)?.id;
}
