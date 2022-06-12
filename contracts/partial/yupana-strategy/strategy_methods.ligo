function invest(
  const amount_           : nat;
  var s                   : storage_t)
                          : return_t is
  block {
    require(Tezos.sender = s.vault, Errors.not_vault);
    const approve_op = case s.deposit_asset of [
      | Fa12(addr) ->
        Tezos.transaction(
          (s.protocol, amount_),
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%approve", addr) : option(contract(approve_fa12_token_t))),
            Errors.approve_etp_404)
          )
      | Tez -> failwith(Errors.wrong_asset)
      | Fa2(token) ->
        Tezos.transaction(
          list[
            Add_operator(
              record[
                owner    = Tezos.self_address;
                operator = s.protocol;
                token_id = token.id;
              ])
          ],
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%update_operators", token.address) : option(contract(approve_fa2_token_t))),
            Errors.approve_etp_404)
          )
      | Wrapped(token) ->
        Tezos.transaction(
          list[
            Add_operator(
              record[
                owner    = Tezos.self_address;
                operator = s.protocol;
                token_id = token.id;
              ])
          ],
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%update_operators", token.address) : option(contract(approve_fa2_token_t))),
            Errors.approve_etp_404)
          )
        ]
  } with (
      list[
        approve_op;
        Tezos.transaction(
          (record[
            tokenId     = s.protocol_asset_id;
            amount      = amount_;
            minReceived = amount_;
          ] : call_y_t),
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%mint", s.protocol) : option(contract(call_y_t))),
            Errors.mint_etp_404
          )
        )
      ], s with record[tvl += amount_])

function divest(
  const amount_           : nat;
  var s                   : storage_t)
                          : return_t is
  block {
    require(Tezos.sender = s.vault, Errors.not_vault);
    require(amount_ <= s.tvl, Errors.low_balance);

    require(amount_ > 0n, Errors.zero_transfer);

  } with (
      list[
        get_reedem_op(amount_, amount_, s.protocol_asset_id, s.protocol);
        wrap_transfer(
          Tezos.self_address,
          s.vault,
          amount_,
          s.deposit_asset
        );
      ], s with record[tvl = get_nat_or_fail(s.tvl - amount_, Errors.not_nat)])

function harvest(
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.vault, Errors.not_vault);
    const shares_balance = get_shares_balance(s.protocol_asset_id, s.protocol, True);
    const current_balance = convert_amount(shares_balance, s.protocol_asset_id, s.protocol, False, False);
    const profit = get_nat_or_fail(current_balance - s.tvl, Errors.not_nat);
    require(profit > 0n, Errors.zero_profit);

  } with (list[
      get_reedem_op(profit, profit, s.protocol_asset_id, s.protocol);
      wrap_transfer(
        Tezos.self_address,
        s.vault,
        profit,
        s.deposit_asset
      )
      ], s with record[last_profit = profit;])