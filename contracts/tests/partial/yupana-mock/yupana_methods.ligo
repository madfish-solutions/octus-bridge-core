function mint(
  const params : asset_params_t;
  var s        : storage_t)
               : return_t is
  block {
    require(params.amount > 0n, Errors.zeroAmount);
    require(params.tokenId < s.lastTokenId, Errors.undefined);

    var mintTokensF : nat := params.amount * Constants.precision;
    var token : tokenType := unwrap(s.tokens[params.tokenId], Errors.undefined);
    require(token.enterMintPause = False, Errors.enterMintPaused);

    if token.totalSupplyF =/= 0n
    then {
      //require(token.interestUpdateTime >= Tezos.now, Errors.needUpdate);
      const liquidityF : nat = get_nat_or_fail(token.totalLiquidF + token.totalBorrowsF - token.totalReservesF, Errors.lowLiquidityReserve);
      mintTokensF := mintTokensF * token.totalSupplyF / liquidityF;
    } else skip;

    require(mintTokensF / Constants.precision >= params.minReceived, Errors.highReceived);

    var userBalance : nat := unwrap_or(s.ledger[(Tezos.sender, params.tokenId)], 0n);
    userBalance := userBalance + mintTokensF;
    s.ledger[(Tezos.sender, params.tokenId)] := userBalance;
    token.totalSupplyF := token.totalSupplyF + mintTokensF;
    token.totalLiquidF := token.totalLiquidF + params.amount * Constants.precision;
    s.tokens[params.tokenId] := token;
    const operations = transfer_token(Tezos.sender, Tezos.self_address, params.amount, token.mainToken);
  } with (operations, s)

function applyInterestToBorrows(
  const borrowedTokens  : set(nat);
  const user            : address;
  const accountsMap     : accountsMapType;
  const tokensMap       : big_map(nat, tokenType))
                        : accountsMapType is
  block {
    function oneToken(
      var userAccMap    : accountsMapType;
      const tokenId     : nat)
                        : accountsMapType is
      block {
        var userAccount : account := getAccount(user, tokenId, accountsMap);
        const token : tokenType = unwrap(tokensMap[tokenId], Errors.undefined);

        //require(token.interestUpdateTime >= Tezos.now, Errors.needUpdate);

        if userAccount.lastBorrowIndex =/= 0n
          then userAccount.borrow := userAccount.borrow * token.borrowIndex / userAccount.lastBorrowIndex
        else
          skip;
        userAccount.lastBorrowIndex := token.borrowIndex;
      } with Map.update((user, tokenId), Some(userAccount), userAccMap);
  } with Set.fold(oneToken, borrowedTokens, accountsMap)

function calcMaxCollateralInCU(
  const userMarkets     : set(nat);
  const user            : address;
  const ledger          : big_map((address * nat), nat);
  const tokens          : big_map(nat, tokenType))
                        : nat is
  block {
    function oneToken(
      var acc           : nat;
      const tokenId     : nat)
                        : nat is
      block {
        const userBalance : nat = unwrap_or(ledger[(user, tokenId)], 0n);
        const token : tokenType = unwrap(tokens[tokenId], Errors.undefined);
        if token.totalSupplyF > 0n then {
          const liquidityF : nat = get_nat_or_fail(token.totalLiquidF + token.totalBorrowsF - token.totalReservesF, Errors.lowLiquidityReserve);

          //require(token.priceUpdateTime >= Tezos.now, Errors.needUpdate);
          //require(token.interestUpdateTime >= Tezos.now, Errors.needUpdate);

          (* sum += collateralFactorF * exchangeRate * oraclePrice * balance *)
            acc := acc + userBalance * token.lastPrice
              * token.collateralFactorF * liquidityF / token.totalSupplyF / Constants.precision;
        }
        else skip;

      } with acc;
  } with Set.fold(oneToken, userMarkets, 0n)

function calcOutstandingBorrowInCU(
  const userBorrow      : set(nat);
  const user            : address;
  const accounts        : big_map((address * nat), account);
  const ledger          : big_map((address * nat), nat);
  const tokens          : big_map(nat, tokenType))
                        : nat is
  block {
    function oneToken(
      var acc           : nat;
      var tokenId       : nat)
                        : nat is
      block {
        const userAccount : account = getAccount(user, tokenId, accounts);
        const userBalance : nat = unwrap_or(ledger[(user, tokenId)], 0n);
        var token : tokenType := unwrap(tokens[tokenId], Errors.undefined);

        //require(token.priceUpdateTime >= Tezos.now, Errors.needUpdate);

        (* sum += oraclePrice * borrow *)
        if userBalance > 0n or userAccount.borrow > 0n
        then acc := acc + userAccount.borrow * token.lastPrice
        else skip;
      } with acc;
  } with Set.fold(oneToken, userBorrow, 0n)

function redeem(
  const params          : asset_params_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(params.tokenId < s.lastTokenId, Errors.undefined);

    var token : tokenType :=  unwrap(s.tokens[params.tokenId], Errors.undefined);
    var userBalance : nat := unwrap_or(s.ledger[(Tezos.sender, params.tokenId)], 0n);
    const liquidityF : nat =  get_nat_or_fail(token.totalLiquidF + token.totalBorrowsF - token.totalReservesF, Errors.lowLiquidityReserve);
    const redeemAmount : nat = if params.amount = 0n
    then userBalance * liquidityF / token.totalSupplyF / Constants.precision
    else params.amount;
    require(redeemAmount >= params.minReceived, Errors.highReceived);
    var burnTokensF : nat := if params.amount = 0n
    then userBalance
    else ceil_div(redeemAmount * Constants.precision * token.totalSupplyF, liquidityF);

    userBalance := get_nat_or_fail(userBalance - burnTokensF, Errors.lowBalance);
    s.ledger[(Tezos.sender, params.tokenId)] := userBalance;

    token.totalSupplyF := get_nat_or_fail(token.totalSupplyF - burnTokensF, Errors.lowSupply);
    token.totalLiquidF := get_nat_or_fail(token.totalLiquidF - redeemAmount * Constants.precision, Errors.lowLiquidity);

    s.tokens[params.tokenId] := token;
    s.accounts := applyInterestToBorrows(
            getTokenIds(Tezos.sender, s.borrows),
            Tezos.sender,
            s.accounts,
            s.tokens
          );

    const maxBorrowInCU : nat = calcMaxCollateralInCU(
      getTokenIds(Tezos.sender, s.markets),
      Tezos.sender,
      s.ledger,
      s.tokens
    );
    const outstandingBorrowInCU : nat = calcOutstandingBorrowInCU(
      getTokenIds(Tezos.sender, s.borrows),
      Tezos.sender,
      s.accounts,
      s.ledger,
      s.tokens
    );

    require(outstandingBorrowInCU <= maxBorrowInCU, Errors.redeemExceeds);

    operations := transfer_token(Tezos.self_address, Tezos.sender, redeemAmount, token.mainToken);

  } with (operations, s)

function borrow(
  const params          : asset_params_t;
  var s                 : storage_t)
                        : return_t is
  block {

    require(params.amount > 0n, Errors.zeroAmount);

    require(params.tokenId < s.lastTokenId, Errors.undefined);
    var token : tokenType :=  unwrap(s.tokens[params.tokenId], Errors.undefined);

    require(token.borrowPause = False, Errors.borrowPaused);


    var borrowTokens : set(nat) := getTokenIds(Tezos.sender, s.borrows);
    require(Bytes.length(borrowTokens) < s.maxMarkets, Errors.maxMarketLimit);

    borrowTokens := Set.add(params.tokenId, borrowTokens);
    s.accounts := applyInterestToBorrows(borrowTokens, Tezos.sender, s.accounts, s.tokens);
    var userAccount : account := getAccount(Tezos.sender, params.tokenId, s.accounts);
    const borrowsF : nat = params.amount * Constants.precision;

    userAccount.borrow := userAccount.borrow + borrowsF;
    s.accounts[(Tezos.sender, params.tokenId)] := userAccount;
    s.borrows[Tezos.sender] := borrowTokens;

    const maxBorrowInCU : nat = calcMaxCollateralInCU(
      getTokenIds(Tezos.sender, s.markets),
      Tezos.sender,
      s.ledger,
      s.tokens
    );
    const outstandingBorrowInCU : nat = calcOutstandingBorrowInCU(
      getTokenIds(Tezos.sender, s.borrows),
      Tezos.sender,
      s.accounts,
      s.ledger,
      s.tokens
    );

    require(outstandingBorrowInCU <= maxBorrowInCU, Errors.debtExceeds);

    token.totalBorrowsF := token.totalBorrowsF + borrowsF;
    token.totalLiquidF := get_nat_or_fail(token.totalLiquidF - borrowsF, Errors.lowLiquidity);
    s.tokens[params.tokenId] := token;
    const operations = transfer_token(Tezos.self_address, Tezos.sender, params.amount, token.mainToken);
  } with (operations, s)

function repay(
  const params          : asset_params_t;
  var s                 : storage_t)
                        : return_t is
  block {

    require(params.tokenId < s.lastTokenId, Errors.undefined);

    var token : tokenType := unwrap(s.tokens[params.tokenId], Errors.undefined);
    var borrowTokens : set(nat) := getTokenIds(Tezos.sender, s.borrows);
    s.accounts := applyInterestToBorrows(borrowTokens, Tezos.sender, s.accounts, s.tokens);
    var userAccount : account := getAccount(Tezos.sender, params.tokenId, s.accounts);
    var repayAmountF : nat := params.amount * Constants.precision;

    if repayAmountF = 0n
    then repayAmountF := userAccount.borrow
    else skip;

    userAccount.borrow := get_nat_or_fail(userAccount.borrow - repayAmountF, Errors.repayOverflow);

    if userAccount.borrow = 0n
    then borrowTokens := Set.remove(params.tokenId, borrowTokens)
    else skip;

    s.accounts[(Tezos.sender, params.tokenId)] := userAccount;
    token.totalBorrowsF := get_nat_or_fail(token.totalBorrowsF - repayAmountF, Errors.lowTotalBorrow);
    token.totalLiquidF := token.totalLiquidF + repayAmountF;
    s.tokens[params.tokenId] := token;
    s.borrows[Tezos.sender] := borrowTokens;
    const value : nat = ceil_div(repayAmountF, Constants.precision);
    operations := transfer_token(Tezos.sender, Tezos.self_address, value, token.mainToken);

  } with (operations, s)

function addMarket(
  const params          : newMarketParams;
  var s                 : storage_t)
                        : return_t is
  block {
    var token : tokenType := unwrap_or(s.tokens[s.lastTokenId], token_mock);
    const lastTokenId : nat = s.lastTokenId;

    (* TODO: fail if token exist - not fixed yet *)
    token.interestRateModel := params.interestRateModel;
    token.mainToken := params.asset;
    token.collateralFactorF := params.collateralFactorF;
    token.reserveFactorF := params.reserveFactorF;
    token.maxBorrowRate := params.maxBorrowRate;
    token.threshold := params.threshold;
    token.liquidReserveRateF := params.liquidReserveRateF;

    s.assets[params.asset] := lastTokenId;
    s.token_metadata[lastTokenId] := record [
      token_id = lastTokenId;
      token_info = params.token_metadata;
    ];
    s.tokens[lastTokenId] := token;
    s.lastTokenId := lastTokenId + 1n;
  } with (Constants.no_operations, s)