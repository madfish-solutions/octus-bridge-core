const { Tezos, signerAlice, signerBob } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const BridgeCore = require("./helpers/bridgeInterface");
const bridgeStorage = require("./storage/bridgeCore");
const { alice, bob } = require("../scripts/sandbox/accounts");
//const toBytes = require("../scripts/toBytesForSign");
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
    it("Shouldn't validate a message if round undefined", async function () {
      const signature = await signerAlice.sign("0011");
      await rejects(
        bridge.callView("validate_message", {
          payload: "0011",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
          round: 10,
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/round-undefined");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if the signature's expiration date is out of date", async function () {
      const signature = await signerAlice.sign("0011");

      await rejects(
        bridge.callView("validate_message", {
          payload: "0011",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
          round: 1,
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/signatures-outdated");
          return true;
        },
      );
    });
    it("Shouldn't validate a message if not enough signatures", async function () {
      const signature = await signerAlice.sign("0011");
      await rejects(
        bridge.callView("validate_message", {
          payload: "0011",
          signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
          round: 2,
        }),
        err => {
          strictEqual(err.failWith.string, "Bridge-core/not-enough-signatures");
          return true;
        },
      );
    });
    it("Shouldn't validate signature if relay is unknown", async function () {
      const signature = await signerBob.sign("0011");
      const result = await bridge.callView("validate_message", {
        payload: "0011",
        signatures: MichelsonMap.fromLiteral({ [bob.pk]: signature.sig }),
        round: 0,
      });

      notStrictEqual(result, true);
    });
    it("Shouldn't validate signature if invalid payload", async function () {
      const signature = await signerAlice.sign("0021");
      const result = await bridge.callView("validate_message", {
        payload: "0011",
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        round: 0,
      });

      notStrictEqual(result, true);
    });
    it("Shouldn't validate message if public key does not match signature", async function () {
      const signature = await signerAlice.sign("0011");
      const result = await bridge.callView("validate_message", {
        payload: "0011",
        signatures: MichelsonMap.fromLiteral({ [bob.pk]: signature.sig }),
        round: 0,
      });

      notStrictEqual(result, true);
    });
    it("Should validate message if 1/1 signatures validated", async function () {
      const signature = await signerAlice.sign("0011");

      const result = await bridge.callView("validate_message", {
        payload: "0011",
        signatures: MichelsonMap.fromLiteral({ [alice.pk]: signature.sig }),
        round: 0,
      });

      strictEqual(result, true);
    });
    it("Should validate message if 1/2 signatures validated", async function () {
      const signature_1 = await signerAlice.sign("0011");
      const signature_2 = await signerBob.sign("0021");
      const result = await bridge.callView("validate_message", {
        payload: "0011",
        signatures: MichelsonMap.fromLiteral({
          [alice.pk]: signature_1.sig,
          [bob.pk]: signature_2.sig,
        }),
        round: 3,
      });

      strictEqual(result, true);
    });
  });
});
