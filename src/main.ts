import { customElement, state } from "lit/decorators.js";
import { html } from "lit";
import data from "../data/data.json";
import { LitElementNoShadow } from "./base";
import "./timer";
import "./map";
import "./game";
import { WinEvent } from "./game";
import { Temporal } from "@js-temporal/polyfill";

export type DivisionId = string;
export type CountryId = keyof typeof data;

export type Country = {
  divisions: Division[];
  name: string;
  id: CountryId;
};

export type Division = {
  geoshape: string;
  preferredName: string;
  names: string[];
  id: DivisionId;
};

const countries = Object.values(data) as Country[];

type AppState =
  | {
      state: "playing";
      id: CountryId;
    }
  | {
      state: "list";
    }
  | {
      state: "win";
      id: CountryId;
      time: Temporal.Duration;
    };

function bestTimeKey(id: CountryId): string {
  return `best-time-${id}`;
}

@customElement("x-app")
export class App extends LitElementNoShadow {
  @state()
  state: AppState = { state: "list" };

  render() {
    switch (this.state.state) {
      case "list":
        return html`<div class="w-full min-h-full grid place-items-center p-4">
          <div class="card">
            <div
              class="bg-cyan-300 border-b-2 border-stone-900 px-4 py-2 flex flex-col items-center gap-2"
            >
              <h1 class="font-bold text-xl">Pick a game</h1>
              <span class="text-sm">Powered by Wikidata</span>
            </div>
            <ul>
              ${countries.map((country) => {
                const bestTimeString = localStorage.getItem(
                  bestTimeKey(country.id),
                );

                const bestTimeFormatted =
                  bestTimeString !== null
                    ? html`<div class="text-sm">
                        Best time:
                        ${Temporal.Duration.from(bestTimeString).toLocaleString(
                          undefined,
                          { style: "digital" },
                        )}
                      </div>`
                    : html`<div class="text-sm">Not yet completed</div>`;

                return html`<li class="even:bg-stone-200 px-4 py-2">
                  <div class="w-full flex justify-between items-center gap-4">
                    <span>${country.name}</span>
                    <button
                      class="btn"
                      @click=${() => {
                        this.state = {
                          state: "playing",
                          id: country.id,
                        };
                      }}
                    >
                      Play
                      <span class="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                  ${bestTimeFormatted}
                </li>`;
              })}
            </ul>
          </div>
        </div>`;
      case "playing":
        return html`<x-game
          id=${this.state.id}
          @win=${(event: CustomEvent<WinEvent>) => {
            if (this.state.state === "playing") {
              const key = bestTimeKey(this.state.id);
              const bestTime = localStorage.getItem(key);

              if (
                bestTime === null ||
                Temporal.Duration.compare(
                  event.detail.time,
                  Temporal.Duration.from(bestTime),
                ) === -1
              ) {
                localStorage.setItem(key, event.detail.time.toString());
              }

              this.state = {
                state: "win",
                id: this.state.id,
                time: event.detail.time,
              };
            } else {
              throw Error("state was not playing, but there was a game");
            }
          }}
          @quit=${() => {
            this.state = {
              state: "list",
            };
          }}
        ></x-game>`;
      case "win":
        return html`<div class="w-full h-full grid place-items-center p-4">
          <div class="card p-4 flex flex-col gap-4 items-center">
            <h1 class="text-xl font-bold">You won!</h1>
            <span>
              Time:
              ${this.state.time.toLocaleString(undefined, {
                style: "digital",
              })}
            </span>
            <button
              class="btn"
              @click=${() => {
                this.state = {
                  state: "list",
                };
              }}
            >
              Back to list
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>`;
    }
  }
}
