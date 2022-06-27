const { migrate } = require("../scripts/helpers");

const vaultStorage = require("../storage/vault");
const env = require("../env");
const { tezos } = require("../test/utils/cli");
const vaultFunctions = require("../builds/lambdas/vault_lambdas.json");
const { OpKind } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");

module.exports = async (tezos) => {
  const sender = await tezos.signer.publicKeyHash();
  vaultStorage.storage.owner = sender;
  if (env.network === "mainnet") {
    const assetConfig = {
      native: {
        configuration_wid: env.networks[env.network].configurationWidNative,
        configuration_address: env.networks[env.network].configurationWidNative,
      },
      aliens: {
        configuration_wid: env.networks[env.network].configurationWidAliens,
        configuration_address:
          env.networks[env.network].configurationAddressAliens,
      },
    };
    vaultStorage.storage.asset_config = assetConfig;
  }
  const bridgeAddress = require("../builds/bridge_core.json").networks[
    env.network
  ]["bridge_core"];

  vaultStorage.storage.bridge = bridgeAddress;

  const contractAddress = await migrate(tezos, "vault", vaultStorage);

  let batch1 = [];
  let batch2 = [];
  let batch3 = [];
  let batch4 = [];
  for (let i = 0; i < vaultFunctions.length; ++i) {
    if (i < 8) {
      batch1.push({
        kind: OpKind.TRANSACTION,
        to: contractAddress,
        amount: 0,
        parameter: {
          entrypoint: "setup_func",
          value: vaultFunctions[i],
        },
      });
    } else if (i > 8 && i < 15) {
      batch2.push({
        kind: OpKind.TRANSACTION,
        to: contractAddress,
        amount: 0,
        parameter: {
          entrypoint: "setup_func",
          value: vaultFunctions[i],
        },
      });
    } else if (i > 15 && i < 23) {
      batch3.push({
        kind: OpKind.TRANSACTION,
        to: contractAddress,
        amount: 0,
        parameter: {
          entrypoint: "setup_func",
          value: vaultFunctions[i],
        },
      });
    } else {
      batch4.push({
        kind: OpKind.TRANSACTION,
        to: contractAddress,
        amount: 0,
        parameter: {
          entrypoint: "setup_func",
          value: vaultFunctions[i],
        },
      });
    }
  }

  let batch = tezos.wallet.batch(batch1);
  let operation = await batch.send();

  await confirmOperation(tezos, operation.opHash);
  batch = tezos.wallet.batch(batch2);
  operation = await batch.send();
  await confirmOperation(tezos, operation.opHash);
  batch = tezos.wallet.batch(batch3);
  operation = await batch.send();
  await confirmOperation(tezos, operation.opHash);
  batch = tezos.wallet.batch(batch4);
  operation = await batch.send();
  await confirmOperation(tezos, operation.opHash);
  console.log(`Vault: ${contractAddress}`);
};
