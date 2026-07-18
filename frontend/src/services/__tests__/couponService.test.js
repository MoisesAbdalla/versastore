import { describe, it, expect, vi, beforeEach } from "vitest";

let store;

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ __collection: name })),
  doc: vi.fn((_db, name, id) => ({ path: `${name}/${id}` })),
  getDoc: vi.fn(async (ref) => {
    const data = store.get(ref.path);
    return { exists: () => data !== undefined, data: () => data, id: ref.path.split("/")[1] };
  }),
  getDocs: vi.fn(async () => ({
    docs: [...store.entries()]
      .filter(([key]) => key.startsWith("coupons/"))
      .map(([key, value]) => ({ id: key.split("/")[1], data: () => value })),
  })),
  setDoc: vi.fn(async (ref, data) => {
    store.set(ref.path, data);
  }),
  updateDoc: vi.fn(async (ref, changes) => {
    store.set(ref.path, { ...store.get(ref.path), ...changes });
  }),
  deleteDoc: vi.fn(async (ref) => {
    store.delete(ref.path);
  }),
  query: vi.fn((col, ...constraints) => ({ col, constraints })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: () => "server-timestamp",
}));

vi.mock("../../firebase/firestore", () => ({ default: {} }));

import { createCoupon, getCoupon, updateCoupon, deleteCoupon, toggleCouponActive } from "../couponService";
import { COUPON_TYPE } from "../../constants/coupon";

beforeEach(() => {
  store = new Map();
});

describe("couponService", () => {
  it("createCoupon normaliza o código, zera usedCount e grava por id", async () => {
    const created = await createCoupon({ code: " bemvindo10 ", type: COUPON_TYPE.PERCENTUAL, value: 10, active: true });

    expect(created.code).toBe("BEMVINDO10");
    expect(created.usedCount).toBe(0);
    expect(store.get("coupons/BEMVINDO10")).toMatchObject({ code: "BEMVINDO10", type: "percentual", value: 10 });
  });

  it("createCoupon recusa código duplicado", async () => {
    await createCoupon({ code: "X", type: COUPON_TYPE.FIXO, value: 1000 });

    await expect(createCoupon({ code: "x", type: COUPON_TYPE.FIXO, value: 500 })).rejects.toMatchObject({
      code: "codigo-duplicado",
    });
  });

  it("createCoupon recusa entrada inválida (percentual > 100)", async () => {
    await expect(createCoupon({ code: "Y", type: COUPON_TYPE.PERCENTUAL, value: 150 })).rejects.toMatchObject({
      code: "invalido",
    });
  });

  it("frete grátis grava value 0 mesmo sem valor informado", async () => {
    const created = await createCoupon({ code: "FRETE", type: COUPON_TYPE.FRETE_GRATIS });
    expect(created.value).toBe(0);
  });

  it("getCoupon busca por código normalizado; null se ausente", async () => {
    await createCoupon({ code: "ABC", type: COUPON_TYPE.FIXO, value: 1000 });

    expect((await getCoupon(" abc ")).code).toBe("ABC");
    expect(await getCoupon("nao-existe")).toBeNull();
    expect(await getCoupon("")).toBeNull();
  });

  it("toggleCouponActive e updateCoupon alteram o doc; deleteCoupon remove", async () => {
    await createCoupon({ code: "Z", type: COUPON_TYPE.FIXO, value: 1000, active: true });

    await toggleCouponActive("z", false);
    expect(store.get("coupons/Z").active).toBe(false);

    await updateCoupon("z", { value: 2000 });
    expect(store.get("coupons/Z").value).toBe(2000);

    await deleteCoupon("z");
    expect(store.get("coupons/Z")).toBeUndefined();
  });
});
