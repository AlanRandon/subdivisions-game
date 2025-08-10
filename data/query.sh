#!/usr/bin/env sh

[ ! -d data/cache ] && mkdir -p data/cache
[ ! -d data/geoshape ] && mkdir -p data/geoshape

[ ! -f data/cache/divisions-raw.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/divisions.sparql \
	-o data/cache/divisions-raw.json

[ ! -f data/cache/regions-raw.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/regions.sparql \
	-o data/cache/regions-raw.json

[ ! -f data/cache/regions.json ] && jq \
	'.results.bindings | map({
		id: .region.value,
		name: .regionLabel.value
	}) | sort' \
	data/cache/regions-raw.json > data/cache/regions.json

[ ! -f data/cache/divisions.json ] && jq \
	'.results.bindings | map({
		id: .division.value,
		regionId: .region.value,
		preferredName: .preferredDivisionLabel.value,
		names: .divisionLabels.value | split("$DIVIDE$") | sort,
		osm: .osm.value,
		geo: .geo.value,
	}) | sort' \
	data/cache/divisions-raw.json > data/cache/divisions.json

[ ! -f data/data.json ] && python data/combine.py
