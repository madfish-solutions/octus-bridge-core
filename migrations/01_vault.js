const { migrate } = require("../scripts/helpers");

const vaultStorage = require("../storage/vault");
const env = require("../env");
const { Tezos } = require("../test/utils/cli");
const vaultFunctions = require("../builds/lambdas/vault_lambdas.json");
const { OpKind } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");

module.exports = async tezos => {
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

  for (let i = 0; i < vaultFunctions.length; ++i) {
    if (i < 16) {
      batch1.push({
        kind: OpKind.TRANSACTION,
        to: contractAddress,
        amount: 0,
        parameter: {
          entrypoint: "setup_func",
          value: vaultFunctions[i],
        },
      });
    } else {
      batch2.push({
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

  let batch = Tezos.wallet.batch(batch1);
  let operation = await batch.send();

  await confirmOperation(Tezos, operation.opHash);
  batch = Tezos.wallet.batch(batch2);
  operation = await batch.send();
  await confirmOperation(Tezos, operation.opHash);
  console.log(`Vault: ${contractAddress}`);
};
