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
const YupanaStrategy = require("./helpers/commonInterface");
const YupanaMock = require("./helpers/commonInterface");
const PriceFeed = require("./helpers/commonInterface");

const yupanaStrategyStorage = require("./storage/yupanaStrategy");

const yupanaMockStorage = require("./storage/yupanaMock");
const fa12TokenStorage = require("../test/storage/FA12");
const fa2TokenStorage = require("../test/storage/FA2");
const wrappedTokenStorage = require("../test/storage/wrappedToken");

const vaultStorage = require("./storage/vault");
const { alice, bob } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");
const yupanaStrategy = require("./storage/yupanaStrategy");

const precision = 10 ** 6;

describe("Vault Admin tests", async function () {
  let vault;
  let fa12Token;
  let fa2Token;
  let wrappedToken;
  let yupana;
  let yupanaStrategy;
  let priceFeed;
  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    priceFeed = await new PriceFeed().init(0, "price_feed");
    fa12Token = await new Token().init(fa12TokenStorage);
    fa2Token = await new Token("fa2").init(fa2TokenStorage);
    try {
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
          asset_type: { fa12: fa12Token.address },
          deposit_fee_f: 0,
          withdraw_fee_f: 0,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: false,
        },
      });
      vaultStorage.asset_ids.set({ fa12: fa12Token.address }, 0);
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

      await wrappedToken.call("mint", [
        [{ token_id: 0, recipient: vault.address, amount: 1000 * precision }],
      ]);
      await fa12Token.transfer(alice.pkh, vault.address, 100 * precision);
      await fa2Token.transfer(alice.pkh, vault.address, 100 * precision);

      yupana = await new YupanaMock().init(yupanaMockStorage, "yupana_mock");
      yupanaStrategyStorage.vault = vault.address;
      yupanaStrategyStorage.protocol = yupana.address;
      yupanaStrategyStorage.deposit_asset = { fa12: fa12Token.address };
      yupanaStrategyStorage.reward_asset = { fa12: fa12Token.address };
      yupanaStrategyStorage.price_feed = priceFeed.address;
      yupanaStrategy = await new YupanaStrategy().init(
        yupanaStrategyStorage,
        "yupana_strategy",
      );

      await yupana.call("addMarket", [
        alice.pkh,
        "fA12",
        fa12Token.address,
        0.75 * precision,
        0.4 * precision,
        0.000009 * precision,
        MichelsonMap.fromLiteral({
          symbol: Buffer.from("btc", "ascii").toString("hex"),
        }),
        0.55 * precision,
        0.5 * precision,
      ]);
      const operation1 = await Tezos.contract.transfer({
        to: eve.pkh,
        amount: 10,
      });
      await confirmOperation(Tezos, operation1.hash);

      //await fa12Token.transfer(alice.pkh, strategy.address, 100 * precision);
      await fa12Token.transfer(alice.pkh, yupana.address, 100 * precision);
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

      await vault.call("set_deposit_limit", [0, 99999 * precision]);
      const asset = await vault.storage.assets.get("0");
      strictEqual(asset.deposit_limit.toNumber(), 99999 * precision);
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
      await vault.call("set_asset_deposit_fee", [0, 0]);
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
      await vault.call("set_asset_withdraw_fee", [0, 0]);
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
  describe("Testing entrypoint: Toggle_emergency_shutdown", async function () {
    it("Shouldn't toggle emergency shutdown if the user is not an guardian or owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("toggle_emergency_shutdown"), err => {
        strictEqual(err.message, "Vault/not-owner-or-guardian");
        return true;
      });
    });
    it("Should allow enable emergency shutdown", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_emergency_shutdown");

      strictEqual(vault.storage.emergency_shutdown, true);
    });
    it("Shouldn't disable emergency shutdow if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(vault.call("toggle_emergency_shutdown"), err => {
        strictEqual(err.message, "Vault/not-owner");
        return true;
      });
    });
    it("Should allow disable emergency shutdow ", async function () {
      Tezos.setSignerProvider(signerBob);

      await vault.call("toggle_emergency_shutdown");

      strictEqual(vault.storage.emergency_shutdown, false);
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
    it("Should allow add new strategy fa12", async function () {
      Tezos.setSignerProvider(signerAlice);
      const targetReversesF = 0.5 * 10 ** 6;
      const deltaF = 0.15 * 10 ** 6;
      await vault.call("add_strategy", [
        "fa12",
        fa12Token.address,
        yupanaStrategy.address,
        targetReversesF,
        deltaF,
      ]);

      const newStrategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });

      deepStrictEqual(newStrategy.asset, { fa12: fa12Token.address });
      strictEqual(newStrategy.strategy_address, yupanaStrategy.address);
      strictEqual(
        newStrategy.target_reserves_rate_f.toNumber(),
        targetReversesF,
      );
      strictEqual(newStrategy.delta_f.toNumber(), deltaF);
      strictEqual(newStrategy.tvl.toNumber(), 0);
    });
    it("Should allow add new strategy fa2", async function () {
      Tezos.setSignerProvider(signerAlice);
      const targetReversesF = 0.5 * 10 ** 6;
      const deltaF = 0.15 * 10 ** 6;
      await vault.call("add_strategy", [
        "fa2",
        fa2Token.address,
        fa2Token.tokenId,
        yupanaStrategy.address,
        targetReversesF,
        deltaF,
      ]);

      const newStrategy = await vault.storage.strategies.get({
        fa2: { address: fa2Token.address, id: fa2Token.tokenId },
      });

      notStrictEqual(newStrategy.asset["fa2"], undefined);
      strictEqual(newStrategy.strategy_address, yupanaStrategy.address);
      strictEqual(
        newStrategy.target_reserves_rate_f.toNumber(),
        targetReversesF,
      );
      strictEqual(newStrategy.delta_f.toNumber(), deltaF);
      strictEqual(newStrategy.tvl.toNumber(), 0);
    });
    it("Shouldn't add strategy if the strategy already exists", async function () {
      await rejects(
        vault.call("add_strategy", [
          "fa12",
          fa12Token.address,
          yupanaStrategy.address,
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
  describe("Testing entrypoint: Update_strategy", async function () {
    it("Shouldn't update stategy if the user is not an strategist", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("update_strategy", ["fa12", fa12Token.address, 0, 0]),
        err => {
          strictEqual(err.message, "Vault/not-strategist");
          return true;
        },
      );
    });
    it("Should allow update strategy", async function () {
      Tezos.setSignerProvider(signerAlice);
      const targetReversesF = 0.2 * 10 ** 6;
      const deltaF = 0.35 * 10 ** 6;
      await vault.call("update_strategy", [
        "fa2",
        fa2Token.address,
        fa2Token.tokenId,
        targetReversesF,
        deltaF,
      ]);

      const strategy = await vault.storage.strategies.get({
        fa2: { address: fa2Token.address, id: fa2Token.tokenId },
      });

      strictEqual(strategy.target_reserves_rate_f.toNumber(), targetReversesF);
      strictEqual(strategy.delta_f.toNumber(), deltaF);
    });
    it("Shouldn't add strategy if the strategy already exists", async function () {
      await rejects(
        vault.call("add_strategy", [
          "fa12",
          fa12Token.address,
          yupanaStrategy.address,
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
  describe("Testing entrypoint: Maintain", async function () {
    it("Shouldn't maintain if the user is not an strategist", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("maintain", ["fa12", fa12Token.address]),
        err => {
          strictEqual(err.message, "Vault/not-strategist");
          return true;
        },
      );
    });
    it("Shouldn't maintain if strategy undefined", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("maintain", ["fa12", vault.address]), err => {
        strictEqual(err.message, "Vault/strategy-undefined");
        return true;
      });
    });
    it("Shouldn't maintain if asset tvl 0", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        vault.call("maintain", ["fa12", fa12Token.address]),
        err => {
          strictEqual(err.message, "Vault/low-asset-liquidity");
          return true;
        },
      );
    });
    it("Should allow maintain: invest scenario", async function () {
      const depositAmount = 100 * precision;
      await fa12Token.approveToken(vault.address, depositAmount);

      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token.address,
      ]);

      const prevStrategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      const prevAsset = await vault.storage.assets.get("0");
      const investAmount = Math.floor(
        (prevAsset.tvl.toNumber() *
          prevStrategy.target_reserves_rate_f.toNumber()) /
          precision,
      );
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      await vault.call("maintain", ["fa12", fa12Token.address]);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const strategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });

      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() - investAmount,
      );
      strictEqual(vaultBalance, prevVaultBalance - investAmount);
      strictEqual(strategy.tvl.toNumber(), investAmount);
    });
    it("Shouldn't maintain if rebalancing is not needed", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(
        vault.call("maintain", ["fa12", fa12Token.address]),
        err => {
          strictEqual(err.message, "Vault/no-rebalancing-needed");
          return true;
        },
      );
    });
    it("Should allow maintain: divest scenario when change target reverses rate", async function () {
      const targetReversesF = 0.3 * 10 ** 6;
      const prevStrategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      await vault.call("update_strategy", [
        "fa12",
        fa12Token.address,
        targetReversesF,
        prevStrategy.delta_f.toNumber(),
      ]);
      const fa12Strategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      const prevAsset = await vault.storage.assets.get("0");
      const divestAmount =
        fa12Strategy.tvl.toNumber() -
        Math.floor((prevAsset.tvl.toNumber() * targetReversesF) / precision);
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      await vault.call("maintain", ["fa12", fa12Token.address]);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const strategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });

      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() + divestAmount,
      );
      strictEqual(vaultBalance, prevVaultBalance + divestAmount);
      strictEqual(
        strategy.tvl.toNumber(),
        prevStrategy.tvl.toNumber() - divestAmount,
      );
    });
    it("Should allow maintain: invest scenario when asset asset tvl increased", async function () {
      const depositAmount = 200 * precision;
      await fa12Token.approveToken(vault.address, depositAmount);

      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token.address,
      ]);

      const prevStrategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      const prevAsset = await vault.storage.assets.get("0");
      const investAmount = Math.floor(
        (prevAsset.tvl.toNumber() *
          prevStrategy.target_reserves_rate_f.toNumber()) /
          precision -
          prevStrategy.tvl.toNumber(),
      );
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      await vault.call("maintain", ["fa12", fa12Token.address]);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const strategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });

      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber() - investAmount,
      );
      strictEqual(vaultBalance, prevVaultBalance - investAmount);
      strictEqual(
        strategy.tvl.toNumber(),
        prevStrategy.tvl.toNumber() + investAmount,
      );
    });
  });
  describe("Testing entrypoint: Harvest", async function () {
    it("Shouldn't harvest if the user is not an strategist", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(vault.call("harvest", ["fa12", fa12Token.address]), err => {
        strictEqual(err.message, "Vault/not-strategist");
        return true;
      });
    });
    it("Shouldn't harvest if strategy undefined", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(vault.call("harvest", ["fa12", vault.address]), err => {
        strictEqual(err.message, "Vault/strategy-undefined");
        return true;
      });
    });

    it("Should allow harvest", async function () {
      Tezos.setSignerProvider(signerAlice);
      await yupana.call("borrow", [0, 10 * precision, "1659708663810"]);

      await fa12Token.approveToken(yupana.address, 500 * precision);
      await yupana.call("repay", [0, 10 * precision, 10 * precision]);

      const prevVaultBalance = await fa12Token.getBalance(vault.address);

      const prevFishReward = 0;
      const prevManagementReward = 0;
      await vault.call("harvest", ["fa12", fa12Token.address]);
      await yupanaStrategy.updateStorage();
      const strategyRewards = await vault.storage.strategy_rewards.get({
        fa12: fa12Token.address,
      });
      const fishReward = await strategyRewards.get(vault.storage.fish);
      const managementReward = await strategyRewards.get(
        vault.storage.management,
      );
      const vaultBalance = await fa12Token.getBalance(vault.address);

      strictEqual(
        vaultBalance,
        prevVaultBalance + yupanaStrategy.storage.last_profit.toNumber(),
      );
      strictEqual(
        fishReward.toNumber(),
        prevFishReward +
          (yupanaStrategy.storage.last_profit.toNumber() * precision) / 2,
      );
      strictEqual(
        managementReward.toNumber(),
        prevManagementReward +
          (yupanaStrategy.storage.last_profit.toNumber() * precision) / 2,
      );
    });
  });
  describe("Testing entrypoint: Revoke_strategy", async function () {
    it("Shouldn't revoke stategy if the user is not an strategist", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("revoke_strategy", ["fa12", fa12Token.address, false]),
        err => {
          strictEqual(err.message, "Vault/not-strategist");
          return true;
        },
      );
    });
    it("Should allow revoke strategy", async function () {
      Tezos.setSignerProvider(signerAlice);
      const prevVaultBalance = await fa12Token.getBalance(vault.address);
      const prevStrategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      await vault.call("revoke_strategy", ["fa12", fa12Token.address, false]);
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const strategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      const asset = await vault.storage.assets.get("0");
      strictEqual(strategy.tvl.toNumber(), 0);
      strictEqual(vaultBalance, prevVaultBalance + prevStrategy.tvl.toNumber());
      strictEqual(asset.tvl.toNumber(), asset.virtual_balance.toNumber());
    });
    it("Should allow revoke strategy with removing", async function () {
      const prevVaultBalance = await fa12Token.getBalance(vault.address);

      await vault.call("revoke_strategy", ["fa12", fa12Token.address, true]);
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const strategy = await vault.storage.strategies.get({
        fa12: fa12Token.address,
      });
      const asset = await vault.storage.assets.get("0");
      strictEqual(strategy, undefined);
      strictEqual(vaultBalance, prevVaultBalance);
      strictEqual(asset.tvl.toNumber(), asset.virtual_balance.toNumber());
    });
  });
  describe("Testing entrypoint: Claim_strategy_rewards", async function () {
    it("Shouldn't claim strategy rewards if the asset is undefined", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("claim_strategy_rewards", ["fa12", alice.pkh, eve.pkh]),
        err => {
          strictEqual(err.message, "Vault/asset-undefined");
          return true;
        },
      );
    });
    it("Shouldn't claim strategy rewards if fee balance is zero", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(
        vault.call("claim_strategy_rewards", [
          "fa12",
          fa12Token.address,
          eve.pkh,
        ]),
        err => {
          strictEqual(err.message, "Vault/zero-fee-balance");
          return true;
        },
      );
    });
    it("Should allow claim strategy rewards (fish and management)", async function () {
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevBobBalance = await fa12Token.getBalance(bob.pkh);

      const prevRewards = await vault.storage.strategy_rewards.get({
        fa12: fa12Token.address,
      });
      const prevFishRewards = await prevRewards.get(vault.storage.fish);
      const prevManagementRewards = await prevRewards.get(
        vault.storage.management,
      );
      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_strategy_rewards", [
        "fa12",
        fa12Token.address,
        alice.pkh,
      ]);

      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_strategy_rewards", [
        "fa12",
        fa12Token.address,
        bob.pkh,
      ]);
      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      const bobBalance = await fa12Token.getBalance(bob.pkh);
      const rewards = await vault.storage.strategy_rewards.get({
        fa12: fa12Token.address,
      });
      const fishRewards = await rewards.get(vault.storage.fish);
      const managementRewards = await rewards.get(vault.storage.management);

      strictEqual(fishRewards.toNumber(), 0);
      strictEqual(managementRewards.toNumber(), 0);
      strictEqual(
        aliceBalance,
        prevAliceBalance + Math.floor(prevFishRewards.toNumber() / precision),
      );
      strictEqual(
        bobBalance,
        prevBobBalance +
          Math.floor(prevManagementRewards.toNumber() / precision),
      );
    });
  });
});
