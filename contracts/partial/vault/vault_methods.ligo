function deposit(
  const params         : deposit_t;
  var s                : storage_t)
                       : return_t is
  block {
    require(not(s.paused), Errors.vault_paused);

    const result = get_or_create_asset(params.asset, (None : option(token_meta_t)), s);
    var asset := result.asset;
    const asset_id = result.asset_id;
    s := result.storage;

    require(not(asset.paused), Errors.asset_paused);
    require(not(asset.banned), Errors.asset_banned);

    const deposit_without_fee = case asset.asset_type of [
    | Tez -> Tezos.amount / 1mutez
    | _ -> params.amount
    ];

    require(asset.tvl + deposit_without_fee <= asset.deposit_limit or asset.deposit_limit = 0n, Errors.deposit_limit);

    require(deposit_without_fee > 0n, Errors.zero_transfer);

    const fee = params.amount * asset.deposit_fee_f / Constants.precision;

    const deposited_amount = get_nat_or_fail(deposit_without_fee - fee, Errors.not_nat);

    if fee > 0n
    then {
      var fee_balance := unwrap_or(s.fee_balances[asset.asset_type], Constants.fee_balances_mock);
      s.fee_balances[asset.asset_type] := fee_balance with record[
          fish_f += fee * Constants.precision / Constants.profit_ratio;
          management_f += fee * Constants.precision / Constants.profit_ratio;
      ];
    } else skip;

    var operations := result.operations;
    case asset.asset_type of [
    | Wrapped(token_) -> {
      const burn_params : burn_params_t = record[
        token_id = token_.id;
        account = Tezos.sender;
        amount = deposit_without_fee
      ];
      operations := Tezos.transaction(
          burn_params,
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%burn", token_.address) : option(contract(burn_params_t))),
            Errors.burn_etp_404)
        ) # operations;
      asset.tvl := get_nat_or_fail(asset.tvl - deposited_amount, Errors.not_nat)
     }
    | Tez -> asset.tvl := asset.tvl + deposited_amount
    | _ -> {
        operations := wrap_transfer(
          Tezos.sender,
          Tezos.self_address,
          deposit_without_fee,
          asset.asset_type
        ) # operations;
        asset.tvl := asset.tvl + deposited_amount
      }
    ];
    s.assets[asset_id] := asset;

    s.deposits[s.deposit_count] := record[
        recipient = params.recipient;
        amount    = deposited_amount;
        asset     = asset.asset_type;
    ];
    s.deposit_count := s.deposit_count + 1n;

  } with (operations, s)

function withdraw(
  const message        : message_t;
  var s                : storage_t)
                       : return_t is
  block {
    require(not(s.paused), Errors.vault_paused);
    require_none(s.withdrawal_ids[message.payload], Errors.payload_already_seen);
    is_withdraw_valid(message, s.bridge);

    const payload = unwrap((Bytes.unpack(message.payload) : option(payload_t)), Errors.invalid_payload);
    const params = unwrap((Bytes.unpack(payload.event_data) : option(withdrawal_data_t)), Errors.invalid_withdrawal_params);

    const result = get_or_create_asset(params.asset, params.metadata, s);
    var asset := result.asset;
    const asset_id = result.asset_id;
    s := result.storage;

    require(not(asset.paused), Errors.asset_paused);
    require(not(asset.banned), Errors.asset_banned);

    require(params.amount > 0n, Errors.zero_transfer);

    const fee = params.amount * asset.withdraw_fee_f / Constants.precision;

    const withdrawal_amount = get_nat_or_fail(params.amount - fee, Errors.not_nat);

    if fee > 0n
    then {
      var fee_balance := unwrap_or(s.fee_balances[asset.asset_type], Constants.fee_balances_mock);
      s.fee_balances[asset.asset_type] := fee_balance with record[
          fish_f += fee * Constants.precision / Constants.profit_ratio;
          management_f += fee * Constants.precision / Constants.profit_ratio;
      ];
    } else skip;

    var operations := result.operations;
    case asset.asset_type of [
    | Wrapped(token_) -> {
      var mint_params : mint_params_t := list[
        record[
          token_id = token_.id;
          recipient = params.recipient;
          amount = withdrawal_amount
        ];
      ];
      operations := Tezos.transaction(
          mint_params,
          0mutez,
          unwrap(
            (Tezos.get_entrypoint_opt("%mint", token_.address) : option(contract(mint_params_t))),
            Errors.mint_etp_404
          )
         ) # operations;
      asset.tvl := asset.tvl + withdrawal_amount;
     }
    | _ -> {
        operations := wrap_transfer(
          Tezos.self_address,
          params.recipient,
          withdrawal_amount,
          asset.asset_type
        ) # operations;
        asset.tvl := get_nat_or_fail(asset.tvl - params.amount, Errors.not_nat);
      }
    ];

    s.assets[asset_id] := asset;

    s.withdrawals[s.withdrawal_count] := record[
        deposit_id = params.deposit_id;
        asset      = asset.asset_type;
        amount     = params.amount;
        recipient  = params.recipient;
        metadata   = params.metadata;
        signatures = message.signatures;
    ];
    s.withdrawal_ids[message.payload] := s.withdrawal_count;
    s.withdrawal_count := s.withdrawal_count + 1n;

  } with (operations, s)

function default(
  var s                 : storage_t)
                        : return_t is
  block {
    const reward_f = (Tezos.amount / 1mutez) * Constants.precision;
    if reward_f > 0n
    then s.baker_rewards := s.baker_rewards with record[
        fish_f += reward_f / Constants.profit_ratio;
        management_f += reward_f / Constants.profit_ratio
      ]
    else skip
  } with (Constants.no_operations, s)