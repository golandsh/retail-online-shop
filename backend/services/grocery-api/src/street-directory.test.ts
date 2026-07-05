import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchStreetsForCities, fetchWhitelistedCityStreets } from "./street-directory";

const API_URL =
    "https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b";

const mockFetchResponse = (records: unknown[], total?: number) =>
    vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            success: true,
            result: {
                records,
                total: total ?? records.length,
            },
        }),
    });

const getFiltersFromFetchCall = (): { שם_ישוב: string[] } => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const filtersParam = new URL(calledUrl).searchParams.get("filters");
    return JSON.parse(filtersParam ?? "{}") as { שם_ישוב: string[] };
};

describe("street-directory", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("requests all whitelisted cities in one filters array", async () => {
        global.fetch = mockFetchResponse([
            {
                _id: 1,
                סמל_ישוב: 5000,
                שם_ישוב: "חיפה ",
                סמל_רחוב: 101,
                שם_רחוב: "הרצל",
            },
            {
                _id: 2,
                סמל_ישוב: 3000,
                שם_ישוב: "ירושלים ",
                סמל_רחוב: 201,
                שם_רחוב: "יפו",
            },
        ]);

        await fetchStreetsForCities(["חיפה", "ירושלים"], API_URL);

        expect(global.fetch).toHaveBeenCalledOnce();
        expect(getFiltersFromFetchCall()).toEqual({
            שם_ישוב: ["חיפה ", "ירושלים "],
        });
    });

    it("groups streets by city and filters placeholder entries", async () => {
        global.fetch = mockFetchResponse([
            {
                _id: 1,
                סמל_ישוב: 5000,
                שם_ישוב: "חיפה ",
                סמל_רחוב: 9000,
                שם_רחוב: "חיפה",
            },
            {
                _id: 2,
                סמל_ישוב: 5000,
                שם_ישוב: "חיפה ",
                סמל_רחוב: 101,
                שם_רחוב: "הרצל",
            },
            {
                _id: 3,
                סמל_ישוב: 3000,
                שם_ישוב: "ירושלים ",
                סמל_רחוב: 201,
                שם_רחוב: "יפו",
            },
        ]);

        const streetsByCity = await fetchStreetsForCities(["חיפה", "ירושלים"], API_URL);

        expect(streetsByCity.get("חיפה")).toEqual(["הרצל"]);
        expect(streetsByCity.get("ירושלים")).toEqual(["יפו"]);
    });

    it("returns streets for each whitelisted city from a single API call", async () => {
        global.fetch = mockFetchResponse([
            {
                _id: 1,
                סמל_ישוב: 5000,
                שם_ישוב: "חיפה ",
                סמל_רחוב: 101,
                שם_רחוב: "הרצל",
            },
            {
                _id: 2,
                סמל_ישוב: 3000,
                שם_ישוב: "ירושלים ",
                סמל_רחוב: 201,
                שם_רחוב: "יפו",
            },
        ]);

        const result = await fetchWhitelistedCityStreets(["חיפה", "ירושלים"], API_URL);

        expect(global.fetch).toHaveBeenCalledOnce();
        expect(result).toEqual([
            { city: "חיפה", streets: ["הרצל"] },
            { city: "ירושלים", streets: ["יפו"] },
        ]);
    });

    it("returns empty streets for all cities when the request fails", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        const result = await fetchWhitelistedCityStreets(["חיפה", "ירושלים"], API_URL);

        expect(global.fetch).toHaveBeenCalledOnce();
        expect(result).toEqual([
            { city: "חיפה", streets: [] },
            { city: "ירושלים", streets: [] },
        ]);
    });
});
