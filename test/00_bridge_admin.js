const { Tezos, signerAlice, signerBob } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const BridgeCore = require("./helpers/bridgeInterface");
const bridgeStorage = require("./storage/bridgeCore");
const { alice, bob } = require("../scripts/sandbox/accounts");

describe("Bridge-core Admin tests", async function () {
  let bridge;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      bridge = await new BridgeCore().init(bridgeStorage, "bridge_core");
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing entrypoint: Set_owner", async function () {
    it("Shouldn't seting owner if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(bridge.call("set_owner", bob.pkh), err => {
        strictEqual(err.message, "Bridge-core/not-owner");
        return true;
      });
    });
    it("Should allow start transfer ownership", async function () {
      Tezos.setSignerProvider(signerAlice);

      await bridge.call("set_owner", bob.pkh);

      strictEqual(bridge.storage.pending_owner, bob.pkh);
    });
  });
  describe("Testing entrypoint: Confirm_owner", async function () {
    it("Shouldn't confirm owner if the user is not an pending owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(bridge.call("confirm_owner", bob.pkh), err => {
        strictEqual(err.message, "Bridge-core/not-pending-owner");
        return true;
      });
    });
    it("Should allow confirm transfer ownership", async function () {
      Tezos.setSignerProvider(signerBob);

      await bridge.call("confirm_owner", bob.pkh);

      strictEqual(bridge.storage.owner, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_round_submitter", async function () {
    it("Shouldn't seting Round Submitter if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(bridge.call("set_round_submitter", bob.pkh), err => {
        strictEqual(err.message, "Bridge-core/not-owner");
        return true;
      });
    });
    it("Should allow set Round Submitter", async function () {
      Tezos.setSignerProvider(signerBob);

      await bridge.call("set_round_submitter", bob.pkh);

      strictEqual(bridge.storage.round_submitter, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_round_ttl", async function () {
    it("Shouldn't seting ttl of round if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(bridge.call("set_round_ttl", 1000), err => {
        strictEqual(err.message, "Bridge-core/not-owner");
        return true;
      });
    });
    it("Should allow set ttl of round", async function () {
      Tezos.setSignerProvider(signerBob);

      await bridge.call("set_round_ttl", 1000);

      strictEqual(bridge.storage.ttl.toNumber(), 1000);
    });
  });
  describe("Testing entrypoint: Toggle_pause_bridge", async function () {
    it("Shouldn't toggle pausing bridge if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(bridge.call("toggle_pause_bridge"), err => {
        strictEqual(err.message, "Bridge-core/not-owner");
        return true;
      });
    });
    it("Should toggle pausing bridge (pause/unpause)", async function () {
      // TODO:: Add check for other dependent entrypoints
      Tezos.setSignerProvider(signerBob);

      await bridge.call("toggle_pause_bridge");

      strictEqual(bridge.storage.paused, true);

      await bridge.call("toggle_pause_bridge");
      strictEqual(bridge.storage.paused, false);
    });
  });
  describe("Testing entrypoint: Toggle_ban_relay", async function () {
    it("Shouldn't toggle ban relay if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(bridge.call("toggle_ban_relay", bob.pk), err => {
        strictEqual(err.message, "Bridge-core/not-owner");
        return true;
      });
    });
    it("Should toggle ban relay (ban/unban)", async function () {
      // TODO:: Add check for other dependent entrypoints
      Tezos.setSignerProvider(signerBob);

      await bridge.call("toggle_ban_relay", bob.pk);
      let bannedRelay = await bridge.storage.banned_relays.get(bob.pk);
      strictEqual(bannedRelay, true);

      await bridge.call("toggle_ban_relay", bob.pk);
      bannedRelay = await bridge.storage.banned_relays.get(bob.pk);
      strictEqual(bannedRelay, false);
    });
  });
  describe("Testing entrypoint: Force_round_relay", async function () {
    it("Shouldn't force new round if the user is not an Round Submitter", async function () {
      Tezos.setSignerProvider(signerAlice);
      const newRound = {
        endTime: String(Date.now() + 1000),
        relayKeys: [bob.pk],
        validateQuorum: 1,
      };
      await rejects(bridge.call("force_round_relay", newRound), err => {
        strictEqual(err.message, "Bridge-core/not-round-submitter");
        return true;
      });
    });
    it("Should force starting new round", async function () {
      // TODO:: Add check for other dependent entrypoints
      Tezos.setSignerProvider(signerBob);
      const newRound = {
        endTime: String(Date.now() + 1000),
        relayKeys: [bob.pk],
        validateQuorum: 1,
      };
      await bridge.call("force_round_relay", newRound);
      const addedRound = await bridge.storage.rounds.get("0");
      notStrictEqual(addedRound, undefined);
    });
  });
});
