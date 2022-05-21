const { MichelsonMap } = require("@taquito/michelson-encoder");

const { alice } = require("../../scripts/sandbox/accounts");

const fees = {
  native: {
    withdraw_f: 100,
    deposit_f: 100,
  },
  aliens: {
    withdraw_f: 100,
    deposit_f: 100,
  },
};

const bakerRewards = {
  fish_f: 0,
  management_f: 0,
};

const assetConfig = {
  native: {
    configuration_wid: 1,
    configuration_address: 10101010,
  },
  aliens: {
    configuration_wid: 2,
    configuration_address: 20102010,
  },
};

module.exports = {
  owner: alice.pkh,
  pending_owner: null,
  bridge: alice.pkh,
  fish: alice.pkh,
  management: alice.pkh,
  guardian: alice.pkh,
  deposit_limit: 10000,
  fees: fees,
  assets: MichelsonMap.fromLiteral({}),
  asset_ids: MichelsonMap.fromLiteral({}),
  asset_count: 0,
  asset_config: assetConfig,
  banned_assets: MichelsonMap.fromLiteral({}),
  deposits: MichelsonMap.fromLiteral({}),
  deposit_count: 0,
  withdrawals: MichelsonMap.fromLiteral({}),
  withdrawal_count: 0,
  withdrawal_ids: MichelsonMap.fromLiteral({}),
  fee_balances: MichelsonMap.fromLiteral({}),
  baker_rewards: bakerRewards,
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
