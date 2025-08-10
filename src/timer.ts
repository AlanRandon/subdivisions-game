import { customElement, state } from "lit/decorators.js";
import { LitElementNoShadow } from "./base";
import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";
import { html } from "lit";
/* @ts-ignore */
Date.prototype.toTemporalInstant = toTemporalInstant;

export function formatDuration(duration: Temporal.Duration): string {
  const totalSeconds = duration.total({ unit: "seconds" });
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

@customElement("x-timer")
export class Timer extends LitElementNoShadow {
  @state()
  start?: Temporal.Instant;

  startTimer() {
    this.start = Temporal.Now.instant();
  }

  getDuration(): Temporal.Duration {
    return Temporal.Now.instant().since(this.start!);
  }

  started(): boolean {
    return this.start !== undefined;
  }

  render() {
    if (!this.started()) {
      const duration = Temporal.Duration.from({ seconds: 0 });
      return html`<div class="w-max flex items-center gap-2 text-xl">
        ${formatDuration(duration)}
        <div class="w-[1em] aspect-square grid place-items-center">
          <span class="material-symbols-outlined">pause</span>
        </div>
      </div>`;
    }

    const duration = this.getDuration();
    setTimeout(() => this.requestUpdate(), 100);
    return html`<div class="w-max flex items-center gap-2 text-xl">
      ${formatDuration(duration)}
      <div
        class="w-[1em] aspect-square grid place-items-center animate-[spin_5s_cubic-bezier(.46,-0.22,.83,1.44)_infinite]"
      >
        <span class="material-symbols-outlined">hourglass</span>
      </div>
    </div>`;
  }
}
