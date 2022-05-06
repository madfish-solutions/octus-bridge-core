const { Tezos, signerAlice, signerBob } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const BridgeCore = require("./helpers/bridgeInterface");
const bridgeStorage = require("./storage/bridgeCore");
const { alice, bob } = require("../scripts/sandbox/accounts");
const toBytes = require("../scripts/packPayload");
const { MichelsonMap } = require("@taquito/taquito");

describe("Bridge-core validate message test", async function () {
  let bridge;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      bridgeStorage.rounds = MichelsonMap.fromLiteral({
        0: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: "1",
        },
        1: {
          end_time: String(0),
          ttl: String(2000),
          relays: [alice.pk],
          required_signatures: 1,
        },
        2: {
          end_time: String(Date.now() + 1000),
          ttl: String(Date.now() + 2000),
          relays: [alice.pk],
          required_signatures: 2,
        },
        3: {
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

  describe("Testing view method: Validate_message", async function () {
    const payload_1 = {
      eventTrxLt: 1,
      eventTimestamp: 2,
      eventData: "0011",
      confWid: 2,
      confAddr: "0011",
      eventContractWid: 2,
      eventContractAddr: "0011",
      proxy: "0011",
      round: 2,
    };
    it("Shouldn't validate signature if invalid payload", async function () {
      const signature = await signerAlice.sign("0021");
      await rejects(
        bridge.callView("validate_message", {
          payload: "0021",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/invalid-payload");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if round undefined", async function () {
      payload_1.round = 10;
      const payload = toBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.callView("validate_message", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/round-undefined");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if the signature's expiration date is out of date", async function () {
      payload_1.round = 1;
      const payload = toBytes(payload_1);
      const signature = await signerAlice.sign(payload);

      await rejects(
        bridge.callView("validate_message", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/signatures-outdated");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if not enough signatures", async function () {
      payload_1.round = 2;
      const payload = toBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      await rejects(
        bridge.callView("validate_message", {
          payload: payload,
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't validate signature if relay is unknown", async function () {
      payload_1.round = 0;
      const payload = toBytes(payload_1);
      const signature = await signerBob.sign(payload);
      const result = await bridge.callView("validate_message", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [bob.pk]: signature.sig }),
      });

      notStrictEqual(result, true);
    });

    it("Shouldn't validate message if public key does not match signature", async function () {
      payload_1.round = 0;
      const payload = toBytes(payload_1);
      const signature = await signerAlice.sign(payload);
      const result = await bridge.callView("validate_message", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [bob.pk]: signature.sig }),
      });

      notStrictEqual(result, true);
    });
    it("Should validate message if 1/1 signatures validated", async function () {
      payload_1.round = 0;
      const payload = toBytes(payload_1);
      const signature = await signerAlice.sign(payload);

      const result = await bridge.callView("validate_message", {
        payload: payload,
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
      });

      strictEqual(result, true);
    });
    it("Should validate message if 1/2 signatures validated", async function () {
      payload_1.round = 3;
      const signature_1 = await signerAlice.sign(toBytes(payload_1));
      let wrongPayload = payload_1;
      wrongPayload.eventData = "2211";
      const signature_2 = await signerBob.sign(toBytes(wrongPayload));
      const result = await bridge.callView("validate_message", {
        payload: toBytes(payload_1),
        signatures: MichelsonMap.fromLiteral({
          [alice.pk]: signature_1.sig,
          [bob.pk]: signature_2.sig,
        }),
      });

      strictEqual(result, true);
    });
  });
});
