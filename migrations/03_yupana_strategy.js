const { migrate } = require("../scripts/helpers");

const storage = require("../storage/yupanaStrategy");
const env = require("../env");

module.exports = async tezos => {
  const sender = await tezos.signer.publicKeyHash();
  storage.owner = sender;

  if (env.network !== "development") {
    storage.protocol = env.networks[env.network].yupanaAddress;
    storage.protocol_asset_id = env.networks[env.network].yupanaAssetId;
    storage.price_feed = env.networks[env.network].priceFeedAddress;
  }
  const vaultAddress = require("../builds/vault.json").networks[env.network][
    "vault"
  ];
  storage.vault = vaultAddress;

  const contractAddress = await migrate(tezos, "yupana_strategy", storage);

  console.log(`Yupana-strategy: ${contractAddress}`);
};
