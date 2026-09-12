import { describe, expect, test } from "bun:test";

import { kafilLocation } from "../src/lib/locationConfig";

describe("family location runtime config", () => {
  test("defaults to the Leaflet provider and Morocco center", () => {
    const runtime = kafilLocation.resolve({});
    const config = runtime.config;

    expect(config.provider).toBe("leaflet");
    expect(config.defaultCenter).toEqual({ latitude: 33.5731, longitude: -7.5898 });
    expect(config.defaultZoom).toBe(12);
    expect(runtime.csp.imgSrc).toEqual(["https://tile.openstreetmap.org"]);
  });

  test("disables unknown providers and unsafe production tile URLs", () => {
    expect(kafilLocation.resolve({ KAFIL_LOCATION_MAP_PROVIDER: "google" }).config.provider).toBe("disabled");
    expect(kafilLocation.resolve({ KAFIL_LOCATION_TILE_URL: "http://tiles.example.test/{z}/{x}/{y}.png" }).config.provider).toBe("disabled");
  });

  test("allows loopback HTTP tiles only during development", () => {
    const environment = { KAFIL_LOCATION_TILE_URL: "http://127.0.0.1:8080/{z}/{x}/{y}.png" };

    expect(kafilLocation.resolve(environment).config.provider).toBe("disabled");
    expect(kafilLocation.resolve(environment, { isDevelopment: true }).config.provider).toBe("leaflet");
  });

  test("falls back safely for invalid coordinates and zoom", () => {
    const config = kafilLocation.resolve({
      KAFIL_LOCATION_DEFAULT_LATITUDE: "100",
      KAFIL_LOCATION_DEFAULT_LONGITUDE: "not-a-number",
      KAFIL_LOCATION_DEFAULT_ZOOM: "99",
    }).config;

    expect(config.defaultCenter).toEqual({ latitude: 33.5731, longitude: -7.5898 });
    expect(config.defaultZoom).toBe(12);
  });
});
