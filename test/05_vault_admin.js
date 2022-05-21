const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const Vault = require("./helpers/vaultInterface");
const vaultStorage = require("./storage/vault");
const { alice, bob } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");

describe("Vault Admin tests", async function () {
  let vault;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      vaultStorage.assets = MichelsonMap.fromLiteral({
        0: {
          asset_type: { fa12: alice.pkh },
          deposit_fee_f: 0,
          withdraw_fee_f: 0,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: false,
        },
      });

      vaultStorage.fish = alice.pkh;
      vaultStorage.management = bob.pkh;
      vault = await new Vault().init(vaultStorage, "vault");
      const operation = await Tezos.contract.transfer({
        to: eve.pkh,
        amount: 10,
      });
      await confirmOperation(Tezos, operation.hash);
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
      await rejects(vault.call("set_management", alice.pkh), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set management", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_management", alice.pkh);

      strictEqual(vault.storage.management, alice.pkh);
    });
  });
  describe("Testing entrypoint: Set_fish", async function () {
    it("Shouldn't set fish if the user is not an fish", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(vault.call("set_fish", alice.pkh), err => {
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

      await vault.call("set_guardian", eve.pkh);

      strictEqual(vault.storage.guardian, eve.pkh);
    });
  });

  describe("Testing entrypoint: Set_deposit_limit", async function () {
    it("Shouldn't set deposit_limit if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_deposit_limit", [0, 99999]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set deposit_limit", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_deposit_limit", [0, 99999]);
      const asset = await vault.storage.assets.get("0");
      strictEqual(asset.deposit_limit.toNumber(), 99999);
    });
  });
  describe("Testing entrypoint: Set_fees", async function () {
    it("Shouldn't set fees if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_fees", [1000, 500, 10, 50]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set fees", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_fees", [1000, 500, 10, 50]);

      strictEqual(vault.storage.fees.native.deposit_f.toNumber(), 1000);
      strictEqual(vault.storage.fees.native.withdraw_f.toNumber(), 500);
      strictEqual(vault.storage.fees.aliens.deposit_f.toNumber(), 10);
      strictEqual(vault.storage.fees.aliens.withdraw_f.toNumber(), 50);
    });
  });
  describe("Testing entrypoint: Set_asset_deposit_fee", async function () {
    it("Shouldn't set asset deposit fee if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_asset_deposit_fee", [0, 9]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set asset deposit fee", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_asset_deposit_fee", [0, 1000000]);
      const asset = await vault.storage.assets.get("0");
      strictEqual(asset.deposit_fee_f.toNumber(), 1000000);
    });
  });
  describe("Testing entrypoint: Set_asset_withdraw_fee", async function () {
    it("Shouldn't set asset deposit fee if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_asset_withdraw_fee", [0, 9]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set asset withdraw fee", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_asset_withdraw_fee", [0, 1000000]);
      const asset = await vault.storage.assets.get("0");
      strictEqual(asset.withdraw_fee_f.toNumber(), 1000000);
    });
  });
  describe("Testing entrypoint: Set_native_config", async function () {
    it("Shouldn't set native config fee if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_native_config", [0, 9]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set native config", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_native_config", [0, 9909]);

      strictEqual(
        vault.storage.asset_config.native.configuration_wid.toNumber(),
        0,
      );
      strictEqual(
        vault.storage.asset_config.native.configuration_address.toNumber(),
        9909,
      );
    });
  });
  describe("Testing entrypoint: Set_aliens_config", async function () {
    it("Shouldn't set aliens config fee if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("set_aliens_config", [0, 9]), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow set aliens config", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("set_aliens_config", [0, 1909]);

      strictEqual(
        vault.storage.asset_config.aliens.configuration_wid.toNumber(),
        0,
      );
      strictEqual(
        vault.storage.asset_config.aliens.configuration_address.toNumber(),
        1909,
      );
    });
  });
  describe("Testing entrypoint: Toggle_pause_vault", async function () {
    it("Shouldn't pausing vault if the user is not an guardian or owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_pause_vault"), err => {
        strictEqual(err.message, "Vault/not-owner-or-guardian");
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
      Tezos.setSignerProvider(signerEve);
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
    it("Shouldn't pausing asset if the user is not an guardian or owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_pause_asset", 0), err => {
        strictEqual(err.message, "Vault/not-owner-or-guardian");
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
      Tezos.setSignerProvider(signerEve);
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
  describe("Testing entrypoint: Delegate_tez", async function () {
    it("Should allow delegate tez", async function () {
      await vault.call("delegate_tez", alice.pkh);
    });
    it("Shouldn't delegate tez if the if passed baker is current", async function () {
      await rejects(vault.call("delegate_tez", alice.pkh), err => {
        strictEqual(
          err.message,
          "(temporary) proto.012-Psithaca.delegate.unchanged",
        );
        return true;
      });
    });
    it("Should allow withdraw delegated tez", async function () {
      await vault.call("delegate_tez", null);
    });
  });
  describe("Testing entrypoint: Default (baker rewards)", async function () {
    it("Should allow receive baker rewards", async function () {
      await vault.call("default", null, 10 / 1e6);
      const bakerRewards = vault.storage.baker_rewards;
      strictEqual(bakerRewards.fish_f.toNumber(), 5 * 10 ** 6);
      strictEqual(bakerRewards.management_f.toNumber(), 5 * 10 ** 6);
    });

    it("Should allow withdraw delegated tez", async function () {
      await vault.call("delegate_tez", null);
    });
  });
  describe("Testing entrypoint: Claim_baker_rewards", async function () {
    it("Shouldn't claim baker rewards if the user is not an madfish or management", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(vault.call("claim_baker_rewards", eve.pkh), err => {
        strictEqual(err.message, "Vault/not-fish-or-management");
        return true;
      });
    });
    it("Should allow claim baker rewards (fish and management)", async function () {
      const prevEveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_baker_rewards", eve.pkh);

      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_baker_rewards", eve.pkh);
      const eveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      const bakerRewards = vault.storage.baker_rewards;
      strictEqual(bakerRewards.fish_f.toNumber(), 0);
      strictEqual(bakerRewards.management_f.toNumber(), 0);
      strictEqual(eveBalance, prevEveBalance + 10);
    });
  });
});
