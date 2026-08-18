import { describe, it, expect } from "vitest";
import { credentialsStorage, credentialsFromHeaders, CREDENTIAL_HEADERS } from "./credentials.js";

describe("credentialsFromHeaders", () => {
  it("returns undefined when username is missing", () => {
    expect(
      credentialsFromHeaders({ [CREDENTIAL_HEADERS.password]: "pw" })
    ).toBeUndefined();
  });

  it("returns undefined when password is missing", () => {
    expect(
      credentialsFromHeaders({ [CREDENTIAL_HEADERS.username]: "u" })
    ).toBeUndefined();
  });

  it("returns undefined when both are missing", () => {
    expect(credentialsFromHeaders({})).toBeUndefined();
  });

  it("extracts username/password without a product key", () => {
    expect(
      credentialsFromHeaders({
        [CREDENTIAL_HEADERS.username]: "alice",
        [CREDENTIAL_HEADERS.password]: "secret",
      })
    ).toEqual({ username: "alice", password: "secret" });
  });

  it("extracts an optional product key when present", () => {
    expect(
      credentialsFromHeaders({
        [CREDENTIAL_HEADERS.username]: "alice",
        [CREDENTIAL_HEADERS.password]: "secret",
        [CREDENTIAL_HEADERS.productKey]: "pk-123",
      })
    ).toEqual({ username: "alice", password: "secret", productKey: "pk-123" });
  });

  it("takes the first value when a header repeats (array form)", () => {
    expect(
      credentialsFromHeaders({
        [CREDENTIAL_HEADERS.username]: ["alice", "eve"],
        [CREDENTIAL_HEADERS.password]: ["secret"],
      })
    ).toEqual({ username: "alice", password: "secret" });
  });

  it("treats an empty-string username or password as missing", () => {
    expect(
      credentialsFromHeaders({
        [CREDENTIAL_HEADERS.username]: "",
        [CREDENTIAL_HEADERS.password]: "secret",
      })
    ).toBeUndefined();
  });
});

describe("credentialsStorage", () => {
  it("isolates concurrent async contexts", async () => {
    const results: string[] = [];
    await Promise.all([
      credentialsStorage.run({ username: "a", password: "1" }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(credentialsStorage.getStore()!.username);
      }),
      credentialsStorage.run({ username: "b", password: "2" }, async () => {
        results.push(credentialsStorage.getStore()!.username);
      }),
    ]);
    expect(results.sort()).toEqual(["a", "b"]);
  });

  it("is undefined outside of a .run() context", () => {
    expect(credentialsStorage.getStore()).toBeUndefined();
  });
});
