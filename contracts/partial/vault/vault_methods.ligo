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
    then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset.asset_type)
    else skip;

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
      asset := asset with record[
          tvl = get_nat_or_fail(asset.tvl - deposited_amount, Errors.not_nat);
          virtual_balance = get_nat_or_fail(asset.virtual_balance - deposited_amount, Errors.not_nat)
        ];

     }
    | Tez -> {
        require(deposit_without_fee = params.amount, Errors.amounts_mismatch);
        asset := asset with record[
            tvl = asset.tvl + deposited_amount;
            virtual_balance = asset.virtual_balance + deposited_amount
          ];
      }
    | _ -> {
        operations := wrap_transfer(
          Tezos.sender,
          Tezos.self_address,
          deposit_without_fee,
          asset.asset_type
        ) # operations;
        asset := asset with record[
            tvl = asset.tvl + deposited_amount;
            virtual_balance = asset.virtual_balance + deposited_amount
          ];
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

    const new_withdrawal = record[
        deposit_id = params.deposit_id;
        asset      = asset.asset_type;
        amount     = params.amount;
        recipient  = params.recipient;
        metadata   = params.metadata;
        signatures = message.signatures;
    ];

    var operations := result.operations;
    case asset.asset_type of [
    | Wrapped(token_) -> {
        if fee > 0n
        then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset.asset_type)
        else skip;
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
        asset := asset with record[
            tvl = asset.tvl + withdrawal_amount;
            virtual_balance = asset.virtual_balance + withdrawal_amount
          ];

        s.withdrawals[s.withdrawal_count] := new_withdrawal;
        s.withdrawal_ids[message.payload] := s.withdrawal_count;
        s.withdrawal_count := s.withdrawal_count + 1n;
      }
    | _ -> {
        if asset.virtual_balance >= params.amount
        then {
            if fee > 0n
            then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset.asset_type)
            else skip;
            operations := wrap_transfer(
                Tezos.self_address,
                params.recipient,
                withdrawal_amount,
                asset.asset_type
              ) # operations;
            asset := asset with record[
                tvl = get_nat_or_fail(asset.tvl - params.amount, Errors.not_nat);
                virtual_balance = get_nat_or_fail(asset.virtual_balance - params.amount, Errors.not_nat)
            ];
            s.withdrawals[s.withdrawal_count] := new_withdrawal;
            s.withdrawal_ids[message.payload] := s.withdrawal_count;
            s.withdrawal_count := s.withdrawal_count + 1n;
          }
        else {
            require_none(s.pending_withdrawal_ids[message.payload], Errors.payload_already_seen);
            s.pending_withdrawals[s.pending_count] := record[
                deposit_id = params.deposit_id;
                asset      = asset.asset_type;
                amount     = params.amount;
                recipient  = params.recipient;
                metadata   = params.metadata;
                bounty     = params.bounty;
                signatures = message.signatures;
                status = Pending(unit);
            ];
            s.pending_withdrawal_ids[message.payload] := s.pending_count ;
            s.pending_count := s.pending_count + 1n;
          };
      }
    ];

    s.assets[asset_id] := asset;

  } with (operations, s)

function default(
  var s                 : storage_t)
                        : return_t is
  block {
    const reward_f = (Tezos.amount / 1mutez) * Constants.precision;
    if reward_f > 0n
    then {
      const fish_balance_f = unwrap_or(s.baker_rewards[s.fish], 0n);
      const management_balance_f = unwrap_or(s.baker_rewards[s.management], 0n);
      s.baker_rewards[s.fish] := fish_balance_f + reward_f / Constants.div_two;
      s.baker_rewards[s.management] := management_balance_f + reward_f / Constants.div_two;
    } else skip

  } with (Constants.no_operations, s)