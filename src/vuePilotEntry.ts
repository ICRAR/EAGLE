import { mountVuePilot } from "./vuePilot";

window.addEventListener("eagle:ready", mountVuePilot, { once: true });