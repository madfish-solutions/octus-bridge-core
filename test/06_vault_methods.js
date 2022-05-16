const { Tezos, signerAlice } = require("./utils/cli");
const { rejects, strictEqual, notStrictEqual, deepEqual } = require("assert");
const BigNumber = require("bignumber.js");
const Vault = require("./helpers/vaultInterface");
const vaultStorage = require("./storage/vault");
const Token = require("./helpers/tokenInterface");
const WrappedToken = require("./helpers/wrappedTokenInterface");
const { alice, bob } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");

const fa12TokenStorage = require("../test/storage/FA12");
const fa2TokenStorage = require("../test/storage/FA2");
const wrappedTokenStorage = require("../test/storage/wrappedToken");
const precision = 10 ** 6;
describe("Vault methods tests", async function () {
  let vault;
  let fa12Token;
  let fa2Token;
  let wrappedToken;
  let fa12Token_2;
  let fa12Token_3;
  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      fa12Token = await new Token().init(fa12TokenStorage);
      fa12Token_2 = await new Token().init(fa12TokenStorage);
      fa12Token_3 = await new Token().init(fa12TokenStorage);
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
      await wrappedToken.call("mint", [
        [{ token_id: 0, recipient: alice.pkh, amount: 100 * precision }],
      ]);
      vaultStorage.assets = MichelsonMap.fromLiteral({
        0: {
          asset_type: { fa12: fa12Token.address },
          deposit_fee_f: 100000,
          withdraw_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: false,
        },
        1: {
          asset_type: { fa2: { address: fa2Token.address, id: 0 } },
          deposit_fee_f: 100000,
          withdraw_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: false,
        },
        2: {
          asset_type: { tez: null },
          deposit_fee_f: 100000,
          withdraw_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: false,
        },
        3: {
          asset_type: { wrapped: { address: wrappedToken.address, id: 0 } },
          deposit_fee_f: 100000,
          withdraw_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: false,
        },
        4: {
          asset_type: { fa12: alice.pkh },
          deposit_fee_f: 100000,
          withdraw_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: true,
          banned: false,
        },
        5: {
          asset_type: { fa12: alice.pkh },
          deposit_fee_f: 100000,
          withdraw_fee_f: 100000,
          deposit_limit: 0,
          tvl: 0,
          virtual_balance: 0,
          paused: false,
          banned: true,
        },
        6: {
          asset_type: { fa12: fa12Token_2.address },
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
      vaultStorage.asset_ids.set(
        { fa2: { address: fa2Token.address, id: 0 } },
        1,
      );
      vaultStorage.asset_ids.set({ tez: null }, 2);
      vaultStorage.asset_ids.set(
        { wrapped: { address: wrappedToken.address, id: 0 } },
        3,
      );
      vaultStorage.asset_ids.set({ fa12: alice.pkh }, 4);
      vaultStorage.asset_ids.set({ fa12: bob.pkh }, 5);
      vaultStorage.asset_ids.set({ fa12: fa12Token_2.address }, 6);
      vaultStorage.asset_count = 7;
      vaultStorage.paused = true;
      vault = await new Vault().init(vaultStorage, "vault");
      await wrappedToken.call("set_vault", vault.address);
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing entrypoint: Deposit", async function () {
    it("Shouldn't deposit if vault is paused", async function () {
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", alice.pkh]),
        err => {
          strictEqual(err.message, "Vault/vault-is-paused");
          return true;
        },
      );
      await vault.call("toggle_pause_vault");
    });
    it("Shouldn't deposit if asset is paused", async function () {
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", alice.pkh]),
        err => {
          strictEqual(err.message, "Vault/asset-is-paused");
          return true;
        },
      );
    });
    it("Shouldn't deposit if asset is banned", async function () {
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", bob.pkh]),
        err => {
          strictEqual(err.message, "Vault/asset-is-banned");
          return true;
        },
      );
    });
    it("Shouldn't deposit if transfer amount 0", async function () {
      await rejects(
        vault.call("deposit", ["001100", 0, "fa12", fa12Token.address]),
        err => {
          strictEqual(err.message, "Vault/zero-transfer");
          return true;
        },
      );
    });
    it("Should deposit fa12 asset", async function () {
      const depositAmount = 100 * precision;
      await fa12Token.approveToken(vault.address, depositAmount);
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token.address,
      ]);
      const asset = await vault.storage.assets.get("0");
      const vaultBalance = await fa12Token.getBalance(vault.address);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("0");

      const newDeposit = await vault.storage.deposits.get("0");
      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), depositAmount - fee);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(feeBalances.fish_f.toNumber(), (fee * precision) / 2);
      strictEqual(feeBalances.management_f.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        fa12: fa12Token.address,
      });
    });
    it("Should deposit fa2 asset", async function () {
      const depositAmount = 100 * precision;
      await fa2Token.approveToken(
        vault.address,
        depositAmount,
        alice.pkh,
        fa2Token.tokenId,
      );
      const prevDepositCount = vault.storage.deposit_count.toNumber();

      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa2",
        fa2Token.address,
        fa2Token.tokenId,
      ]);
      const asset = await vault.storage.assets.get("1");
      const vaultBalance = await fa2Token.getBalance(vault.address);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("1");

      const newDeposit = await vault.storage.deposits.get("1");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), depositAmount - fee);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(feeBalances.fish_f.toNumber(), (fee * precision) / 2);
      strictEqual(feeBalances.management_f.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        fa2: {
          address: fa2Token.address,
          id: BigNumber(fa2Token.tokenId),
        },
      });
    });
    it("Should deposit tez asset", async function () {
      const depositAmount = 100 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await vault.call(
        "deposit",
        ["001100", depositAmount, "tez"],
        depositAmount / 1e6,
      );
      const asset = await vault.storage.assets.get("2");
      const vaultBalance = await Tezos.tz
        .getBalance(vault.address)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("2");

      const newDeposit = await vault.storage.deposits.get("2");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), depositAmount - fee);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(feeBalances.fish_f.toNumber(), (fee * precision) / 2);
      strictEqual(feeBalances.management_f.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      notStrictEqual(newDeposit.asset["tez"], undefined);
    });
    it("Should deposit wrapped asset", async function () {
      const depositAmount = 100 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await wrappedToken.approveToken(
        vault.address,
        depositAmount,
        alice.pkh,
        wrappedToken.tokenId,
      );

      await vault.call("deposit", [
        "001100",
        depositAmount,
        "wrapped",
        wrappedToken.address,
        wrappedToken.tokenId,
      ]);
      const asset = await vault.storage.assets.get("3");
      const aliceBalance = await wrappedToken.getWBalance(alice.pkh);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("3");

      const newDeposit = await vault.storage.deposits.get("3");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), depositAmount - fee);
      strictEqual(aliceBalance, 0);
      strictEqual(feeBalances.fish_f.toNumber(), (fee * precision) / 2);
      strictEqual(feeBalances.management_f.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        wrapped: {
          address: wrappedToken.address,
          id: BigNumber(wrappedToken.tokenId),
        },
      });
    });
    it("Should deposit without fee", async function () {
      const depositAmount = 100 * precision;
      await fa12Token_2.approveToken(vault.address, depositAmount);
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token_2.address,
      ]);
      const asset = await vault.storage.assets.get("6");
      const vaultBalance = await fa12Token.getBalance(vault.address);

      const feeBalances = await vault.storage.fee_balances.get("6");

      const newDeposit = await vault.storage.deposits.get("4");
      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(asset.tvl.toNumber(), depositAmount);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(feeBalances, undefined);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount);
      deepEqual(newDeposit.asset, {
        fa12: fa12Token_2.address,
      });
    });
    it("Should deposit unknown asset", async function () {
      const depositAmount = 100 * precision;
      const prevDepositCount = vault.storage.deposit_count.toNumber();
      await fa12Token_3.approveToken(vault.address, depositAmount);
      const prevAsset = await vault.storage.assets.get("7");
      await vault.call("deposit", [
        "001100",
        depositAmount,
        "fa12",
        fa12Token_3.address,
      ]);
      const asset = await vault.storage.assets.get("7");
      const vaultBalance = await fa12Token_3.getBalance(vault.address);
      const fee = Math.floor(
        (depositAmount * asset.deposit_fee_f.toNumber()) / precision,
      );
      const feeBalances = await vault.storage.fee_balances.get("7");

      const newDeposit = await vault.storage.deposits.get("5");

      strictEqual(vault.storage.deposit_count.toNumber(), prevDepositCount + 1);
      strictEqual(prevAsset, undefined);
      strictEqual(asset.tvl.toNumber(), depositAmount - fee);
      strictEqual(vaultBalance, depositAmount);
      strictEqual(feeBalances.fish_f.toNumber(), (fee * precision) / 2);
      strictEqual(feeBalances.management_f.toNumber(), (fee * precision) / 2);
      strictEqual(newDeposit.recipient, "001100");
      strictEqual(newDeposit.amount.toNumber(), depositAmount - fee);
      deepEqual(newDeposit.asset, {
        fa12: fa12Token_3.address,
      });
    });
  });
});
