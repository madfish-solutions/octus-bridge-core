require("dotenv").config();

const { alice, dev } = require("./scripts/sandbox/accounts");

module.exports = {
  buildsDir: "builds",
  migrationsDir: "migrations",
  contractsDir: "contracts/main",
  contractsTestDir: "contracts/tests/main",
  ligoVersion: "0.40.0",
  network: "development",
  networks: {
    development: {
      rpc: "http://localhost:8732",
      network_id: "*",
      secretKey: alice.sk,
    },
    ithaca: {
      rpc: "https://ithacanet.ecadinfra.com/",
      port: 443,
      network_id: "*",
      secretKey: dev.sk,
      yupanaAddress: alice.pkh,
      yupanaAssetId: 0,
      priceFeedAddress: alice.pkh,
      configurationWid: 0,
      configurationAddress: "0000",
      configurationWidAliens: 0,
      configurationAddressAliens: "0000",
      configurationWidNative: 0,
      configurationAddressNative: "0000",
    },
    mainnet: {
      rpc: "https://mainnet.smartpy.io",
      port: 443,
      network_id: "*",
      secretKey: dev.sk,
      configurationWid: 0,
      configurationAddress: "0000",
      configurationWidAliens: 0,
      configurationAddressAliens: "0000",
      configurationWidNative: 0,
      configurationAddressNative: "0000",
      yupanaAddress: alice.pkh,
      yupanaAssetId: 0,
      priceFeedAddress: alice.pkh,
    },
  },
};
