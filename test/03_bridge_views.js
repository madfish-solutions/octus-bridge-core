const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { notStrictEqual, strictEqual, deepStrictEqual } = require("assert");
const BridgeCore = require("./helpers/bridgeInterface");
const bridgeStorage = require("./storage/bridgeCore");
const { alice, bob } = require("../scripts/sandbox/accounts");
const toBytes = require("../scripts/packPayload");
const { MichelsonMap } = require("@taquito/taquito");

describe("Bridge-core views test", async function () {
  let bridge;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      bridgeStorage.initial_round = 0;
      bridgeStorage.last_round = 1;
      bridgeStorage.banned_relays = MichelsonMap.fromLiteral({
        [eve.pk]: true,
      });
      bridgeStorage.rounds = MichelsonMap.fromLiteral({
        0: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: 1,
        },
        1: {
          end_time: String(0),
          ttl: String(0),
          relays: [bob.pk],
          required_signatures: 1,
        },
      });
      bridge = await new BridgeCore().init(bridgeStorage, "bridge_core");
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing view method: Is_banned", async function () {
    it("Should return is_banned true", async function () {
      const response = await bridge.callView("is_banned", eve.pk);
      strictEqual(response, true);
    });
    it("Should return is_banned false", async function () {
      const response = await bridge.callView("is_banned", alice.pk);
      strictEqual(response, false);
    });
  });
  describe("Testing view method: Is_relay", async function () {
    it("Should return True", async function () {
      const response = await bridge.callView("is_relay", {
        round: 0,
        relay_key: alice.pk,
      });
      strictEqual(response, true);
    });
    it("Should return False", async function () {
      const response = await bridge.callView("is_relay", {
        round: 0,
        relay_key: bob.pk,
      });
      strictEqual(response, false);
    });
    it("Should return False if round undefined", async function () {
      const response = await bridge.callView("is_relay", {
        round: 42,
        relay_key: alice.pk,
      });
      strictEqual(response, false);
    });
  });
  describe("Testing view method: Is_round_rotten", async function () {
    it("Should return True", async function () {
      const response = await bridge.callView("is_round_rotten", 1);
      strictEqual(response, true);
    });
    it("Should return False", async function () {
      const response = await bridge.callView("is_round_rotten", 0);
      strictEqual(response, false);
    });
    it("Should return True if round undefined", async function () {
      const response = await bridge.callView("is_round_rotten", 42);
      strictEqual(response, true);
    });
  });
  describe("Testing view method: Decode_everscale_event", async function () {
    const payload_1 = {
      eventTrxLt: 1,
      eventTimestamp: String(Date.now()),
      eventData: "0011",
      confWid: 0,
      confAddr: 1337,
      eventContractWid: 0,
      eventContractAddr: 1337,
      proxy: bob.pkh,
      round: 0,
    };

    it("Should return decoded everscale event", async function () {
      const payload = toBytes(payload_1);
      const response = await bridge.callView("decode_everscale_event", payload);
      strictEqual(response.round.toNumber(), 0);
      strictEqual(response.proxy, bob.pkh);
    });
    it("Shouldn't decode everscale event if invalid payload", async function () {
      await bridge.callView("decode_everscale_event", 0).catch(err => {});
    });
  });
  describe("Testing view method: Decode_round_relays_event_data", async function () {
    const payload_1 = {
      eventTrxLt: 1,
      eventTimestamp: String(Date.now()),
      eventData: "0011",
      confWid: 0,
      confAddr: 1337,
      eventContractWid: 0,
      eventContractAddr: 1337,
      proxy: bob.pkh,
      round: 0,
    };

    it("Should return decoded round relays event data", async function () {
      const payload = toBytes(payload_1);
      const response = await bridge.callView(
        "decode_round_relays_event_data",
        payload,
      );
      const round = await bridge.storage.rounds.get("0");
      strictEqual(response.round.toNumber(), 0);
      strictEqual(response.round_end, round.end_time);
      deepStrictEqual(response.relays, [alice.pk]);
    });
    it("Shouldn't decode round relays event data if invalid payload", async function () {
      await bridge
        .callView("decode_round_relays_event_data", 0)
        .catch(err => {});
    });
    it("Shouldn't decode round relays event data if round in payload undefined", async function () {
      payload_1.round = 42;
      const payload = toBytes(payload_1);
      await bridge
        .callView("decode_round_relays_event_data", payload)
        .catch(err => {});
    });
  });
});
