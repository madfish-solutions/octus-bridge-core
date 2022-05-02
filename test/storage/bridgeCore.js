const { MichelsonMap } = require("@taquito/michelson-encoder");

const { alice } = require("../../scripts/sandbox/accounts");

module.exports = {
  owner: alice.pkh,
  pending_owner: null,
  round_submitter: alice.pkh,
  rounds: MichelsonMap.fromLiteral({}),
  round_count: 0,
  ttl_round: 10,
  banned_relays: MichelsonMap.fromLiteral({}),
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
