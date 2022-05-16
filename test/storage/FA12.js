const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice, bob } = require("../utils/cli");

let totalSupply = 100000000 * 10 ** 6;

module.exports = {
  owner: alice.pkh,
  total_supply: totalSupply,
  ledger: MichelsonMap.fromLiteral({
    [alice.pkh]: {
      balance: totalSupply / 2,
      allowances: MichelsonMap.fromLiteral({}),
    },
    [bob.pkh]: {
      balance: totalSupply / 2,
      allowances: MichelsonMap.fromLiteral({}),
    },
  }),
};
