import { defineNajmLocationRuntime } from "najm-next/location/server";

export const kafilLocation = defineNajmLocationRuntime({
  environmentPrefix: "KAFIL_LOCATION",
  allowedProviders: ["leaflet"],
  defaults: {
    provider: "leaflet",
    center: { latitude: 33.5731, longitude: -7.5898 },
    zoom: 12,
    leaflet: {
      tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
});
