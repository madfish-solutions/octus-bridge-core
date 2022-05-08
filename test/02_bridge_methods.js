const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");

const { notStrictEqual, rejects, strictEqual } = require("assert");
const BridgeCore = require("./helpers/bridgeInterface");
const bridgeStorage = require("./storage/bridgeCore");
const { alice, bob, eve } = require("../scripts/sandbox/accounts");
const payloadToBytes = require("../scripts/packPayload");
const roundToBytes = require("../scripts//packNewRound");
const { MichelsonMap } = require("@taquito/taquito");

describe("Bridge-core methods test", async function () {
  let bridge;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      bridgeStorage.paused = false;
      bridgeStorage.initial_round = 1;
      bridgeStorage.round_count = 1;
      bridgeStorage.banned_relays = MichelsonMap.fromLiteral({
        [eve.pk]: true,
      });

      bridgeStorage.rounds = MichelsonMap.fromLiteral({
        1: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: 1,
        },
        2: {
          end_time: String(0),
          ttl: String(2000),
          relays: [alice.pk],
          required_signatures: 1,
        },
        3: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: 2,
        },
        4: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk, bob.pk],
          required_signatures: 1,
        },
      });
      bridge = await new BridgeCore().init(bridgeStorage, "bridge_core");
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing view method: Set_round_relays", async function () {
    let round_1;
    let round_2;
    let payload_1;

    before(async () => {
      round_1 = {
        endTime: String(Date.now() + 100000),
        relays: [`"${alice.pk}"`],
        requiredSignatures: 1,
      };

      payload_1 = {
        eventTrxLt: 1,
        eventTimestamp: 2,
        eventData: roundToBytes(round_1),
        confWid: 2,
        confAddr: "0011",
        eventContractWid: 2,
        eventContractAddr: "0011",
        proxy: "0011",
        round: 3,
      };
    });

    it("Shouldn't validate signature if invalid payload", async function () {
      const signature = await signerAlice.sign("0021");

      await rejects(
        bridge.call("set_round_relays", {
          payload: "0021",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/invalid-payload");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if greater than last round", async function () {
      payload_1.round = 10;
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/round-greater-than-last-round");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if round is less than initial round", async function () {
      payload_1.round = 0;
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/round-less-than-initial-round");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if the signature's expiration date is out of date", async function () {
      payload_1.round = 2;
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);

      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/round-outdated");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if not enough signatures", async function () {
      payload_1.round = 3;
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't validate signature if relay is unknown", async function () {
      payload_1.round = 1;
      const payload = payloadToBytes(payload_1);
      const signature = await signerBob.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({
            [bob.pk]: signature.sig,
          }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/not-enough-signatures");
          return true;
        },
      );
    });

    it("Shouldn't validate message if public key does not match signature", async function () {
      payload_1.round = 1;
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({
            [bob.pk]: signature.sig,
          }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't validate message if the relay is banned", async function () {
      payload_1.round = 4;
      const payload = payloadToBytes(payload_1);
      const signature = await signerEve.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({
            [eve.pk]: signature.sig,
          }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't validate message if event data is invalid", async function () {
      payload_1.round = 1;
      payload_1.eventData = "0011";
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.call("set_round_relays", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({
            [alice.pk]: signature.sig,
          }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/invalid-new-round");
          return true;
        },
      );
    });
    it("Should validate message if 1/1 signatures validated", async function () {
      payload_1.round = 1;
      const payload = payloadToBytes(payload_1);
      const signature = await signerAlice.sign(payload);

      const response = await bridge.callView("validate_message", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });

      notStrictEqual(response.message_valid, undefined);
    });
    it("Should validate message if 1/2 signatures validated", async function () {
      payload_1.round = 4;
      const signature_1 = await signerAlice.sign(payloadToBytes(payload_1));
      let wrongPayload = payload_1;
      wrongPayload.eventData = "2211";
      const signature_2 = await signerBob.sign(payloadToBytes(wrongPayload));
      const response = await bridge.callView("validate_message", {
        payload: payloadToBytes(payload_1),
        signatures: MichelsonMap.fromLiteral({
          [alice.pk]: signature_1.sig,
          [bob.pk]: signature_2.sig,
        }),
      });

      notStrictEqual(response.message_valid, undefined);
    });
    it("Shouldn't validate signature if the bridge is paused", async function () {
      const signature = await signerAlice.sign("0021");
      bridgeStorage.paused = true;
      bridge = await new BridgeCore().init(bridgeStorage, "bridge_core");

      await rejects(
        bridge.call("set_round_relays", {
          payload: "0021",
          signatures: MichelsonMap.fromLiteral({
            [alice.pk]: signature.sig,
          }),
        }),
        err => {
          strictEqual(err.message, "Bridge-core/bridge-paused");
          return true;
        },
      );
    });
  });
});
