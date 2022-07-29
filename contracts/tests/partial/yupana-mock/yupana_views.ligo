type balanceOfParams  is [@layout:comb] record [
  requests              : list(balance_of_request);
  precision             : bool;
]

type convertParams    is [@layout:comb] record [
  toShares              : bool;
  tokenId               : nat;
  amount                : nat;
  precision             : bool;
]

type convertReturn    is [@layout:comb] record [
  amount                : nat;
  interestUpdateTime    : timestamp;
  priceUpdateTime       : timestamp;
]

[@view] function balanceOf(
  const p               : balanceOfParams;
  const s               : storage_t)
                        : list(balance_of_response) is
  block {
    function lookUpBalance(
      const request     : balance_of_request)
                        : balance_of_response is
      block {
        require(request.token_id < s.lastTokenId, Errors.undefined);
        const userBalance = unwrap_or(s.ledger[(request.owner, request.token_id)], 0n);
      } with record [
            request = request;
            balance = if p.precision
                      then userBalance / Constants.precision
                      else userBalance;
          ];
   } with List.map(lookUpBalance, p.requests)

[@view] function convert(
  const params          : convertParams;
  const s               : storage_t)
                        : convertReturn is
  block {
    require(params.tokenId < s.lastTokenId, Errors.undefined);
    const token : tokenType = unwrap(s.tokens[params.tokenId], Errors.undefined);
    const liquidityF : nat = get_nat_or_fail(token.totalLiquidF + token.totalBorrowsF - token.totalReservesF, Errors.lowLiquidityReserve);
    var value := params.amount;
    if params.toShares
      then {
        if params.precision
        then value := value * Constants.precision
        else skip;

        value := if liquidityF > 0n
          then value * token.totalSupplyF / liquidityF
          else 0n;
      }
      else {
        value := if token.totalSupplyF > 0n
          then value * liquidityF / token.totalSupplyF
          else 0n;

        if params.precision
        then value := value / Constants.precision
        else skip;
      };
    const result : convertReturn = record [
      amount = value;
      interestUpdateTime = token.interestUpdateTime;
      priceUpdateTime = token.priceUpdateTime
    ];
  } with result