import type {
  LandingSectionAsset,
  LandingSectionAssetKey,
} from "../types";

export const LANDING_SECTION_ASSETS: Readonly<
  Record<LandingSectionAssetKey, LandingSectionAsset>
> = {
  dignityFamily: {
    src: "/landing/dignity-family-v1.webp",
    width: 1448,
    height: 1086,
    decorative: false,
    altKey: "landing.dignity.imageAlt",
  },
  schoolBag: {
    src: "/landing/order-school-bag-v1.webp",
    width: 512,
    height: 512,
    decorative: true,
  },
  notebooks: {
    src: "/landing/order-notebooks-v1.webp",
    width: 512,
    height: 512,
    decorative: true,
  },
  stationery: {
    src: "/landing/order-stationery-v1.webp",
    width: 512,
    height: 512,
    decorative: true,
  },
} as const;
