const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { Tzip16Module } = require("@taquito/tzip16");
const { alice, bob, eve } = require("../../scripts/sandbox/accounts");

const env = require("../../env");
const networkConfig = env.networks.development;

const rpc = networkConfig.rpc;
const Tezos = new TezosToolkit(rpc);
const signerAlice = new InMemorySigner(networkConfig.secretKey);
const signerBob = new InMemorySigner(bob.sk);
const signerEve = new InMemorySigner(eve.sk);
Tezos.setSignerProvider(signerAlice);

Tezos.addExtension(new Tzip16Module());
module.exports = { Tezos, signerAlice, signerBob, signerEve, alice, bob };
