function set_bridge(
  const new_bridge      : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[bridge = new_bridge])

function set_management(
  const new_management  : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[management = new_management])

function set_fish(
  const new_fish        : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.fish, Errors.not_fish)
  } with (Constants.no_operations, s with record[fish = new_fish])

function set_guardian(
  const new_guardian    : address;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.guardian, Errors.not_guardian)
  } with (Constants.no_operations, s with record[guardian = new_guardian])

function set_deposit_limit(
  const params          : set_deposit_limit_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
    asset.deposit_limit := params.deposit_limit;
    s.assets[params.asset_id] := asset;
  } with (Constants.no_operations, s)

function set_fees(
  const new_fees        : vault_fees_t;
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations, s with record[fees = new_fees])

function set_asset_deposit_fee(
  const params          : fee_per_asset_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    var asset:= unwrap(s.assets[params.asset_id], Errors.asset_undefined);
    asset.deposit_fee_f := params.fee_f;
    s.assets[params.asset_id] := asset;
  } with (Constants.no_operations, s)

function set_asset_withdraw_fee(
  const params          : fee_per_asset_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
    asset.withdraw_fee_f := params.fee_f;
    s.assets[params.asset_id] := asset;
  } with (Constants.no_operations, s)

function set_native_config(
  const config          : config_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.asset_config.native := config;
  } with (Constants.no_operations, s)

function set_aliens_config(
  const config          : config_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
    s.asset_config.aliens := config;
  } with (Constants.no_operations, s)

function toggle_emergency_shutdown(
  const s               : storage_t)
                        : return_t is
  block {
    if s.emergency_shutdown
    then require(Tezos.sender = s.owner, Errors.not_owner)
    else require(Tezos.sender = s.guardian or Tezos.sender = s.owner, Errors.not_owner_or_guardian);
  } with (Constants.no_operations, s with record[emergency_shutdown = not(s.emergency_shutdown)])

function toggle_pause_asset(
  const asset_id        : asset_id_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);
    if asset.paused
    then require(Tezos.sender = s.owner, Errors.not_owner)
    else require(Tezos.sender = s.guardian or Tezos.sender = s.owner, Errors.not_owner_or_guardian);

    s.assets[asset_id] := asset with record[paused = not(asset.paused)];
  } with (Constants.no_operations, s)

function toggle_ban_asset(
  const params          : asset_with_unit_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (Constants.no_operations,
      s with record[banned_assets = Big_map.update(
        params.asset,
        Some(not(unwrap_or(s.banned_assets[params.asset], False))),
        s.banned_assets
      )])

function delegate_tez(
  const baker           : option(key_hash);
  const s               : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner)
  } with (list[Tezos.set_delegate(baker)], s)

function claim_baker_rewards(
  const recipient       : address;
  var s                 : storage_t)
                        : return_t is
  block {
    var balance_f := unwrap_or(s.baker_rewards[Tezos.sender], 0n);
    const reward = balance_f / Constants.precision;
    require(reward > 0n, Errors.zero_fee_balance);

    s.baker_rewards[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);
  } with (
      list[
        wrap_transfer(
          Tezos.self_address,
          recipient,
          reward,
          Tez(unit)
        )], s)

function claim_fee(
  const params          : claim_fee_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var fee_balances : fee_balances_t := unwrap(s.fee_balances[params.asset], Errors.asset_undefined);
    var balance_f := unwrap_or(fee_balances[Tezos.sender], 0n);

    require(balance_f / Constants.precision > 0n, Errors.zero_fee_balance);
    const reward = balance_f / Constants.precision;
    fee_balances[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);
    s.fee_balances[params.asset] := fee_balances;
  } with (list[
      wrap_transfer(
        Tezos.self_address,
        params.recipient,
        reward,
        params.asset
      )], s)

function claim_strategy_rewards(
  const params          : claim_fee_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var fee_balances : fee_balances_t := unwrap(s.strategy_rewards[params.asset], Errors.asset_undefined);
    var balance_f := unwrap_or(fee_balances[Tezos.sender], 0n);
    const reward = balance_f / Constants.precision;
    require(reward > 0n, Errors.zero_fee_balance);
    fee_balances[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);

    s.strategy_rewards[params.asset] := fee_balances;
  } with (list[
      wrap_transfer(
        Tezos.self_address,
        params.recipient,
        reward,
        params.asset
      )], s)

function add_strategy(
  const params          : add_strategy_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.strategist, Errors.not_strategist);
    require_none(s.strategies[params.asset], Errors.strategy_exists);

    s.strategies[params.asset] := record[
      asset = params.asset;
      strategy_address = params.strategy_address;
      tvl = 0n;
      target_reserves_rate_f = params.target_reserves_rate_f;
      delta_f = params.delta_f;
    ];
  } with (Constants.no_operations, s)

function update_strategy(
  const params          : update_strategy_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.strategist, Errors.not_strategist);
    var strategy := unwrap(s.strategies[params.asset], Errors.strategy_undefined);
    strategy := strategy with record[
        target_reserves_rate_f = params.target_reserves_rate_f;
        delta_f = params.delta_f;
      ];
    s.strategies[params.asset] := strategy;
  } with (Constants.no_operations, s)

function revoke_strategy(
  const params          : revoke_strategy_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.strategist, Errors.not_strategist);
    var strategy := unwrap(s.strategies[params.asset], Errors.strategy_undefined);

    const return = if strategy.tvl > 0n
      then
        block {
          const divest_amount = strategy.tvl;
          if params.delete
          then remove params.asset from map s.strategies
          else {
              strategy.tvl := 0n;
              s.strategies[params.asset] := strategy;
            };
          const asset_id = unwrap(s.asset_ids[params.asset], Errors.asset_undefined);
          var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);
          asset.virtual_balance := asset.virtual_balance + divest_amount;
          s.assets[asset_id] := asset;
        } with (list[
            Tezos.transaction(
              divest_amount,
              0mutez,
              unwrap(
                (Tezos.get_entrypoint_opt("%divest", strategy.strategy_address) : option(contract(nat))),
                Errors.divest_etp_404
              ));
            get_harvest_op(strategy.strategy_address)
          ], s)
      else block {
          if params.delete
          then remove params.asset from map s.strategies
          else skip;
        } with (Constants.no_operations, s);

  } with return

function harvest(
  const params          : asset_with_unit_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.strategist, Errors.not_strategist);
    var strategy := unwrap(s.strategies[params.asset], Errors.strategy_undefined);
  } with (list[get_harvest_op(strategy.strategy_address)], s)

function handle_harvest(
  const params          : harvest_response_t;
  var s                 : storage_t)
                        : return_t is
  block {
    const strategy = unwrap(s.strategies[params.asset], Errors.strategy_undefined);
    require(Tezos.sender = strategy.strategy_address, Errors.not_strategist);

    if params.amount > 0n
    then s.strategy_rewards := update_fee_balances(s.strategy_rewards, s.fish, s.management, params.amount, params.asset)
    else skip;

  } with (Constants.no_operations, s)

function maintain(
  const params          : asset_with_unit_t;
  var s                 : storage_t)
                        : return_t is
  block {
    require(Tezos.sender = s.strategist, Errors.not_strategist);
    var strategy := unwrap(s.strategies[params.asset], Errors.strategy_undefined);
    const asset_id = unwrap(s.asset_ids[params.asset], Errors.asset_undefined);
    var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);
    require(asset.tvl > 0n, Errors.low_asset_liquidity);

    const current_delta_f = if strategy.tvl > 0n
      then strategy.tvl * Constants.precision / asset.tvl
      else 0n;

    var operations := Constants.no_operations;

    if s.emergency_shutdown and strategy.tvl > 0n
    then {
        operations := get_divest_op(strategy.tvl, strategy.strategy_address) # operations;
        asset.virtual_balance := asset.virtual_balance + strategy.tvl;
        strategy.tvl := 0n;
      }
    else if abs(current_delta_f - strategy.target_reserves_rate_f) > strategy.delta_f
        or strategy.tvl = 0n
      then {
          const optimal_deposit = asset.tvl * strategy.target_reserves_rate_f / Constants.precision;
          const disbalance_amount = abs(strategy.tvl - optimal_deposit);
          if current_delta_f > strategy.target_reserves_rate_f
          then {
              operations := get_divest_op(disbalance_amount, strategy.strategy_address) # operations;
              asset.virtual_balance := asset.virtual_balance + disbalance_amount;
              strategy.tvl := get_nat_or_fail(strategy.tvl - disbalance_amount, Errors.not_nat);
            }
          else if strategy.target_reserves_rate_f > current_delta_f
            then {
                operations := list[
                    wrap_transfer(
                      Tezos.self_address,
                      strategy.strategy_address,
                      disbalance_amount,
                      params.asset);
                    get_invest_op(disbalance_amount, strategy.strategy_address)];

                asset.virtual_balance := get_nat_or_fail(asset.virtual_balance - disbalance_amount, Errors.not_nat);
                strategy.tvl := strategy.tvl + disbalance_amount;
            } else failwith(Errors.no_rebalancing_needed);
        }
      else failwith(Errors.no_rebalancing_needed);
    s.assets[asset_id] := asset;
    s.strategies[params.asset] := strategy;

  } with (operations, s)
