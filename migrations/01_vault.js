const { migrate } = require("../scripts/helpers");

const vaultStorage = require("../storage/vault");
const env = require("../env");

module.exports = async tezos => {
  const sender = await tezos.signer.publicKeyHash();
  vaultStorage.storage.owner = sender;
  if (env.network === "mainnet") {
    const assetConfig = {
      native: {
        configuration_wid: env.networks[env.network].configurationWid,
        configuration_address: env.networks[env.network].configurationWid,
      },
      aliens: {
        configuration_wid: env.networks[env.network].configurationWid,
        configuration_address: env.networks[env.network].configurationAddress,
      },
    };
    vaultStorage.storage.asset_config = assetConfig;
  }
  const bridgeAddress = require("../builds/bridge_core.json").networks[
    env.network
  ]["bridge_core"];

  vaultStorage.storage.bridge = bridgeAddress;

  const contractAddress = await migrate(tezos, "vault", vaultStorage);

  console.log(`Vault: ${contractAddress}`);
};
