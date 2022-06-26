const { migrate } = require("../scripts/helpers");
const env = require("../env");
const network = env.network;
const tokenStorage = require("../storage/wrappedToken");

module.exports = async tezos => {
  const sender = await tezos.signer.publicKeyHash();
  const vaultAddress = require("../builds/vault.json").networks[network][
    "vault"
  ];

  tokenStorage.owner = sender;
  tokenStorage.vault = vaultAddress;

  const tokenAddress = await migrate(tezos, "wrapped_token", tokenStorage);

  console.log(`Wrapped-token address: ${tokenAddress}`);
};
