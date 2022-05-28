const { MichelsonMap } = require("@taquito/michelson-encoder");

const { alice, bob } = require("../utils/cli");
let totalSupply = 100000000 * 10 ** 12;
const metadata = MichelsonMap.fromLiteral({
  "": Buffer.from("tezos-storage:test", "ascii").toString("hex"),
  test: Buffer.from(
    JSON.stringify({
      version: "v1.0.0",
      description: "Test",
      authors: [" "],
      source: {
        tools: ["Ligo", "Flextesa"],
        location: "https://ligolang.org/",
      },
      interfaces: ["TZIP-12", "TZIP-16", "TZIP-17"],
      errors: [],
      views: [],
    }),
    "ascii",
  ).toString("hex"),
});

const tokenMetadata = MichelsonMap.fromLiteral({
  0: {
    token_id: "0",
    token_info: MichelsonMap.fromLiteral({
      symbol: Buffer.from("Test").toString("hex"),
      name: Buffer.from("Test").toString("hex"),
      decimals: Buffer.from("6").toString("hex"),
      icon: Buffer.from("").toString("hex"),
    }),
  },
});

const account_info = MichelsonMap.fromLiteral({
  [alice.pkh]: {
    balances: MichelsonMap.fromLiteral({
      0: totalSupply / 2,
    }),
    permits: [],
  },
  [bob.pkh]: {
    balances: MichelsonMap.fromLiteral({
      0: totalSupply / 2,
    }),
    permits: [],
  },
});

module.exports = {
  account_info: account_info,
  token_info: MichelsonMap.fromLiteral({ 0: [totalSupply] }),
  metadata: metadata,
  token_metadata: tokenMetadata,
  minters: [],
  minters_info: [],
  tokens_ids: [0],
  last_token_id: "1",
  admin: alice.pkh,
  permit_counter: "0",
  permits: MichelsonMap.fromLiteral({}),
  default_expiry: "1000",
  total_mint_percent: "0",
  bob: bob.pkh,
  bobs_accumulator: "0",
};
