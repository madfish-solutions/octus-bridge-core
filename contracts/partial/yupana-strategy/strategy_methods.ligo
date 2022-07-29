function invest(
  const params            : strategy_invest_t;
  var s                   : storage_t)
                          : return_t is
  block {
    require(Tezos.get_sender() = s.vault, Errors.not_vault);
    const min_received = unwrap_or((Bytes.unpack(params.data) : option(nat)), params.amount);
    var operations := list[
        Tezos.transaction(
          (record[
            tokenId     = s.protocol_asset_id;
            amount      = params.amount;
            minReceived = min_received;
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
            (s.protocol, params.amount),
            0mutez,
            unwrap(
              (Tezos.get_entrypoint_opt("%approve", addr) : option(contract(approve_fa12_token_t))),
              Errors.approve_etp_404)
            ) # operations
      | Tez -> failwith(Errors.wrong_asset)
      | _ -> skip
      ];
  } with (operations, s with record[tvl += params.amount])

function divest(
  const params            : strategy_invest_t;
  var s                   : storage_t)
                          : return_t is
  block {
    require(Tezos.get_sender() = s.vault, Errors.not_vault);
    require(params.amount <= s.tvl, Errors.low_balance);

    require(params.amount > 0n, Errors.zero_transfer);

    const min_received = unwrap_or((Bytes.unpack(params.data) : option(nat)), params.amount);
  } with (
      list[
        get_reedem_op(params.amount, min_received, s.protocol_asset_id, s.protocol);
        wrap_transfer(
          Tezos.get_self_address(),
          s.vault,
          params.amount,
          s.deposit_asset
        );
      ], s with record[tvl = get_nat_or_fail(s.tvl - params.amount, Errors.not_nat)])

function harvest(
  const callback        : contract(harvest_response_t);
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.get_sender() = s.vault, Errors.not_vault);
    const shares_balance = get_shares_balance(s.protocol_asset_id, s.protocol, True);
    const tvl_shares = convert_amount(s.tvl, s.protocol_asset_id, s.protocol, True, False);
    const profit_shares = get_nat_or_fail(shares_balance - tvl_shares, Errors.not_nat);
    const profit = convert_amount(profit_shares, s.protocol_asset_id, s.protocol, False, True);

    const operations = if profit > 0n
      then list[
          get_reedem_op(profit, profit, s.protocol_asset_id, s.protocol);
          wrap_transfer(
            Tezos.get_self_address(),
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