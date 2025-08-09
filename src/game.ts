import { customElement, property, state } from "lit/decorators.js";
import { html } from "lit";
import data from "../data/data.json";
import { Task } from "@lit/task";
import { repeat } from "lit/directives/repeat.js";
import { LitElementNoShadow } from "./base";
import { colorToHex, MapLoadEvent } from "./map";
import { Map as MapLibreGl } from "maplibre-gl";
import tailwindColors from "tailwindcss/colors";
import { Country, Division, CountryId } from "./main";

function getDivisionNames(country: Country): Map<string, Division> {
  const names = new Map();
  for (const division of country.divisions) {
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
  country: Country,
): Promise<Map<string, DivisionState>> {
  const divisionPromises = Iterator.from(country.divisions).map((division) => {
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
  success: colorToHex(tailwindColors.green[500]),
  fail: colorToHex(tailwindColors.stone[700]),
};

@customElement("x-game")
export class Game extends LitElementNoShadow {
  @property({ type: String })
  id!: CountryId;

  @state()
  found: Division[] = [];

  map?: MapLibreGl;

  #getData = new Task(this, {
    task: async ([id]: readonly [string]) => {
      const country =
        Iterator.from(Object.values(data)).find(
          (country) => country.id == id,
        ) || error("id does not exist");

      const names = getDivisionNames(country);
      const divisions = await createDivisionStates(country);
      return { names, divisions };
    },
    args: () => [this.id],
  });

  renderLoading() {
    return html`<div class="w-full h-full grid place-items-center">
      <div
        class="bg-slate-50 shadow-hard rounded p-4 flex flex-col gap-4 items-center"
      >
        <h1 class="text-xl font-bold">Loading...</h1>
        <div
          class="border-2 border-stone-900 border-l-transparent rounded-full animate-spin h-8 w-8"
        ></div>
      </div>
    </div>`;
  }

  renderError(error: unknown) {
    return html`<div class="w-full h-full grid place-items-center">
      <div
        class="bg-slate-50 shadow-hard rounded p-4 flex flex-col gap-4 items-center"
      >
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
              <div class="flex items-stretch gap-4">
                <label
                  class="bg-stone-50 text-stone-900 shadow-hard rounded py-2 px-4 w-min flex items-center gap-4 group"
                >
                  <div>
                    <div class="text-sm">Enter a subdivision</div>
                    <input
                      type="input"
                      class="font-bold text-stone-900 placeholder:text-stone-600 focus:outline-0"
                      placeholder="..."
                      @change=${(event: InputEvent) => {
                        const input = event.target! as HTMLInputElement;
                        const name = input.value.toLowerCase();

                        const id = names.get(name);
                        if (id == undefined) return;

                        const info = divisions.get(id.id)!;
                        if (info.found) return;

                        const map = this.map;
                        if (map == undefined) return;

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
                          this.dispatchEvent(new CustomEvent<{}>("win", {}));
                        }
                      }}
                    />
                  </div>
                  <span class="material-symbols-outlined">arrow_forward</span>
                </label>
                <div class="w-full"></div>
                <div
                  class="bg-stone-50 shadow-hard rounded p-4 flex items-center gap-2"
                >
                  <div class="w-max">${data[this.id].name}</div>
                </div>
                <div
                  class="bg-stone-50 shadow-hard rounded p-4 flex items-center gap-2"
                >
                  <span class="font-bold">${this.found.length}</span> /
                  <span class="font-bold">${divisions.size}</span> Found
                </div>
                <button
                  class="bg-stone-50 shadow-hard rounded p-4 grid place-items-center material-symbols-outlined"
                  @click=${() => {
                    this.dispatchEvent(new CustomEvent<{}>("quit", {}));
                  }}
                  title="quit"
                >
                  close
                </button>
              </div>
            </div>
            <div class="rounded shadow-hard bg-stone-50 p-2 h-[60vh]">
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
                        "fill-outline-color": "transparent",
                        "fill-color": colors.fail,
                        "fill-opacity": 0.9,
                      },
                    });
                  }
                }}
              ></x-map>
            </div>
            <div class="bg-stone-50 rounded shadow-hard w-full">
              <div class="font-bold text-xl px-4 py-2">Subdivisions found</div>
              <ul>
                ${repeat(
                  Iterator.from(reverseIterate(this.found)),
                  (division) => division.id,
                  (division, _) =>
                    html`<li class="odd:bg-stone-200 px-4 py-2 flex flex-col">
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
