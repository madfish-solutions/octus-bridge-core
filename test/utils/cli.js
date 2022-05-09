const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { Tzip16Module } = require("@taquito/tzip16");
const { alice, bob, secpSigner } = require("../../scripts/sandbox/accounts");

const env = require("../../env");
const networkConfig = env.networks.development;

const rpc = networkConfig.rpc;
const Tezos = new TezosToolkit(rpc);
const signerAlice = new InMemorySigner(networkConfig.secretKey);
const signerBob = new InMemorySigner(bob.sk);
const signerSecp = new InMemorySigner(secpSigner.sk);
Tezos.setSignerProvider(signerAlice);

Tezos.addExtension(new Tzip16Module());
module.exports = { Tezos, signerAlice, signerBob, signerSecp, alice, bob };
