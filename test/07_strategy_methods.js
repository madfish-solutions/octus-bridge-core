const { Tezos, signerAlice, signerBob, signerEve } = require("./utils/cli");
const { eve, dev } = require("../scripts/sandbox/accounts");
const { rejects, strictEqual, notStrictEqual } = require("assert");
const YupanaStrategy = require("./helpers/commonInterface");
const YupanaMock = require("./helpers/commonInterface");
const Token = require("./helpers/tokenInterface");
const PriceFeed = require("./helpers/commonInterface");

const fa12TokenStorage = require("../test/storage/FA12");

const yupanaStrategyStorage = require("./storage/yupanaStrategy");

const yupanaMockStorage = require("./storage/yupanaMock");
const { alice, bob } = require("../scripts/sandbox/accounts");

const { MichelsonMap } = require("@taquito/taquito");
const { confirmOperation } = require("../scripts/confirmation");
const { OpKind } = require("@taquito/taquito");
const { vault } = require("./storage/yupanaStrategy");
const precision = 10 ** 6;

function sleep(sec) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000));
}
describe("Yupana-strategy tests", async function () {
  let strategy;
  let fa12Token;
  let yupana;
  let priceFeed;
  before(async () => {
    Tezos.setSignerProvider(signerAlice);
    try {
      priceFeed = await new PriceFeed().init(0, "price_feed");
      fa12Token = await new Token("fa12").init(fa12TokenStorage);
      yupana = await new YupanaMock().init(yupanaMockStorage, "yupana_mock");
      yupanaStrategyStorage.vault = alice.pkh;
      yupanaStrategyStorage.protocol = yupana.address;
      yupanaStrategyStorage.deposit_asset = { fa12: fa12Token.address };
      yupanaStrategyStorage.reward_asset = { fa12: fa12Token.address };
      yupanaStrategyStorage.price_feed = priceFeed.address;
      yupanaStrategyStorage.protocol_asset_id = 0;
      strategy = await new YupanaStrategy().init(
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
      const operation = await Tezos.contract.transfer({
        to: eve.pkh,
        amount: 10,
      });
      await confirmOperation(Tezos, operation.hash);

      //await fa12Token.transfer(alice.pkh, strategy.address, 100 * precision);
      await fa12Token.transfer(alice.pkh, yupana.address, 100 * precision);
    } catch (e) {
      console.log(e);
    }
  });

  describe("Testing entrypoint: Invest", async function () {
    it("Shouldn't invest if the user is not an vault", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(strategy.call("invest", [500 * precision]), err => {
        strictEqual(err.message, "Yup-strategy/not-vault");
        return true;
      });
    });
    it("Should allow invest tokens", async function () {
      Tezos.setSignerProvider(signerAlice);
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      await fa12Token.transfer(alice.pkh, strategy.address, 500 * precision);
      await strategy.call("invest", [500 * precision]);

      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      strictEqual(strategy.storage.tvl.toNumber(), 500 * precision);
      strictEqual(aliceBalance, prevAliceBalance - 500 * precision);
    });
  });

  // describe("Testing entrypoint: Harvest", async function () {
  //   it("Shouldn't invest if the user is not an vault", async function () {
  //     Tezos.setSignerProvider(signerBob);
  //     await rejects(strategy.call("harvest"), err => {
  //       strictEqual(err.message, "Yup-strategy/not-vault");
  //       return true;
  //     });
  //   });
  //   it("Shouldn't harvest if profit is zero", async function () {
  //     Tezos.setSignerProvider(signerAlice);
  //     await rejects(strategy.call("harvest"), err => {
  //       strictEqual(err.message, "Yup-strategy/zero-profit");
  //       return true;
  //     });
  //   });
  //   it("Should allow harvest tokens", async function () {
  //     Tezos.setSignerProvider(signerBob);
  //     await yupana.call("borrow", [0, 500 * precision, "1659708663810"]);

  //     await fa12Token.approveToken(yupana.address, 500 * precision);
  //     await yupana.call("repay", [0, 500 * precision]);

  //     const prevVaultBalance = await fa12Token.getBalance(alice.pkh);

  //     Tezos.setSignerProvider(signerAlice);

  //     await strategy.call("harvest");
  //     await strategy.updateStorage();

  //     const vaultBalance = await fa12Token.getBalance(alice.pkh);

  //     strictEqual(
  //       vaultBalance,
  //       prevVaultBalance + strategy.storage.last_profit.toNumber(),
  //     );
  //   });
  // });
  describe("Testing entrypoint: Divest", async function () {
    it("Shouldn't invest if the user is not an vault", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(strategy.call("divest", [500 * precision]), err => {
        strictEqual(err.message, "Yup-strategy/not-vault");
        return true;
      });
    });
    it("Shouldn't invest if the amount > tvl", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(strategy.call("divest", [1000 * precision]), err => {
        strictEqual(err.message, "Yup-strategy/low-balance");
        return true;
      });
    });
    it("Should allow divest tokens", async function () {
      const prevAliceBalance = await fa12Token.getBalance(alice.pkh);
      const prevYupanaBalance = await fa12Token.getBalance(yupana.address);
      const prevTvl = strategy.storage.tvl.toNumber();
      Tezos.setSignerProvider(signerAlice);
      await strategy.call("divest", [500 * precision, 500 * precision]);
      const yupanaBalance = await fa12Token.getBalance(yupana.address);
      const aliceBalance = await fa12Token.getBalance(alice.pkh);
      strictEqual(strategy.storage.tvl.toNumber(), prevTvl - 500 * precision);
      strictEqual(aliceBalance, prevAliceBalance + 500 * precision);
      strictEqual(yupanaBalance, prevYupanaBalance - 500 * precision);
    });
  });
  describe("Testing entrypoint: Set_owner", async function () {
    it("Shouldn't seting owner if the user is not an owner", async function () {
      Tezos.setSignerProvider(signerBob);
      await rejects(strategy.call("set_owner", bob.pkh), err => {
        strictEqual(err.message, "Yup-strategy/not-owner");
        return true;
      });
    });
    it("Should allow start transfer ownership", async function () {
      Tezos.setSignerProvider(signerAlice);

      await strategy.call("set_owner", bob.pkh);

      strictEqual(strategy.storage.pending_owner, bob.pkh);
    });
  });
  describe("Testing entrypoint: Confirm_owner", async function () {
    it("Shouldn't confirm owner if the user is not an pending owner", async function () {
      Tezos.setSignerProvider(signerAlice);
      await rejects(strategy.call("confirm_owner", bob.pkh), err => {
        strictEqual(err.message, "Yup-strategy/not-pending-owner");
        return true;
      });
    });
    it("Should allow confirm transfer ownership", async function () {
      Tezos.setSignerProvider(signerBob);

      await strategy.call("confirm_owner", bob.pkh);

      strictEqual(strategy.storage.owner, bob.pkh);
    });
  });
});
