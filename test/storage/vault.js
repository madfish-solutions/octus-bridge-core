const { MichelsonMap } = require("@taquito/michelson-encoder");

const { alice } = require("../../scripts/sandbox/accounts");

const fees = {
  withdraw: 100,
  deposit: 100,
};
module.exports = {
  owner: alice.pkh,
  pending_owner: null,
  bridge: alice.pkh,
  fish: alice.pkh,
  management: alice.pkh,
  guardian: alice.pkh,
  baker: alice.pkh,
  deposit_limit: 10000,
  fees: fees,
  assets: MichelsonMap.fromLiteral({}),
  asset_ids: MichelsonMap.fromLiteral({}),
  banned_assets: MichelsonMap.fromLiteral({}),
  paused: false,
  metadata: MichelsonMap.fromLiteral({
    "": Buffer.from("tezos-storage:meta", "ascii").toString("hex"),
    meta: Buffer.from(
      JSON.stringify({
        version: "v0.0.1",
        name: "Bridge-core",
        description: "Tezos-Everscale bridge",
        authors: ["Madfish.Solutions"],
        homepage: "https://www.madfish.solutions//",
        source: {
          tools: ["Ligo", "Flextesa"],
          location: "https://ligolang.org/",
        },
        interfaces: ["TZIP-012", "TZIP-016"],

        errors: [],
      }),
      "ascii",
    ).toString("hex"),
  }),
};