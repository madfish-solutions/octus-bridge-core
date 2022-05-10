const { MichelsonMap } = require("@taquito/michelson-encoder");

const { alice } = require("../../scripts/sandbox/accounts");

module.exports = {
  owner: alice.pkh,
  pending_owner: null,
  round_submitter: alice.pkh,
  configuration_wid: 0,
  configuration_address: 1337,
  rounds: MichelsonMap.fromLiteral({}),
  last_round: 0,
  initial_round: 0,
  ttl: 10,
  required_signatures: 1,
  banned_relays: MichelsonMap.fromLiteral({}),
  paused: false,
  cache: MichelsonMap.fromLiteral({}),
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
