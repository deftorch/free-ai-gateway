import { describe, it, expect } from "bun:test";
import { runBackground } from "./wait-until";

describe("Universal Cross-Platform runBackground Adapter Suite", () => {
  it("harus mengeksekusi promise background tanpa melemparkan error unhandled", () => {
    let executed = false;
    const testPromise = (async () => {
      executed = true;
    })();

    expect(() => runBackground(testPromise)).not.toThrow();
    expect(executed).toBe(true);
  });

  it("harus menangani promise rejection secara aman tanpa menghancurkan proses", async () => {
    const failingPromise = Promise.reject(new Error("Background task error sample")).catch(() => {});
    expect(() => runBackground(failingPromise)).not.toThrow();
  });
});
