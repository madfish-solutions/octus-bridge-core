const Contract = require("./commonInterface");
const { Tezos } = require("../utils/cli");
const { confirmOperation } = require("../../scripts/confirmation");
module.exports = class WrappedToken extends Contract {
  async getBalance(address, tokenId = 0) {
    await this.updateStorage();

    try {
      const balance = await this.storage.ledger.get([address, tokenId]);
      return balance.toNumber();
    } catch (e) {
      return 0;
    }
  }
  async transfer(from, receiver, amount, tokenId = 0) {
    const operation = await this.contract.methods
      .transfer([
        {
          from_: from,
          txs: [{ to_: receiver, token_id: tokenId, amount: amount }],
        },
      ])
      .send();

    await confirmOperation(Tezos, operation.hash);
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
};
