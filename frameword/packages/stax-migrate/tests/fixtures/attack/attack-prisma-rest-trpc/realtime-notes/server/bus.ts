import { EventEmitter } from "node:events";

export type Notification = { id: string; channel: string; body: string };

export const notificationBus = new EventEmitter();
