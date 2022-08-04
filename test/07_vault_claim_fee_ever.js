const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const Vault = require("./helpers/vaultInterface");
const Token = require("./helpers/tokenInterface");
const WrappedToken = require("./helpers/wrappedTokenInterface");

const fa12TokenStorage = require("./storage/FA12");
const fa2TokenStorage = require("./storage/FA2");
const wrappedTokenStorage = require("./storage/wrappedToken");
const vaultStorage = require("./storage/vault");

const { alice, bob } = require("../scripts/sandbox/accounts");
const { MichelsonMap } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");

const precision = 10 ** 6;

const aliceBytes = "050a0000001600006b82198cb179e8306c1bedd08f12dc863f328886";
const bobBytes = "050a000000160000a26828841890d3f3a2a1d4083839c7a882fe0501";
const eveBytes = "050a0000001600001797a2cd215e3c7280784e090d17051fdc4a9bf3";
describe("Vault Admin tests", async function () {
  let vault;
  let fa12Token;
  let fa2Token;
  let wrappedToken;
  before(async () => {
    Tezos.setSignerProvider(signerAlice);
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

      vaultStorage.storage.assets = MichelsonMap.fromLiteral({
        0: {
          asset_type: { fa12: fa12Token.address },
          deposit_fee_f: 0,
          withdrawal_fee_f: 0,
          deposit_limit: 0,
          tvl: 1000,
          virtual_balance: 1000,
        },
        1: {
          asset_type: { fa2: { address: fa2Token.address, id: 0 } },
          deposit_fee_f: 0,
          withdrawal_fee_f: 0,
          deposit_limit: 0,
          tvl: 1000,
          virtual_balance: 1000,
        },
        2: {
          asset_type: { tez: null },
          deposit_fee_f: 0,
          withdrawal_fee_f: 0,
          deposit_limit: 0,
          tvl: 1000,
          virtual_balance: 1000,
        },
        3: {
          asset_type: {
            wrapped: { address: wrappedToken.address, id: 0 },
          },
          deposit_fee_f: 0,
          withdrawal_fee_f: 0,
          deposit_limit: 0,
          tvl: 1000,
          virtual_balance: 1000,
        },
      });
      vaultStorage.storage.asset_ids.set({ fa12: fa12Token.address }, 0);
      vaultStorage.storage.asset_ids.set(
        { fa2: { address: fa2Token.address, id: fa2Token.tokenId } },
        1,
      );
      vaultStorage.storage.fish = alice.pkh;
      vaultStorage.storage.management = bob.pkh;

      const feeBalances = MichelsonMap.fromLiteral({
        [alice.pkh]: 500 * precision,
        [bob.pkh]: 500 * precision,
      });
      vaultStorage.storage.fee_balances = MichelsonMap.fromLiteral({
        0: feeBalances,
        1: feeBalances,
        2: feeBalances,
        3: feeBalances,
      });

      vault = await new Vault().init(vaultStorage, "vault");
      await vault.setLambdas();

      await wrappedToken.call("mint", [
        [{ token_id: 0, recipient: vault.address, amount: 1000 * precision }],
      ]);
      await wrappedToken.call("set_vault", vault.address);
      await fa12Token.transfer(alice.pkh, vault.address, 100 * precision);
      await fa2Token.transfer(alice.pkh, vault.address, 110 * precision);

      const operation1 = await Tezos.contract.transfer({
        to: eve.pkh,
        amount: 10,
      });
      await confirmOperation(Tezos, operation1.hash);
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing entrypoint: Claim_fee with transfer to Everscale", async function () {
    it("Shouldn't claim fee if the asset is undefined", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(vault.call("claim_fee", [9, "0000", false]), err => {
        strictEqual(err.message, "Vault/asset-undefined");
        return true;
      });
    });
    it("Shouldn't claim fee if fee balance is zero", async function () {
      Tezos.setSignerProvider(signerEve);
      await rejects(vault.call("claim_fee", [0, "0000", false]), err => {
        strictEqual(err.message, "Vault/zero-fee-balance");
        return true;
      });
    });
    it("Should allow claim fee fa12 token (fish and management)", async function () {
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevBobBalance = await fa12Token.getBalance(bob.pkh);

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", [0, aliceBytes, true]);
      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      const newDepo_1 = await vault.storage.deposits.get("0");
      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", [0, bobBytes, true]);
      const newDepo_2 = await vault.storage.deposits.get("1");
      const bobBalance = await fa12Token.getBalance(bob.pkh);
      const fees = await vault.storage.fee_balances.get("0");
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);
      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(bobBalance, prevBobBalance);
      notStrictEqual(newDepo_1, undefined);
      notStrictEqual(newDepo_2, undefined);
    });
    it("Should allow claim fee fa2 token (fish and management)", async function () {
      const prevAliceBalance = await fa2Token.getBalance(alice.pkh);
      const prevBobBalance = await fa2Token.getBalance(bob.pkh);
      const prevAsset = await vault.storage.assets.get("3");
      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", [1, aliceBytes, true]);
      const aliceBalance = await fa2Token.getBalance(alice.pkh);
      const newDepo_1 = await vault.storage.deposits.get("2");
      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", [1, bobBytes, true]);
      const newDepo_2 = await vault.storage.deposits.get("3");
      const asset = await vault.storage.assets.get("3");
      const bobBalance = await fa2Token.getBalance(bob.pkh);
      const fees = await vault.storage.fee_balances.get("1");
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);
      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber());
      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber(),
      );
      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(bobBalance, prevBobBalance);
      notStrictEqual(newDepo_1, undefined);
      notStrictEqual(newDepo_2, undefined);
    });
    it("Should allow claim fee tez (fish and management)", async function () {
      const prevEveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", [2, eveBytes, true]);
      const newDepo_1 = await vault.storage.deposits.get("4");
      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", [2, eveBytes, true]);
      const newDepo_2 = await vault.storage.deposits.get("5");
      const eveBalance = await Tezos.tz
        .getBalance(eve.pkh)
        .then(balance => Math.floor(balance.toNumber()))
        .catch(error => console.log(JSON.stringify(error)));
      const fees = await vault.storage.fee_balances.get("2");
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);

      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(eveBalance, prevEveBalance);
      notStrictEqual(newDepo_1, undefined);
      notStrictEqual(newDepo_2, undefined);
    });
    it("Should allow claim fee wrapped token (fish and management)", async function () {
      const prevAliceBalance = await wrappedToken.getWBalance(alice.pkh);
      const prevBobBalance = await wrappedToken.getWBalance(bob.pkh);
      const prevAsset = await vault.storage.assets.get("3");

      Tezos.setSignerProvider(signerAlice);
      await vault.call("claim_fee", [3, aliceBytes, true]);
      const aliceBalance = await wrappedToken.getWBalance(alice.pkh);
      const newDepo_1 = await vault.storage.deposits.get("6");
      Tezos.setSignerProvider(signerBob);
      await vault.call("claim_fee", [3, bobBytes, true]);
      const newDepo_2 = await vault.storage.deposits.get("7");
      const asset = await vault.storage.assets.get("3");
      const bobBalance = await wrappedToken.getWBalance(bob.pkh);
      const fees = await vault.storage.fee_balances.get("3");
      const fishFee = await fees.get(vault.storage.fish);
      const managementFee = await fees.get(vault.storage.management);

      strictEqual(asset.tvl.toNumber(), prevAsset.tvl.toNumber());
      strictEqual(
        asset.virtual_balance.toNumber(),
        prevAsset.virtual_balance.toNumber(),
      );
      strictEqual(fishFee.toNumber(), 0);
      strictEqual(managementFee.toNumber(), 0);
      strictEqual(aliceBalance, prevAliceBalance);
      strictEqual(bobBalance, prevBobBalance);
      notStrictEqual(newDepo_1, undefined);
      notStrictEqual(newDepo_2, undefined);
    });
  });
});
