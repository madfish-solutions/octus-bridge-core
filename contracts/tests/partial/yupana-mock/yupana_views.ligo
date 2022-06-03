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
                        : nat is
  block {
    require(params.tokenId < s.lastTokenId, Errors.undefined);
    const token : tokenType = unwrap(s.tokens[params.tokenId], Errors.undefined);
    const liquidityF : nat = get_nat_or_fail(token.totalLiquidF + token.totalBorrowsF - token.totalReservesF, Errors.lowLiquidityReserve);
    var result := params.amount;
    if params.toShares
      then {
        if params.precision
        then result := result * Constants.precision
        else skip;

        result := if liquidityF > 0n
          then result * token.totalSupplyF / liquidityF
          else 0n;
      }
      else {
        result := if token.totalSupplyF > 0n
          then result * liquidityF / token.totalSupplyF
          else 0n;

        if params.precision
        then result := result / Constants.precision
        else skip;
      }
  } with result