import { customElement, property, query, state } from "lit/decorators.js";
import { html } from "lit";
import data from "../data/data.json";
import { Task } from "@lit/task";
import { repeat } from "lit/directives/repeat.js";
import { LitElementNoShadow } from "./base";
import { colorToHex, MapLoadEvent } from "./map";
import { Map as MapLibreGl } from "maplibre-gl";
import tailwindColors from "tailwindcss/colors";
import { Region, Division, RegionId } from "./main";
import { Timer } from "./timer";
import { Temporal } from "@js-temporal/polyfill";

function getDivisionNames(region: Region): Map<string, Division> {
  const names = new Map();
  for (const division of region.divisions) {
    for (const name of division.names) {
      names.set(name.toLowerCase(), division);
    }
  }
  return names;
}

type DivisionState = {
  found: boolean;
  division: Division;
  geoshape: GeoJSON.GeoJSON;
};

async function createDivisionStates(
  region: Region,
): Promise<Map<string, DivisionState>> {
  const divisionPromises = Iterator.from(region.divisions).map((division) => {
    return (async () => {
      const url = new URL(
        `/data/geoshape/${division.geoshape}.json`,
        import.meta.url,
      ).href;

      const geoshape = await (await fetch(url)).json();

      return [division.id, { geoshape, division, found: false }] as const;
    })();
  });

  return new Map(Iterator.from(await Promise.all(divisionPromises)));
}

function error(message: string): any {
  throw Error(message);
}

function* reverseIterate<T>(arr: T[]): Iterator<T> {
  for (let i = arr.length - 1; i >= 0; i--) yield arr[i];
}

const colors = {
  success: colorToHex(tailwindColors.green[300]),
  fail: colorToHex(tailwindColors.stone[700]),
  border: colorToHex(tailwindColors.stone[700]),
};

export type WinEvent = {
  time: Temporal.Duration;
};

@customElement("x-game")
export class Game extends LitElementNoShadow {
  @property({ type: String })
  id!: RegionId;

  @state()
  found: Division[] = [];

  map?: MapLibreGl;

  @query("x-timer")
  timer!: Timer;

  #getData = new Task(this, {
    task: async ([id]: readonly [string]) => {
      const region =
        Iterator.from(Object.values(data)).find((region) => region.id === id) ||
        error("id does not exist");

      const names = getDivisionNames(region);
      const divisions = await createDivisionStates(region);
      return { names, divisions };
    },
    args: () => [this.id],
  });

  renderLoading() {
    return html`<div class="w-full h-full grid place-items-center">
      <div class="card p-4 flex flex-col gap-4 items-center">
        <h1 class="text-xl font-bold">Loading...</h1>
        <div
          class="border-2 border-stone-900 border-l-transparent rounded-full animate-spin h-8 w-8"
        ></div>
      </div>
    </div>`;
  }

  renderError(error: unknown) {
    return html`<div class="w-full h-full grid place-items-center">
      <div class="card p-4 flex flex-col gap-4 items-center">
        <h1 class="text-xl font-bold">Error</h1>
        <span>${error}</span>
        <button
          class="btn"
          @click=${() => {
            this.dispatchEvent(new CustomEvent<{}>("quit", {}));
          }}
        >
          Back to list
        </button>
      </div>
    </div>`;
  }

  render() {
    return html`
      ${this.#getData.render({
        initial: this.renderLoading,
        pending: this.renderLoading,
        error: this.renderError,
        complete: ({ divisions, names }) => {
          return html` <div class="w-full min-h-full flex flex-col p-4 gap-4">
            <div class="flex flex-col justify-between">
              <div class="flex items-stretch gap-4 flex-wrap md:flex-nowrap">
                <label
                  class="card bg-cyan-300 focus-within:bg-cyan-400 py-2 px-4 w-min flex items-center gap-4"
                >
                  <div>
                    <div class="text-sm min-w-48">Enter a subdivision</div>
                    <input
                      type="input"
                      class="font-bold text-stone-900 placeholder:text-stone-600 focus:outline-0 w-full"
                      placeholder="..."
                      @change=${(event: InputEvent) => {
                        const input = event.target! as HTMLInputElement;
                        const name = input.value.toLowerCase();

                        const id = names.get(name);
                        if (id === undefined) return;

                        const info = divisions.get(id.id)!;
                        if (info.found) return;

                        const map = this.map;
                        if (map === undefined) return;

                        map.setPaintProperty(
                          info.division.id,
                          "fill-color",
                          colors.success,
                        );

                        info.found = true;
                        input.value = "";
                        this.found.push(info.division);
                        this.requestUpdate();

                        if (this.found.length >= divisions.size) {
                          this.dispatchEvent(
                            new CustomEvent<WinEvent>("win", {
                              detail: { time: this.timer.getDuration() },
                            }),
                          );
                        }

                        if (!this.timer.started()) {
                          this.timer.startTimer();
                        }
                      }}
                    />
                  </div>
                  <span class="material-symbols-outlined">arrow_forward</span>
                </label>
                <div class="hidden md:block w-full"></div>
                <div class="card p-4 grid place-items-center">
                  <x-timer></x-timer>
                </div>
                <div class="card p-4 flex flex-col items-center">
                  <div class="flex items-center gap-2 text-xl">
                    <span class="font-bold">${this.found.length}</span> /
                    <span class="font-bold">${divisions.size}</span>
                  </div>
                  <span class="text-sm">subdivisions</span>
                </div>
                <button
                  class="btn-lg material-symbols-outlined"
                  @click=${() => {
                    this.dispatchEvent(new CustomEvent<{}>("quit", {}));
                  }}
                  title="quit"
                >
                  close
                </button>
              </div>
            </div>
            <div class="card p-2 h-[60vh]">
              <x-map
                @map-load=${(event: CustomEvent<MapLoadEvent>) => {
                  const map = event.detail.map;
                  this.map = map;

                  for (const [division, { geoshape }] of divisions.entries()) {
                    map.addSource(division, {
                      type: "geojson",
                      data: geoshape,
                    });

                    map.addLayer({
                      id: division,
                      source: division,
                      type: "fill",
                      paint: {
                        "fill-outline-color": colors.border,
                        "fill-color": colors.fail,
                        "fill-opacity": 0.9,
                      },
                    });
                  }
                }}
              ></x-map>
            </div>
            <div class="card w-full">
              <div
                class="font-bold text-xl bg-cyan-300 border-b-2 border-stone-900 px-4 py-2 text-center"
              >
                ${data[this.id].name}
              </div>
              ${this.found.length === 0
                ? html`<div class="px-4 py-2">No subdivisions found</div>`
                : null}
              <ul>
                ${repeat(
                  Iterator.from(reverseIterate(this.found)),
                  (division) => division.id,
                  (division, _) =>
                    html`<li class="even:bg-stone-200 px-4 py-2 flex flex-col">
                      ${division.preferredName}
                      <span class="text-xs">${division.names.join("; ")}</span>
                    </li>`,
                )}
              </ul>
            </div>
          </div>`;
        },
      })}
    `;
  }
}
