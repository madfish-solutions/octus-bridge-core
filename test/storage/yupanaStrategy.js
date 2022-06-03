const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../../scripts/sandbox/accounts");

module.exports = {
  vault: null,
  protocol: null,
  protocol_asset_id: 0,
  deposit_asset: null,
  reward_asset: null,
  tvl: 0,
  last_profit: 0,
  metadata: MichelsonMap.fromLiteral({}),
};
