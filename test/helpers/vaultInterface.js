const Contract = require("./commonInterface");
const vaultFunctions = require("../../builds/lambdas/vault_lambdas.json");
const { OpKind } = require("@taquito/taquito");
const { Tezos } = require("../utils/cli");
const { confirmOperation } = require("../../scripts/confirmation");
module.exports = class Vault extends Contract {
  async updateStorage() {
    const updatedStorage = await this.contract.storage();
    this.storage = updatedStorage.storage;
    return updatedStorage;
  }
  async setLambdas() {
    let batch1 = [];
    let batch2 = [];

    for (let i = 0; i < vaultFunctions.length; ++i) {
      if (i < 16) {
        batch1.push({
          kind: OpKind.TRANSACTION,
          to: this.contract.address,
          amount: 0,
          parameter: {
            entrypoint: "setup_func",
            value: vaultFunctions[i],
          },
        });
      } else {
        batch2.push({
          kind: OpKind.TRANSACTION,
          to: this.contract.address,
          amount: 0,
          parameter: {
            entrypoint: "setup_func",
            value: vaultFunctions[i],
          },
        });
      }
    }

    let batch = Tezos.wallet.batch(batch1);
    let operation = await batch.send();

    await confirmOperation(Tezos, operation.opHash);
    batch = Tezos.wallet.batch(batch2);
    operation = await batch.send();
    await confirmOperation(Tezos, operation.opHash);
  }
};
