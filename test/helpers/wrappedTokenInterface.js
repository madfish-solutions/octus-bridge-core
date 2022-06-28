const Token = require("./tokenInterface");
const { Tezos } = require("../utils/cli");
const { confirmOperation } = require("../../scripts/confirmation");

module.exports = class WrappedToken extends Token {
  async getWBalance(address, tokenId = 0) {
    await this.updateStorage();

    try {
      const balance = await this.storage.ledger.get([address, tokenId]);

      return balance.toNumber();
    } catch (e) {
      return 0;
    }
  }

  async updateOperator(action, owner, operator, tokenId = 0) {
    const operation = await this.contract.methods
      .update_operators([
        {
          [action]: {
            owner: owner,
            operator: operator,
            token_id: tokenId,
          },
        },
      ])
      .send();
    await confirmOperation(Tezos, operation.hash);
  }
  async createToken(tokenMetadata) {
    const operation = await this.contract.methods
      .create_token(tokenMetadata)
      .send();
    await confirmOperation(Tezos, operation.hash);
  }
};
