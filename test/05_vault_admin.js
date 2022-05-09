const { Tezos, signerAlice, signerBob } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const Vault = require("./helpers/vaultInterface");
const vaultStorage = require("./storage/vault");
const { alice, bob } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");

describe("Vault Admin tests", async function () {
  let vault;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      vaultStorage.assets = MichelsonMap.fromLiteral({
        0: {
          asset_type: { fa12: alice.pkh },
          precision: 6,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
        },
      });
      vault = await new Vault().init(vaultStorage, "vault");
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing entrypoint: Set_owner", async function () {
    it("Shouldn't seting owner if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(vault.call("set_owner", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow start transfer ownership", async function () {
      Tezos.setSignerProvider(signerAlice);

      await vault.call("set_owner", bob.pkh);

      strictEqual(vault.storage.pending_owner, bob.pkh);
    });
  });
  describe("Testing entrypoint: Confirm_owner", async function () {
    it("Shouldn't confirm owner if the user is not an pending owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("confirm_owner", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-pending-owner");
        return true;
      });
    });
    it("Should allow confirm transfer ownership", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("confirm_owner", bob.pkh);

      strictEqual(vault.storage.owner, bob.pkh);
    });
  });

  describe("Testing entrypoint: Set_bridge", async function () {
    it("Shouldn't set bridge if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_bridge", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set bridge", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_bridge", bob.pkh);

      strictEqual(vault.storage.bridge, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_management", async function () {
    it("Shouldn't set management if the user is not an  owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_management", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set management", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_management", bob.pkh);

      strictEqual(vault.storage.management, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_fish", async function () {
    it("Shouldn't set fish if the user is not an fish", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(vault.call("set_fish", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-fish");
        return true;
      });
    });
    it("Should allow set fish", async function () {
      Tezos.setSignerProvider(signerAlice);

      await vault.call("set_fish", bob.pkh);

      strictEqual(vault.storage.fish, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_guardian", async function () {
    it("Shouldn't set guardian if the user is not an guardian", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(vault.call("set_guardian", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-guardian");
        return true;
      });
    });
    it("Should allow set guardian", async function () {
      Tezos.setSignerProvider(signerAlice);

      await vault.call("set_guardian", bob.pkh);

      strictEqual(vault.storage.guardian, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_baker", async function () {
    Tezos.setSignerProvider(signerAlice);
    it("Shouldn't set baker if the user is not an owner", async function () {
      await rejects(vault.call("set_baker", bob.pkh), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set baker", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_baker", bob.pkh);

      strictEqual(vault.storage.baker, bob.pkh);
    });
  });
  describe("Testing entrypoint: Set_deposit_limit", async function () {
    it("Shouldn't set deposit_limit if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_deposit_limit", 99999), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set deposit_limit", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_deposit_limit", 9999999);

      strictEqual(vault.storage.deposit_limit.toNumber(), 9999999);
    });
  });
  describe("Testing entrypoint: Set_fees", async function () {
    it("Shouldn't set fees if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_fees", [9, 9]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set fees", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_fees", [100000, 100000]);

      strictEqual(vault.storage.fees.deposit.toNumber(), 100000);
      strictEqual(vault.storage.fees.withdraw.toNumber(), 100000);
    });
  });
  describe("Testing entrypoint: Toggle_pause_vault", async function () {
    it("Shouldn't pausing vault if the user is not an guardian", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_pause_vault"), err => {
        strictEqual(err.message, "Vault/not-guardian");
        return true;
      });
    });
    it("Should allow pause vault", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_pause_vault");

      strictEqual(vault.storage.paused, true);
      //TODO::
    });
    it("Shouldn't unpause vault if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_pause_vault"), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow unpause vault", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_pause_vault");

      strictEqual(vault.storage.paused, false);
      //TODO::
    });
  });
  describe("Testing entrypoint: Toggle_pause_asset", async function () {
    it("Shouldn't pausing asset if the user is not an guardian", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_pause_asset", 0), err => {
        strictEqual(err.message, "Vault/not-guardian");
        return true;
      });
    });
    it("Should allow pause asset", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_pause_asset", 0);
      const asset = await vault.storage.assets.get("0");
      strictEqual(asset.paused, true);
      //TODO::
    });
    it("Shouldn't unpause asset if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_pause_asset", 0), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow unpause asset", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_pause_asset", 0);
      const asset = await vault.storage.assets.get("0");
      strictEqual(asset.paused, false);
      //TODO::
    });
  });
  describe("Testing entrypoint: Toggle_ban_asset", async function () {
    it("Shouldn't ban asset if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        vault.call("toggle_ban_asset", ["fa12", alice.pkh]),
        err => {
          strictEqual(err.message, "Vault/not-owner");
          return true;
        },
      );
    });
    it("Should allow ban asset", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_ban_asset", ["fa12", alice.pkh]);
      const bannedAsset = await vault.storage.banned_assets.get({
        fa12: alice.pkh,
      });
      strictEqual(bannedAsset, true);
      //TODO::
    });
    it("Shouldn't unban asset if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        vault.call("toggle_ban_asset", ["fa12", alice.pkh]),
        err => {
          strictEqual(err.message, "Vault/not-owner");
          return true;
        },
      );
    });
    it("Should allow unban asset", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_ban_asset", ["fa12", alice.pkh]);
      const bannedAsset = await vault.storage.banned_assets.get({
        fa12: alice.pkh,
      });
      strictEqual(bannedAsset, false);
      //TODO::
    });
  });
  describe("Testing entrypoint: Update_metadata", async function () {
    it("Shouldn't update metadata if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        vault.call("update_metadata", [
          MichelsonMap.fromLiteral({
            foo: Buffer.from("bar").toString("hex"),
          }),
        ]),
        err => {
          strictEqual(err.message, "Vault/not-owner");
          return true;
        },
      );
    });
    it("Should allow change metadata", async function () {
      Tezos.setSignerProvider(signerBob);
      await vault.call("update_metadata", [
        MichelsonMap.fromLiteral({
          foo: Buffer.from("alice").toString("hex"),
        }),
      ]);

      const meta = await vault.storage.metadata.get("foo");
      strictEqual(meta, Buffer.from("alice").toString("hex"));
    });
  });
});
