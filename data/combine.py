import json
import requests
from pathlib import Path
import hashlib


def main() -> None:
    with open("data/cache/regions.json") as file:
        regions = json.load(file)

    regions = {region["id"]: {**region, "divisions": []} for region in regions}

    with open("data/cache/divisions.json") as file:
        divisions = json.load(file)

    for i, division in enumerate(divisions):
        print(f"[{i + 1}/{len(divisions)}] {division['preferredName']}")

        geoshape = None
        method = None

        if division["osm"] is not None:
            geoshape = (
                f"https://polygons.openstreetmap.fr/get_geojson.py?id={division['osm']}"
            )
            method = "OSM"
        elif division["geo"] is not None:
            title = division["geo"].replace(
                "http://commons.wikimedia.org/data/main/", ""
            )
            geoshape = f"https://commons.wikimedia.org/w/index.php?action=raw&format=json&origin=*&title={title}"
            method = "WIKIDATA"

        if geoshape is None:
            print("No geoshape, skipping...")
            continue

        id = hashlib.md5(geoshape.encode()).hexdigest()[0:8]

        path = Path(f"data/geoshape/{id}.json")
        if not path.exists():
            print("Fetching")
            res = requests.get(geoshape)
            with path.open("wb+") as file:
                match method:
                    case "WIKIDATA":
                        data = json.loads(res.text)
                        file.write(json.dumps(data["data"]).encode())
                    case "OSM":
                        file.write(res.content)

        regionId = division["regionId"]
        del division["regionId"]
        del division["osm"]
        del division["geo"]

        regions[regionId]["divisions"].append({**division, "geoshape": id})

    with open("data/data.json", "w+") as file:
        json.dump(regions, fp=file, indent=2)


if __name__ == "__main__":
    main()
