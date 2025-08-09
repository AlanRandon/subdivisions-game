import { customElement, state } from "lit/decorators.js";
import { html } from "lit";
import data from "../data/data.json";
import { LitElementNoShadow } from "./base";
import "./map";
import "./game";

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
    };

@customElement("x-app")
export class App extends LitElementNoShadow {
  @state()
  state: AppState = { state: "list" };

  render() {
    switch (this.state.state) {
      case "list":
        return html`<div class="w-full min-h-full grid place-items-center p-4">
          <div class="bg-slate-50 shadow-hard rounded">
            <h1 class="font-bold text-xl p-4">Pick a game</h1>
            <ul>
              ${countries.map(
                (country) =>
                  html`<li
                    class="odd:bg-stone-200 flex justify-between items-center gap-4 px-4 py-2 group"
                  >
                    <span>${country.name}</span>
                    <button
                      class="group-odd:ring-offset-stone-200 btn"
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
                  </li>`,
              )}
            </ul>
          </div>
        </div>`;
      case "playing":
        return html`<x-game
          id=${this.state.id}
          @win=${() => {
            if (this.state.state == "playing") {
              this.state = {
                state: "win",
                id: this.state.id,
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
          <div
            class="bg-slate-50 shadow-hard rounded p-4 flex flex-col gap-4 items-center"
          >
            <h1 class="text-xl font-bold">You won!</h1>
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
