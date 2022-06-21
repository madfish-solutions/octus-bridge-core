function invest(
  const amount_           : nat;
  var s                   : storage_t)
                          : return_t is
  block {
    require(Tezos.sender = s.vault, Errors.not_vault);

    var operations := list[
        get_get_price_op(s.protocol_asset_id, s.price_feed);
        get_update_interest_op(s.protocol_asset_id, s.protocol);
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
        );
      ];

    case s.deposit_asset of [
      | Fa12(addr) -> operations := Tezos.transaction(
            (s.protocol, amount_),
            0mutez,
            unwrap(
              (Tezos.get_entrypoint_opt("%approve", addr) : option(contract(approve_fa12_token_t))),
              Errors.approve_etp_404)
            ) # operations
      | Tez -> failwith(Errors.wrong_asset)
      | _ -> skip
      ];
  } with (operations, s with record[tvl += amount_])

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
        get_get_price_op(s.protocol_asset_id, s.price_feed);
        get_update_interest_op(s.protocol_asset_id, s.protocol);
        get_reedem_op(amount_, amount_, s.protocol_asset_id, s.protocol);
        wrap_transfer(
          Tezos.self_address,
          s.vault,
          amount_,
          s.deposit_asset
        );
      ], s with record[tvl = get_nat_or_fail(s.tvl - amount_, Errors.not_nat)])

function harvest(
  const callback        : contract(harvest_response_t);
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.vault, Errors.not_vault);
    const shares_balance = get_shares_balance(s.protocol_asset_id, s.protocol, True);
    const current_balance = convert_amount(shares_balance, s.protocol_asset_id, s.protocol, False, False);
    const profit = get_nat_or_fail(current_balance - s.tvl, Errors.not_nat);

    const operations = if profit > 0n
      then list[
          get_get_price_op(s.protocol_asset_id, s.price_feed);
          get_update_interest_op(s.protocol_asset_id, s.protocol);
          get_reedem_op(profit, profit, s.protocol_asset_id, s.protocol);
          wrap_transfer(
            Tezos.self_address,
            s.vault,
            profit,
            s.reward_asset
          );
          Tezos.transaction(
            record[
              asset = s.reward_asset;
              amount = profit;
            ],
            0mutez,
            callback
          )
        ]
      else Constants.no_operations

  } with (operations, s with record[last_profit = profit;])