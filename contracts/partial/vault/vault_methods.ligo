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

    case asset.asset_type of [
    | Tez -> require(Tezos.amount / 1mutez = params.amount, Errors.amounts_mismatch)
    | _ -> skip
    ];

    require(asset.tvl + params.amount <= asset.deposit_limit or asset.deposit_limit = 0n, Errors.deposit_limit);

    require(params.amount > 0n, Errors.zero_transfer);

    const fee = params.amount * asset.deposit_fee_f / Constants.precision;

    const deposited_amount = get_nat_or_fail(params.amount - fee, Errors.not_nat);

    if fee > 0n
    then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset.asset_type)
    else skip;

    var operations := result.operations;
    case asset.asset_type of [
    | Wrapped(token_) -> {
      const burn_params : burn_params_t = record[
        token_id = token_.id;
        account = Tezos.sender;
        amount = params.amount
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
    | Tez -> asset := asset with record[
        tvl = asset.tvl + deposited_amount;
        virtual_balance = asset.virtual_balance + deposited_amount
      ]
    | _ -> {
        operations := wrap_transfer(
          Tezos.sender,
          Tezos.self_address,
          params.amount,
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

function deposit_with_bounty(
  const params         : deposit_with_bounty_t;
  var s                : storage_t)
                       : return_t is
  block {
    require(not(s.paused), Errors.vault_paused);

    const asset_id = unwrap(s.asset_ids[params.asset], Errors.asset_undefined);
    var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);

    require(not(asset.paused), Errors.asset_paused);
    require(not(asset.banned), Errors.asset_banned);

    case asset.asset_type of [
    | Tez -> require(Tezos.amount / 1mutez = params.amount, Errors.amounts_mismatch)
    | _ -> skip
    ];
    require(params.amount > 0n, Errors.zero_transfer);
    require(asset.tvl + params.amount <= asset.deposit_limit or asset.deposit_limit = 0n, Errors.deposit_limit);

    const fee = params.amount * asset.deposit_fee_f / Constants.precision;

    var deposited_amount := get_nat_or_fail(params.amount - fee, Errors.not_nat);

    var total_fee := fee;
    var total_bounty := 0n;
    var total_withdrawal := 0n;

    var operations := Constants.no_operations;
    for withdrawal_id in set params.pending_withdrawal_ids {
      var pending_withdrawal := unwrap(s.pending_withdrawals[withdrawal_id], Errors.unknown_pending_withdrawal);

      require(pending_withdrawal.asset = params.asset, Errors.assets_do_not_match);
      require(pending_withdrawal.status = Pending(unit), Errors.pending_withdrawal_closed);

      total_withdrawal := total_withdrawal + pending_withdrawal.amount;
      require(deposited_amount >= total_withdrawal, Errors.amount_less_pending_amount);

      total_bounty := total_bounty + pending_withdrawal.bounty;
      total_fee := total_fee + pending_withdrawal.fee;

      operations := wrap_transfer(
        Tezos.self_address,
        pending_withdrawal.recipient,
        pending_withdrawal.amount,
        pending_withdrawal.asset
      ) # operations;

      s.withdrawals[s.withdrawal_count] := record[
        deposit_id = pending_withdrawal.deposit_id;
        asset      = pending_withdrawal.asset;
        amount     = pending_withdrawal.amount;
        recipient  = pending_withdrawal.recipient;
        metadata   = pending_withdrawal.metadata;
        signatures = pending_withdrawal.message.signatures;
      ];
      s.withdrawal_ids[pending_withdrawal.message.payload] := s.withdrawal_count;
      s.withdrawal_count := s.withdrawal_count + 1n;

      pending_withdrawal.status := Completed(unit);
      s.pending_withdrawals[withdrawal_id] := pending_withdrawal;
    };

    if total_fee > 0n
    then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, total_fee, asset.asset_type)
    else skip;

    var operations := wrap_transfer(
      Tezos.sender,
      Tezos.self_address,
      params.amount,
      asset.asset_type
    ) # operations;

    s.deposits[s.deposit_count] := record[
        recipient = params.recipient;
        amount    = deposited_amount + total_bounty;
        asset     = asset.asset_type;
    ];
    s.deposit_count := s.deposit_count + 1n;

    asset := asset with record[
        tvl = get_nat_or_fail(asset.tvl + deposited_amount - total_withdrawal, Errors.not_nat);
        virtual_balance = get_nat_or_fail(asset.virtual_balance + deposited_amount - total_withdrawal, Errors.not_nat)
    ];

    s.assets[asset_id] := asset;

  } with (operations, s)

function withdraw(
  const message        : message_t;
  var s                : storage_t)
                       : return_t is
  block {
    require(not(s.paused), Errors.vault_paused);
    require_none(s.withdrawal_ids[message.payload], Errors.payload_already_seen);
    require_none(s.pending_withdrawal_ids[message.payload], Errors.payload_already_seen);
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

    const fee = params.amount * asset.withdrawal_fee_f / Constants.precision;

    const withdrawal_amount = get_nat_or_fail(params.amount - fee, Errors.not_nat);

    const new_withdrawal = record[
        deposit_id = params.deposit_id;
        asset      = asset.asset_type;
        amount     = withdrawal_amount;
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
            const withdrawal_fee = params.amount * asset.withdrawal_fee_f / Constants.precision;
            require(params.bounty <= get_nat_or_fail(params.amount - withdrawal_fee, Errors.not_nat), Errors.bounty_too_high);

            s.pending_withdrawals[s.pending_count] := record[
                deposit_id = params.deposit_id;
                asset      = asset.asset_type;
                amount     = get_nat_or_fail(params.amount - withdrawal_fee - params.bounty, Errors.not_nat);
                fee        = withdrawal_fee;
                recipient  = params.recipient;
                metadata   = params.metadata;
                bounty     = params.bounty;
                message    = message;
                status     = Pending(unit);
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

function set_bounty(
  const params          : set_bounty_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var pending_withdrawal := unwrap(s.pending_withdrawals[params.pending_id], Errors.unknown_pending_withdrawal);
    require(Tezos.sender = pending_withdrawal.recipient, Errors.not_recipient);
    require(pending_withdrawal.status = Pending(unit), Errors.pending_withdrawal_closed);
    const asset_id = unwrap(s.asset_ids[pending_withdrawal.asset], Errors.asset_undefined);
    const asset = unwrap(s.assets[asset_id], Errors.asset_undefined);
    const fee = pending_withdrawal.amount * asset.withdrawal_fee_f / Constants.precision;
    const amount_with_fee = get_nat_or_fail(pending_withdrawal.amount - fee, Errors.not_nat);
    require(params.bounty <= amount_with_fee, Errors.bounty_too_high);
    pending_withdrawal.bounty := params.bounty;

    s.pending_withdrawals[params.pending_id] := pending_withdrawal;
  } with (Constants.no_operations, s)

function cancel_pending_withdrawal(
  const pending_id      : nat;
  var s                 : storage_t)
                        : return_t is
  block {
    var pending_withdrawal := unwrap(s.pending_withdrawals[pending_id], Errors.unknown_pending_withdrawal);
    require(Tezos.sender = pending_withdrawal.recipient, Errors.not_recipient);
    require(pending_withdrawal.status = Pending(unit), Errors.pending_withdrawal_closed);

    pending_withdrawal.status := Canceled(unit);

    s.pending_withdrawals[pending_id] := pending_withdrawal;
  } with (Constants.no_operations, s)