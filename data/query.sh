#!/usr/bin/env sh

[ ! -d data/cache ] && mkdir -p data/cache
[ ! -d data/geoshape ] && mkdir -p data/geoshape

[ ! -f data/cache/divisions-raw.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/divisions.sparql \
	-o data/cache/divisions-raw.json

[ ! -f data/cache/countries-raw.json ] && curl https://query.wikidata.org/sparql \
	-H "Accept: application/sparql-results+json" \
	--data-urlencode query@data/countries.sparql \
	-o data/cache/countries-raw.json

[ ! -f data/cache/countries.json ] && jq \
	'.results.bindings | map({
		id: .country.value,
		name: .countryLabel.value
	}) | sort' \
	data/cache/countries-raw.json > data/cache/countries.json

[ ! -f data/cache/divisions.json ] && jq \
	'.results.bindings | map({
		id: .division.value,
		countryId: .country.value,
		preferredName: .preferredDivisionLabel.value,
		names: .divisionLabels.value | split("$DIVIDE$") | sort,
		osm: .osm.value,
		geo: .geo.value,
	}) | sort' \
	data/cache/divisions-raw.json > data/cache/divisions.json

[ ! -f data/data.json ] && python data/combine.py
