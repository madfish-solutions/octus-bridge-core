const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../../scripts/sandbox/accounts");

module.exports = {
  admin: alice.pkh,
  admin_candidate: null,
  ledger: MichelsonMap.fromLiteral({}),
  accounts: MichelsonMap.fromLiteral({}),
  tokens: MichelsonMap.fromLiteral({}),
  lastTokenId: "0",
  priceFeedProxy: alice.pkh,
  closeFactorF: "0",
  liqIncentiveF: "0",
  maxMarkets: 1,
  markets: MichelsonMap.fromLiteral({}),
  borrows: MichelsonMap.fromLiteral({}),
  assets: MichelsonMap.fromLiteral({}),
  token_metadata: MichelsonMap.fromLiteral({}),
};
