const { Tezos } = require("../utils/cli");

const { migrate } = require("../../scripts/helpers");
const { confirmOperation } = require("../../scripts/confirmation");

module.exports = class Contract {
  address;
  contract;
  storage;

  constructor() {}
  async init(storage, contractName) {
    const deployedContract = await migrate(Tezos, contractName, storage);

    this.contract = await Tezos.contract.at(deployedContract);
    this.address = deployedContract;
    this.storage = await this.updateStorage();

    return this;
  }

  async updateStorage() {
    const updatedStorage = await this.contract.storage();
    this.storage = updatedStorage;
    return updatedStorage;
  }

  async call(option, value = null) {
    let params = [];

    if (typeof value === "object") {
      for (let key in value) {
        params.push(value[key]);
      }
    } else params.push(value);

    if (params.length === 0) {
      params.push(null);
    }
    const operation = await this.contract.methods[option](...params).send();
    await confirmOperation(Tezos, operation.hash);
    return this.updateStorage();
  }
  async callView(viewName, params, caller = this.address) {
    return await this.contract.contractViews[viewName](params).executeView({
      viewCaller: caller,
    });
  }
};
