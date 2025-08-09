import { customElement, state } from "lit/decorators.js";
import { LitElementNoShadow } from "./base";
import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";
import { html } from "lit";
/* @ts-ignore */
Date.prototype.toTemporalInstant = toTemporalInstant;

@customElement("x-timer")
export class Timer extends LitElementNoShadow {
  @state()
  start?: Temporal.Instant;

  startTimer() {
    this.start = Temporal.Now.instant();
  }

  getDuration(): Temporal.Duration {
    return Temporal.Now.instant().since(this.start!).round("seconds");
  }

  started(): boolean {
    return this.start !== undefined;
  }

  render() {
    if (!this.started()) {
      const duration = Temporal.Duration.from({ seconds: 0 });
      return html`<div class="w-max flex items-center text-xl">
        ${duration.toLocaleString(undefined, { style: "digital" })}
        <span class="material-symbols-outlined">pause</span>
      </div>`;
    }

    const duration = this.getDuration();
    setTimeout(() => this.requestUpdate(), 100);
    return html`<div class="w-max flex items-center text-xl">
      ${duration.toLocaleString(undefined, { style: "digital" })}
      <span class="material-symbols-outlined">hourglass</span>
    </div>`;
  }
}
