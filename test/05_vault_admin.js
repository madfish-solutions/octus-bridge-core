const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const {
  rejects,
  strictEqual,
  notStrictEqual,

  deepStrictEqual,
} = require("assert");
const Vault = require("./helpers/vaultInterface");
const Token = require("./helpers/tokenInterface");
const WrappedToken = require("./helpers/wrappedTokenInterface");
const fa12TokenStorage = require("../test/storage/FA12");
const fa2TokenStorage = require("../test/storage/FA2");
const wrappedTokenStorage = require("../test/storage/wrappedToken");

const vaultStorage = require("./storage/vault");
const { alice, bob } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");

const precision = 10 ** 6;

describe("Vault Admin tests", async function () {
  let vault;
  let fa12Token;
  let fa2Token;
  let wrappedToken;

  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      fa12Token = await new Token().init(fa12TokenStorage);
      fa2Token = await new Token("fa2").init(fa2TokenStorage);

      wrappedToken = await new WrappedToken("fa2").init(
        wrappedTokenStorage,
        "wrapped_token",
      );

      await wrappedToken.createToken(
        MichelsonMap.fromLiteral({
          name: Buffer.from("wrapped", "ascii").toString("hex"),
        }),
      );

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
      const feeBalances = MichelsonMap.fromLiteral({
        [alice.pkh]: 500 * precision,
        [bob.pkh]: 500 * precision,
      });
      vaultStorage.fee_balances.set({ fa12: fa12Token.address }, feeBalances);
      vaultStorage.fee_balances.set(
        { fa2: { address: fa2Token.address, id: fa2Token.tokenId } },
        feeBalances,
      );
      vaultStorage.fee_balances.set({ tez: null }, feeBalances);
      vaultStorage.fee_balances.set(
        {
          wrapped: { address: wrappedToken.address, id: wrappedToken.tokenId },
        },
        feeBalances,
      );

      vault = await new Vault().init(vaultStorage, "vault");
      const operation = await Tezos.contract.transfer({
        to: eve.pkh,
        amount: 10,
      });
      await confirmOperation(Tezos, operation.hash);
      await wrappedToken.call("mint", [
        [{ token_id: 0, recipient: vault.address, amount: 1000 * precision }],
      ]);
      await fa12Token.transfer(alice.pkh, vault.address, 100 * precision);
      await fa2Token.transfer(alice.pkh, vault.address, 100 * precision);

      // const operation_2 = await Tezos.contract.transfer({
      //   to: vault.address,
      //   amount: 10,
      // });
      // await confirmOperation(Tezos, operation_2.hash);
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

      await vault.call("set_owner", bob.pkh, 50);

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
  describe("Testing entrypoint: Claim_fee", async function () {
    it("Shouldn't claim fee if the asset is undefined", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("claim_fee", ["fa12", alice.pkh, eve.pkh]),
        err => {
          strictEqual(err.message, "Vault/asset-undefined");
          return true;
        },
      );
    });
    it("Shouldn't claim fee if fee balance is zero", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("claim_fee", ["fa12", fa12Token.address, eve.pkh]),
        err => {
          strictEqual(err.message, "Vault/zero-fee-balance");
          return true;
        },
      );
    });
    it("Should allow claim fee fa12 token (fish and management)", async function () {
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevBobBalance = await fa12Token.getBalance(bob.pkh);

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", ["fa12", fa12Token.address, alice.pkh]);
      const aliceBalance = await fa12Token.getBalance(alice.pkh);

      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", ["fa12", fa12Token.address, bob.pkh]);
      const bobBalance = await fa12Token.getBalance(bob.pkh);
      const fees = await vault.storage.fee_balances.get({
        fa12: fa12Token.address,
      });
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);
      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(aliceBalance, prevAliceBalance + 500);
      strictEqual(bobBalance, prevBobBalance + 500);
    });
    it("Should allow claim fee fa2 token (fish and management)", async function () {
      const prevAliceBalance = await fa2Token.getBalance(alice.pkh);
      const prevBobBalance = await fa2Token.getBalance(bob.pkh);

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", [
        "fa2",
        fa2Token.address,
        fa2Token.tokenId,
        alice.pkh,
      ]);
      const aliceBalance = await fa2Token.getBalance(alice.pkh);

      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", [
        "fa2",
        fa2Token.address,
        fa2Token.tokenId,
        bob.pkh,
      ]);
      const bobBalance = await fa2Token.getBalance(bob.pkh);
      const fees = await vault.storage.fee_balances.get({
        fa2: { address: fa2Token.address, id: fa2Token.tokenId },
      });
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);

      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(aliceBalance, prevAliceBalance + 500);
      strictEqual(bobBalance, prevBobBalance + 500);
    });
    it("Should allow claim fee tez (fish and management)", async function () {
      const prevEveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", ["tez", null, eve.pkh]);

      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", ["tez", null, eve.pkh]);
      const eveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const fees = await vault.storage.fee_balances.get({
        tez: null,
      });
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);

      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(eveBalance, prevEveBalance + 1000);
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

      const fishFee = await vault.storage.baker_rewards.get(vault.storage.fish);
      const managementFee = await vault.storage.baker_rewards.get(
        vault.storage.management,
      );
      strictEqual(fishFee.toNumber(), 5 * 10 ** 6);
      strictEqual(managementFee.toNumber(), 5 * 10 ** 6);
    });
  });
  describe("Testing entrypoint: Claim_baker_rewards", async function () {
    it("Shouldn't claim baker rewards if baker rewards is zero", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(vault.call("claim_baker_rewards", eve.pkh), err => {
        strictEqual(err.message, "Vault/zero-fee-balance");
        return true;
      });
    });
    it("Should allow claim baker rewards (fish and management)", async function () {
      const prevEveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const prevFishFee = await vault.storage.baker_rewards.get(
        vault.storage.fish,
      );
      const prevManagementFee = await vault.storage.baker_rewards.get(
        vault.storage.management,
      );

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_baker_rewards", eve.pkh);

      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_baker_rewards", eve.pkh);
      const eveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      const fishFee = await vault.storage.baker_rewards.get(vault.storage.fish);
      const managementFee = await vault.storage.baker_rewards.get(
        vault.storage.management,
      );
      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(
        eveBalance,
        prevEveBalance +
          (prevFishFee.toNumber() + prevManagementFee.toNumber()) / precision,
      );
    });
  });
  describe("Testing entrypoint: Add_strategy", async function () {
    it("Shouldn't add stategy if the user is not an strategist", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("add_strategy", [
          "fa12",
          fa12Token.address,
          alice.pkh,
          0,
          0,
        ]),
        err => {
          strictEqual(err.message, "Vault/not-strategist");
          return true;
        },
      );
    });
    it("Should allow add new strategy", async function () {
      Tezos.setSignerProvider(signerAlice);
      const targetReversesF = 0.5 * 10 ** 6;
      const deltaF = 0.2 * 10 ** 6;
      await vault.call("add_strategy", [
        "fa12",
        fa12Token.address,
        alice.pkh,
        targetReversesF,
        deltaF,
      ]);

      const newStrategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });

      deepStrictEqual(newStrategy.asset, { fa12: fa12Token.address });
      strictEqual(newStrategy.strategy_address, alice.pkh);
      strictEqual(
        newStrategy.target_reserves_rate_f.toNumber(),
        targetReversesF,
      );
      strictEqual(newStrategy.delta_f.toNumber(), deltaF);
      strictEqual(newStrategy.total_deposit.toNumber(), 0);
    });
    it("Shouldn't add stategy if the strategy already exists", async function () {
      await rejects(
        vault.call("add_strategy", [
          "fa12",
          fa12Token.address,
          alice.pkh,
          0,
          0,
        ]),
        err => {
          strictEqual(err.message, "Vault/strategy-already-exists");
          return true;
        },
      );
    });
  });
});
