function set_owner(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_owner(new_owner) -> common_set_owner(new_owner, s)
  | _ -> (no_operations, s)
  ]

function confirm_owner(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Confirm_owner(_) -> common_confirm_owner(s)
  | _ -> (no_operations, s)
  ]

function update_metadata(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Update_metadata(params) -> common_update_metadata(params, s)
  | _  -> (no_operations, s)
  ]

function set_bridge(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_bridge(new_bridge) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
    } with (no_operations, s with record[bridge = new_bridge])
  | _ -> (no_operations, s)
  ]

function set_management(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_management(new_management) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
    } with (no_operations, s with record[management = new_management])
  | _ -> (no_operations, s)
  ]

function set_fish(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_fish(new_fish) -> block {
      require(Tezos.get_sender() = s.fish, Errors.not_fish);
    } with (no_operations, s with record[fish = new_fish])
  | _ -> (no_operations, s)
  ]

function set_guardian(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_guardian(new_guardian) -> block {
      require(Tezos.get_sender() = s.guardian, Errors.not_guardian);
    } with (no_operations, s with record[guardian = new_guardian])
  | _ -> (no_operations, s)
  ]

function set_deposit_limit(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_deposit_limit(params) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
      var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      asset.deposit_limit := params.deposit_limit;
      s.assets[params.asset_id] := asset;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function set_fees(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_fees(new_fees) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
    } with (no_operations, s with record[fees = new_fees])
  | _ -> (no_operations, s)
  ]

function set_asset_deposit_fee(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_asset_deposit_fee(params) -> {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
      var asset:= unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      asset.deposit_fee_f := params.fee_f;
      s.assets[params.asset_id] := asset;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function set_asset_withdraw_fee(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_asset_withdraw_fee(params) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
      var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      asset.withdrawal_fee_f := params.fee_f;
      s.assets[params.asset_id] := asset;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function set_native_config(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_native_config(config) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
      s.asset_config.native := config;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function set_alien_config(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_alien_config(config) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
      s.asset_config.alien := config;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function toggle_emergency_shutdown(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Toggle_emergency_shutdown(_) -> block {
      if s.emergency_shutdown
      then require(Tezos.get_sender() = s.owner, Errors.not_owner)
      else require(Tezos.get_sender() = s.guardian or Tezos.get_sender() = s.owner, Errors.not_owner_or_guardian);
    } with (no_operations, s with record[emergency_shutdown = not(s.emergency_shutdown)])
  | _ -> (no_operations, s)
  ]

function toggle_ban_asset(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Toggle_ban_asset(asset) -> block {
      require(Tezos.get_sender() = s.owner, Errors.not_owner);
      s := s with record[banned_assets = Big_map.update(
          asset,
          Some(not(unwrap_or(s.banned_assets[asset], False))),
          s.banned_assets)
        ]
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function delegate_tez(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Delegate_tez(baker) -> block {
        require(Tezos.get_sender() = s.owner, Errors.not_owner);
    } with (list[Tezos.set_delegate(baker)], s)
  | _ -> (no_operations, s)
  ]

function claim_baker_rewards(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Claim_baker_rewards(recipient) -> block {
      var balance_f := unwrap_or(s.baker_rewards[Tezos.get_sender()], 0n);
      const reward = balance_f / Constants.precision;
      require(reward > 0n, Errors.zero_fee_balance);

      s.baker_rewards[Tezos.get_sender()] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);

      const operation = wrap_transfer(
          Tezos.get_self_address(),
          recipient,
          reward,
          Tez(unit)
        )
    } with (list[operation], s)
  | _ -> (no_operations, s)
  ]

function claim_fee(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Claim_fee(params) -> block {
      var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      var fee_balances : fee_balances_t := unwrap(s.fee_balances[params.asset_id], Errors.asset_undefined);
      var balance_f := unwrap_or(fee_balances[Tezos.get_sender()], 0n);
      require(balance_f / Constants.precision > 0n, Errors.zero_fee_balance);
      const reward = balance_f / Constants.precision;
      require(reward <= asset.virtual_balance, Errors.low_asset_liquidity);

      fee_balances[Tezos.get_sender()] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);
      s.fee_balances[params.asset_id] := fee_balances;
      var operations := no_operations;
      case asset.asset_type of [
      | Wrapped(token) -> {
          operations := list[
              Tezos.transaction(
                list[
                  record[
                    token_id = token.id;
                    recipient = params.recipient;
                    amount = reward;
                  ];
                ],
                0mutez,
                unwrap(
                  (Tezos.get_entrypoint_opt("%mint", token.address) : option(contract(mint_params_t))),
                  Errors.mint_etp_404
                )
              )];
          asset := asset with record[
              tvl += reward;
              virtual_balance += reward
          ];
        }
      | _ -> {
          operations := list[
              wrap_transfer(
                Tezos.get_self_address(),
                params.recipient,
                reward,
                asset.asset_type
            )];
          asset := asset with record[
              tvl = get_nat_or_fail(asset.tvl - reward, Errors.not_nat);
              virtual_balance = get_nat_or_fail(asset.virtual_balance - reward, Errors.not_nat)
          ];
        }
      ];
      s.assets[params.asset_id] := asset;
    } with (operations, s)
  | _ -> (no_operations, s)
  ]

function claim_strategy_rewards(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Claim_strategy_rewards(params) -> block {
      const asset = unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      var fee_balances : fee_balances_t := unwrap(s.strategy_rewards[params.asset_id], Errors.asset_undefined);
      var balance_f := unwrap_or(fee_balances[Tezos.get_sender()], 0n);
      const reward = balance_f / Constants.precision;
      require(reward > 0n, Errors.zero_fee_balance);
      fee_balances[Tezos.get_sender()] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);

      s.strategy_rewards[params.asset_id] := fee_balances;

      const operation = wrap_transfer(
          Tezos.get_self_address(),
          params.recipient,
          reward,
          asset.asset_type
        );
    } with (list[operation], s)
  | _ -> (no_operations, s)
  ]

function add_strategy(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Add_strategy(params) -> {
      require(Tezos.get_sender() = s.strategist, Errors.not_strategist);
      const asset = unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      require_none(s.strategies[params.asset_id], Errors.strategy_exists);

      s.strategies[params.asset_id] := record[
        asset = asset.asset_type;
        strategy_address = params.strategy_address;
        tvl = 0n;
        target_reserves_rate_f = params.target_reserves_rate_f;
        delta_f = params.delta_f;
      ];
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function update_strategy(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Update_strategy(params) -> block {
      require(Tezos.get_sender() = s.strategist, Errors.not_strategist);
      require(not(s.emergency_shutdown), Errors.emergency_shutdown_enabled);
      var strategy := unwrap(s.strategies[params.asset_id], Errors.strategy_undefined);
      strategy := strategy with record[
          target_reserves_rate_f = params.target_reserves_rate_f;
          delta_f = params.delta_f;
       ];
      s.strategies[params.asset_id] := strategy;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function revoke_strategy(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Revoke_strategy(params) -> block {
      require(Tezos.get_sender() = s.strategist, Errors.not_strategist);
      var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      var strategy := unwrap(s.strategies[params.asset_id], Errors.strategy_undefined);

    } with if strategy.tvl > 0n
         then
          block {
            const divest_amount = strategy.tvl;
            if params.delete
            then remove params.asset_id from map s.strategies
            else {
                strategy.tvl := 0n;
                s.strategies[params.asset_id] := strategy;
              };
            asset.virtual_balance := asset.virtual_balance + divest_amount;
            s.assets[params.asset_id] := asset;
          } with (list[
              get_divest_op(divest_amount, params.data, strategy.strategy_address);
              get_harvest_op(strategy.strategy_address)
            ], s)
        else block {
            if params.delete
            then remove params.asset_id from map s.strategies
            else skip;
          } with (no_operations, s)

  | _ -> (no_operations, s)
  ]

function harvest(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Harvest(asset_id ) -> block {
        require(Tezos.get_sender() = s.strategist, Errors.not_strategist);
        const strategy = unwrap(s.strategies[asset_id], Errors.strategy_undefined);
    } with (list[get_harvest_op(strategy.strategy_address)], s)
  | _ -> (no_operations, s)
  ]

function handle_harvest(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Handle_harvest(params) -> {
      const asset_id = unwrap(s.asset_ids[params.asset], Errors.asset_undefined);
      const strategy = unwrap(s.strategies[asset_id], Errors.strategy_undefined);
      require(Tezos.get_sender() = strategy.strategy_address, Errors.not_strategist);

      if params.amount > 0n
      then s.strategy_rewards := update_fee_balances(s.strategy_rewards, s.fish, s.management, params.amount, asset_id)
      else skip;
    } with (no_operations, s)
  | _ -> (no_operations, s)
  ]

function maintain(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Maintain(params) -> block {
      require(Tezos.get_sender() = s.strategist, Errors.not_strategist);
      require(not(s.emergency_shutdown), Errors.emergency_shutdown_enabled);

      var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
      var strategy := unwrap(s.strategies[params.asset_id], Errors.strategy_undefined);

      require(asset.tvl > 0n, Errors.low_asset_liquidity);
      const current_rate_f = strategy.tvl * Constants.precision / asset.tvl;
      var operations := no_operations;

      if abs(current_rate_f - strategy.target_reserves_rate_f) > strategy.delta_f
        or strategy.tvl = 0n
      then {
        const optimal_deposit = asset.tvl * strategy.target_reserves_rate_f / Constants.precision;
        const disbalance_amount = abs(strategy.tvl - optimal_deposit);
        if current_rate_f > strategy.target_reserves_rate_f
        then {
            operations := get_divest_op(disbalance_amount, params.data, strategy.strategy_address) # operations;
            asset.virtual_balance := asset.virtual_balance + disbalance_amount;
            strategy.tvl := get_nat_or_fail(strategy.tvl - disbalance_amount, Errors.not_nat);
          }
        else if strategy.target_reserves_rate_f > current_rate_f
          then {
              operations := list[
                  wrap_transfer(
                    Tezos.get_self_address(),
                    strategy.strategy_address,
                    disbalance_amount,
                    asset.asset_type);
                  get_invest_op(disbalance_amount, params.data, strategy.strategy_address)];

              asset.virtual_balance := get_nat_or_fail(asset.virtual_balance - disbalance_amount, Errors.not_nat);
              strategy.tvl := strategy.tvl + disbalance_amount;
          } else failwith(Errors.no_rebalancing_needed);
      }
      else failwith(Errors.no_rebalancing_needed);
      s.assets[params.asset_id] := asset;
      s.strategies[params.asset_id] := strategy;
    } with (operations, s)
  | _ -> (no_operations, s)
  ]

