const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../scripts/sandbox/accounts");

module.exports = {
  owner: alice.pkh,
  pending_owner: null,
  vault: alice.pkh,
  protocol: alice.pkh,
  protocol_asset_id: 0,
  price_feed: alice.pkh,
  deposit_asset: { fa12: alice.pkh },
  reward_asset: { fa12: alice.pkh },
  tvl: 0,
  last_profit: 0,
  metadata: MichelsonMap.fromLiteral({}),
};
