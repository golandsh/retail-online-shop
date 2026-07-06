import { logger } from "./logger";
import type { CityStreetDirectory } from "./types";

const CITY_PLACEHOLDER_STREET_CODE = 9000;
const PAGE_LIMIT = 5000;

interface GovStreetRecord {
    _id: number;
    סמל_ישוב: number;
    שם_ישוב: string;
    סמל_רחוב: number;
    שם_רחוב: string;
}

interface GovApiResult {
    records: GovStreetRecord[];
    total?: number;
}

interface GovApiResponse {
    success: boolean;
    result?: GovApiResult;
}

const normalizeName = (value: string): string => value.trim();

const toApiCityFilter = (city: string): string => `${normalizeName(city)} `;

const isRealStreet = (record: GovStreetRecord): boolean => {
    if (record.סמל_רחוב === CITY_PLACEHOLDER_STREET_CODE) {
        return false;
    }

    const cityName = normalizeName(record.שם_ישוב);
    const streetName = normalizeName(record.שם_רחוב);

    return streetName.length > 0 && streetName !== cityName;
};

const buildCitiesSearchUrl = (baseUrl: string, cities: string[], offset: number): string => {
    const url = new URL(baseUrl);
    url.searchParams.set("filters", JSON.stringify({ שם_ישוב: cities.map(toApiCityFilter) }));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    return url.toString();
};

const createEmptyStreetSets = (cities: string[]): Map<string, Set<string>> =>
    new Map(cities.map((city) => [city, new Set<string>()]));

const addRecordsToStreetSets = (
    records: GovStreetRecord[],
    cities: string[],
    streetsByCity: Map<string, Set<string>>,
): void => {
    const cityByNormalizedName = new Map(cities.map((city) => [normalizeName(city), city]));

    for (const record of records) {
        const whitelistCity = cityByNormalizedName.get(normalizeName(record.שם_ישוב));
        if (!whitelistCity || !isRealStreet(record)) {
            continue;
        }

        streetsByCity.get(whitelistCity)?.add(normalizeName(record.שם_רחוב));
    }
};

const sortStreets = (streets: Set<string>): string[] =>
    [...streets].sort((left, right) => left.localeCompare(right, "he"));

export const fetchStreetsForCities = async (
    cities: string[],
    baseUrl: string,
): Promise<Map<string, string[]>> => {
    const streetsByCity = createEmptyStreetSets(cities);
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
        const response = await fetch(buildCitiesSearchUrl(baseUrl, cities, offset));

        if (!response.ok) {
            throw new Error(`Streets API request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as GovApiResponse;

        if (!payload.success || !payload.result) {
            throw new Error("Streets API returned an invalid response");
        }

        const records = payload.result.records ?? [];
        total = payload.result.total ?? records.length;

        addRecordsToStreetSets(records, cities, streetsByCity);

        if (records.length === 0) {
            break;
        }

        offset += records.length;
    }

    return new Map(cities.map((city) => [city, sortStreets(streetsByCity.get(city) ?? new Set())]));
};

export const fetchWhitelistedCityStreets = async (
    cities: string[],
    baseUrl: string,
): Promise<CityStreetDirectory[]> => {
    if (cities.length === 0) {
        return [];
    }

    try {
        const streetsByCity = await fetchStreetsForCities(cities, baseUrl);

        return cities.map((city) => ({
            city,
            streets: streetsByCity.get(city) ?? [],
        }));
    } catch (error) {
        logger.warn("Failed to load streets for whitelisted cities", {
            cities,
            ...(error instanceof Error ? { errorMessage: error.message } : { errorMessage: String(error) }),
        });

        return cities.map((city) => ({ city, streets: [] }));
    }
};
