function deposit(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Deposit(params) -> block {
      require(not(s.emergency_shutdown), Errors.emergency_shutdown_enabled);

      const result = get_or_create_asset(params.asset, (None : option(token_meta_t)), s);
      var asset := result.asset;
      const asset_id = result.asset_id;
      s := result.storage;

      require(not(unwrap_or(s.banned_assets[params.asset], False)), Errors.asset_banned);

      case asset.asset_type of [
      | Tez -> require(Tezos.get_amount() / 1mutez = params.amount, Errors.amounts_mismatch)
      | _ -> skip
      ];

      require(asset.tvl + params.amount <= asset.deposit_limit or asset.deposit_limit = 0n, Errors.deposit_limit);

      require(params.amount > 0n, Errors.zero_transfer);

      const fee_f = params.amount * asset.deposit_fee_f;

      const deposited_amount = get_nat_or_fail(params.amount * Constants.precision - fee_f, Errors.not_nat) / Constants.precision;

      const fee = get_nat_or_fail(params.amount - deposited_amount, Errors.not_nat);

      if fee > 0n
      then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset_id)
      else skip;

      var operations := result.operations;
      case asset.asset_type of [
      | Wrapped(token_) -> {
        const burn_params : burn_params_t = record[
          token_id = token_.id;
          account = Tezos.get_sender();
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
            tvl = get_nat_or_fail(asset.tvl - params.amount, Errors.not_nat);
            virtual_balance = get_nat_or_fail(asset.virtual_balance - params.amount, Errors.not_nat)
          ]
      }
      | Tez -> {
          asset := asset with record [
              tvl += params.amount;
              virtual_balance += params.amount
            ]
        }
      | _ -> {
          operations := wrap_transfer(
            Tezos.get_sender(),
            Tezos.get_self_address(),
            params.amount,
            asset.asset_type
          ) # operations;
          asset := asset with record [
              tvl += params.amount;
              virtual_balance += params.amount
            ]
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
  | _ -> (no_operations, s)
  ]

function deposit_with_bounty(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Deposit_with_bounty(params) -> block {
      require(not(s.emergency_shutdown), Errors.emergency_shutdown_enabled);

      var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);

      case asset.asset_type of [
      | Tez -> require(Tezos.get_amount() / 1mutez = params.amount, Errors.amounts_mismatch)
      | Wrapped(_) -> failwith(Errors.unsupported_asset)
      | _ -> skip
      ];
      require(params.amount > 0n, Errors.zero_transfer);
      require(asset.tvl + params.amount <= asset.deposit_limit or asset.deposit_limit = 0n, Errors.deposit_limit);


      var total_bounty := 0n;
      var total_withdrawal := 0n;
      var total_withdrawal_fee := 0n;
      var operations := no_operations;
      for withdrawal_id in set params.pending_withdrawal_ids {
        var pending_withdrawal := unwrap(s.pending_withdrawals[withdrawal_id], Errors.unknown_pending_withdrawal);

        require(pending_withdrawal.asset = asset.asset_type, Errors.assets_do_not_match);
        require(pending_withdrawal.status = Pending(unit), Errors.pending_withdrawal_closed);

        total_withdrawal := get_nat_or_fail(total_withdrawal + pending_withdrawal.amount - pending_withdrawal.bounty, Errors.not_nat);
        total_withdrawal_fee := total_withdrawal_fee + pending_withdrawal.fee;
        total_bounty := total_bounty + pending_withdrawal.bounty;

        const withdrawal_amount = get_nat_or_fail(pending_withdrawal.amount - pending_withdrawal.bounty, Errors.not_nat);
        operations := wrap_transfer(
          Tezos.get_self_address(),
          pending_withdrawal.recipient,
          withdrawal_amount,
          pending_withdrawal.asset
        ) # operations;

        s.withdrawals[s.withdrawal_count] := record[
          deposit_id = pending_withdrawal.deposit_id;
          asset      = pending_withdrawal.asset;
          amount     = withdrawal_amount;
          recipient  = pending_withdrawal.recipient;
          signatures = pending_withdrawal.message.signatures;
        ];
        const payload_hash = Crypto.keccak(pending_withdrawal.message.payload);
        s.withdrawal_ids[payload_hash] := s.withdrawal_count;
        s.withdrawal_count := s.withdrawal_count + 1n;

        pending_withdrawal.status := Completed(unit);
        s.pending_withdrawals[withdrawal_id] := pending_withdrawal;
      };
      const deposit_with_bounty = params.amount + total_bounty;
      const fee_f = deposit_with_bounty * asset.deposit_fee_f;

      const deposited_amount = get_nat_or_fail(deposit_with_bounty * Constants.precision - fee_f, Errors.not_nat) / Constants.precision;

      const fee = get_nat_or_fail(deposit_with_bounty - deposited_amount, Errors.not_nat);
      require(params.amount >= total_withdrawal, Errors.amount_less_pending_amount);
      require(params.expected_min_bounty <= total_bounty, Errors.bounty_lower_expected);

      if fee + total_withdrawal_fee > 0n
      then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee + total_withdrawal_fee, params.asset_id)
      else skip;

      operations := wrap_transfer(
          Tezos.get_sender(),
          Tezos.get_self_address(),
          params.amount,
          asset.asset_type
        ) # operations;

      s.deposits[s.deposit_count] := record[
          recipient = params.recipient;
          amount    = deposited_amount;
          asset     = asset.asset_type;
      ];
      s.deposit_count := s.deposit_count + 1n;

      asset := asset with record[
          tvl = get_nat_or_fail(asset.tvl + params.amount - total_withdrawal, Errors.not_nat);
          virtual_balance = get_nat_or_fail(asset.virtual_balance + params.amount - total_withdrawal, Errors.not_nat)
      ];

      s.assets[params.asset_id] := asset;

    } with (operations, s)
  | _ -> (no_operations, s)
  ]

function withdraw(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Withdraw(message) -> {
      require(not(s.emergency_shutdown), Errors.emergency_shutdown_enabled);

      const payload_hash = Crypto.keccak(message.payload);
      require_none(s.withdrawal_ids[payload_hash], Errors.payload_already_seen);
      require_none(s.pending_withdrawal_ids[payload_hash], Errors.payload_already_seen);
      ensure_withdraw_valid(message, s.bridge);

      const payload = unwrap((Bytes.unpack(message.payload) : option(payload_t)), Errors.invalid_payload);
      const params = unwrap((Bytes.unpack(payload.event_data) : option(withdrawal_data_t)), Errors.invalid_withdrawal_params);

      require(params.chain_id = Constants.chain_id, Errors.wrong_chain_id);
      const result = get_or_create_asset(params.asset, params.metadata, s);
      var asset := result.asset;
      const asset_id = result.asset_id;
      s := result.storage;

      require(not(unwrap_or(s.banned_assets[params.asset], False)), Errors.asset_banned);

      require(params.amount > 0n, Errors.zero_transfer);

      const fee_f = params.amount * asset.withdrawal_fee_f;

      const withdrawal_amount = get_nat_or_fail(params.amount * Constants.precision - fee_f, Errors.not_nat) / Constants.precision;

      const fee = get_nat_or_fail(params.amount - withdrawal_amount, Errors.not_nat);

      const new_withdrawal = record[
          deposit_id = params.deposit_id;
          asset      = asset.asset_type;
          amount     = withdrawal_amount;
          recipient  = params.recipient;
          signatures = message.signatures;
      ];

      var operations := result.operations;
      case asset.asset_type of [
      | Wrapped(token_) -> {
          require(
            s.asset_config.native.configuration_address = payload.configuration_address and
            s.asset_config.native.configuration_wid = payload.configuration_wid,
            Errors.wrong_event_configuration
          );

          if fee > 0n
          then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset_id)
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

          operations := reverse_list(operations);
          asset := asset with record[
              tvl += withdrawal_amount;
              virtual_balance += withdrawal_amount
            ];

          s.withdrawals[s.withdrawal_count] := new_withdrawal;
          s.withdrawal_ids[payload_hash] := s.withdrawal_count;
          s.withdrawal_count := s.withdrawal_count + 1n;
        }
      | _ -> {
        require(
          s.asset_config.alien.configuration_address = payload.configuration_address and
          s.asset_config.alien.configuration_wid = payload.configuration_wid,
          Errors.wrong_event_configuration
        );
        if asset.virtual_balance >= params.amount
        then {
            if fee > 0n
            then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, fee, asset_id)
            else skip;

            operations := wrap_transfer(
                Tezos.get_self_address(),
                params.recipient,
                withdrawal_amount,
                asset.asset_type
              ) # operations;
            asset := asset with record[
                tvl = get_nat_or_fail(asset.tvl - params.amount, Errors.not_nat);
                virtual_balance = get_nat_or_fail(asset.virtual_balance - params.amount, Errors.not_nat)
            ];
            s.withdrawals[s.withdrawal_count] := new_withdrawal;
            s.withdrawal_ids[payload_hash] := s.withdrawal_count;
            s.withdrawal_count := s.withdrawal_count + 1n;
          }
        else {
          if params.bounty > 0n
          then require(params.recipient = Tezos.get_sender(), Errors.not_recipient)
          else skip;

          require(params.bounty <= withdrawal_amount, Errors.bounty_too_high);

          s.pending_withdrawals[s.pending_count] := record[
              deposit_id = params.deposit_id;
              asset      = asset.asset_type;
              recipient  = params.recipient;
              amount     = get_nat_or_fail(
                              params.amount - fee, Errors.not_nat);
              fee        = fee;
              bounty     = params.bounty;
              message    = message;
              status     = Pending(unit);
          ];
          s.pending_withdrawal_ids[payload_hash] := s.pending_count ;
          s.pending_count := s.pending_count + 1n;
        };
       }
      ];

      s.assets[asset_id] := asset;

    } with (operations, s)
  | _ -> (no_operations, s)
  ]

function default(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Default(_) -> block {
      const reward_f = (Tezos.get_amount() / 1mutez) * Constants.precision;
      if reward_f > 0n
      then {
        const fish_balance_f = unwrap_or(s.baker_rewards[s.fish], 0n);
        const management_balance_f = unwrap_or(s.baker_rewards[s.management], 0n);
        const half_reward = reward_f / 2n;
        s.baker_rewards[s.fish] := fish_balance_f + half_reward;
        s.baker_rewards[s.management] := management_balance_f + half_reward;
      } else skip
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function set_bounty(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_bounty(params) -> block {
      var pending_withdrawal := unwrap(s.pending_withdrawals[params.pending_id], Errors.unknown_pending_withdrawal);
      require(Tezos.get_sender() = pending_withdrawal.recipient, Errors.not_recipient);
      require(pending_withdrawal.status = Pending(unit), Errors.pending_withdrawal_closed);
      require(params.bounty < pending_withdrawal.amount, Errors.bounty_too_high);
      pending_withdrawal.bounty := params.bounty;
      s.pending_withdrawals[params.pending_id] := pending_withdrawal;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function cancel_withdrawal(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Cancel_withdrawal(params) -> block {
      var pending_withdrawal := unwrap(s.pending_withdrawals[params.pending_id], Errors.unknown_pending_withdrawal);
      require(Tezos.get_sender() = pending_withdrawal.recipient, Errors.not_recipient);
      require(pending_withdrawal.status = Pending(unit), Errors.pending_withdrawal_closed);

      pending_withdrawal.status := Canceled(unit);

      s.pending_withdrawals[params.pending_id] := pending_withdrawal;

      const asset_id = unwrap(s.asset_ids[pending_withdrawal.asset], Errors.asset_undefined);

      if pending_withdrawal.fee > 0n
      then s.fee_balances := update_fee_balances(s.fee_balances, s.fish, s.management, pending_withdrawal.fee, asset_id)
      else skip;

      s.deposits[s.deposit_count] := record[
          recipient = params.recipient;
          amount    = pending_withdrawal.amount;
          asset     = pending_withdrawal.asset
      ];
      s.deposit_count := s.deposit_count + 1n;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]
