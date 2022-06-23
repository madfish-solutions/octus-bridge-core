const Contract = require("./commonInterface");
const vaultFunctions = require("../../builds/lambdas/vault_lambdas.json");
module.exports = class Vault extends Contract {
  async updateStorage() {
    const updatedStorage = await this.contract.storage();
    this.storage = updatedStorage.storage;
    return updatedStorage;
  }
  async setLambdas() {
    let batch1 = [];

    for (let i = 0; i < vaultFunctions.length; ++i) {
      batch1.push({
        kind: OpKind.TRANSACTION,
        to: this.contract.address,
        amount: 0,
        parameter: {
          entrypoint: "setup_func",
          value: farmFunctions[i],
        },
      });
    }

    let batch = Tezos.wallet.batch(batch1);
    let operation = await batch.send();

    await confirmOperation(Tezos, operation.opHash);
  }
};
