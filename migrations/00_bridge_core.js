const { migrate } = require("../scripts/helpers");

const storage = require("../storage/bridgeCore");
const env = require("../env");

module.exports = async tezos => {
  const sender = await tezos.signer.publicKeyHash();
  storage.owner = sender;

  if (env.network !== "development") {
    storage.configuration_wid = env.networks[env.network].configurationWid;
    storage.configuration_wid = env.networks[env.network].configurationAddress;
  }

  const contractAddress = await migrate(tezos, "bridge_core", storage);

  console.log(`Bridge: ${contractAddress}`);
};
