

function set_owner_l(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_owner(new_owner) -> set_owner(new_owner, s)
  | _ -> (no_operations, s)
  ]

function confirm_owner_l(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Confirm_owner(_) -> confirm_owner(s)
  | _ -> (no_operations, s)
  ]

function update_metadata_l(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Update_metadata(params) -> update_metadata(params, s)
  | _  -> (no_operations, s)
  ]

function set_bridge(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_bridge(new_bridge) -> block {
      require(Tezos.sender = s.owner, Errors.not_owner);
    } with (no_operations, s with record[bridge = new_bridge])
  | _ -> (no_operations, s)
  ]

function set_management(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_management(new_management) -> block {
      require(Tezos.sender = s.owner, Errors.not_owner);
    } with (no_operations, s with record[management = new_management])
  | _ -> (no_operations, s)
  ]

function set_fish(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_fish(new_fish) -> block {
      require(Tezos.sender = s.fish, Errors.not_fish);
    } with (no_operations, s with record[fish = new_fish])
  | _ -> (no_operations, s)
  ]

function set_guardian(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Set_guardian(new_guardian) -> block {
      require(Tezos.sender = s.guardian, Errors.not_guardian);
    } with (no_operations, s with record[guardian = new_guardian])
  | _ -> (no_operations, s)
  ]

function set_deposit_limit(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Set_deposit_limit(params) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
        asset.deposit_limit := params.deposit_limit;
        s.assets[params.asset_id] := asset;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function set_fees(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Set_fees(new_fees) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        s := s with record[fees = new_fees]
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function set_asset_deposit_fee(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Set_asset_deposit_fee(params) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        var asset:= unwrap(s.assets[params.asset_id], Errors.asset_undefined);
        asset.deposit_fee_f := params.fee_f;
        s.assets[params.asset_id] := asset;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function set_asset_withdraw_fee(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Set_asset_withdraw_fee(params) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        var asset := unwrap(s.assets[params.asset_id], Errors.asset_undefined);
        asset.withdrawal_fee_f := params.fee_f;
        s.assets[params.asset_id] := asset;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function set_native_config(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Set_native_config(config) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        s.asset_config.native := config;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)


function set_aliens_config(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Set_aliens_config(config) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        s.asset_config.aliens := config;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function toggle_emergency_shutdown(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Toggle_emergency_shutdown(_) -> {
        if s.emergency_shutdown
        then require(Tezos.sender = s.owner, Errors.not_owner)
        else require(Tezos.sender = s.guardian or Tezos.sender = s.owner, Errors.not_owner_or_guardian);
        s := s with record[emergency_shutdown = not(s.emergency_shutdown)]
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function toggle_pause_asset(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Toggle_pause_asset(asset_id) -> {
        var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);
        if asset.paused
        then require(Tezos.sender = s.owner, Errors.not_owner)
        else require(Tezos.sender = s.guardian or Tezos.sender = s.owner, Errors.not_owner_or_guardian);

        s.assets[asset_id] := asset with record[paused = not(asset.paused)];
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function toggle_ban_asset(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Toggle_ban_asset(asset) -> {
        require(Tezos.sender = s.owner, Errors.not_owner);
        s := s with record[banned_assets = Big_map.update(
            asset,
            Some(not(unwrap_or(s.banned_assets[asset], False))),
            s.banned_assets)
          ]
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function delegate_tez(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Delegate_tez(baker) -> block {
        require(Tezos.sender = s.owner, Errors.not_owner);
    } with (list[Tezos.set_delegate(baker)], s)
  | _ -> (no_operations, s)
  ]

function claim_baker_rewards(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var operations := no_operations;
    case action of [
    | Claim_baker_rewards(recipient) -> {
        var balance_f := unwrap_or(s.baker_rewards[Tezos.sender], 0n);
        const reward = balance_f / Constants.precision;
        require(reward > 0n, Errors.zero_fee_balance);

        s.baker_rewards[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);

        operations := wrap_transfer(
            Tezos.self_address,
            recipient,
            reward,
            Tez(unit)
          ) # operations;
      }
    | _ -> skip
    ]
  } with (operations, s)


function claim_fee(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var operations := no_operations;
    case action of [
    | Claim_fee(params) -> {
        const asset = unwrap(s.assets[params.asset_id], Errors.asset_undefined);
        var fee_balances : fee_balances_t := unwrap(s.fee_balances[params.asset_id], Errors.asset_undefined);
        var balance_f := unwrap_or(fee_balances[Tezos.sender], 0n);
        require(balance_f / Constants.precision > 0n, Errors.zero_fee_balance);
        const reward = balance_f / Constants.precision;
        fee_balances[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);
        s.fee_balances[params.asset_id] := fee_balances;
        operations :=  wrap_transfer(
            Tezos.self_address,
            params.recipient,
            reward,
            asset.asset_type
         ) # operations;
      }
    | _ -> skip
    ]
  } with (operations, s)

function claim_strategy_rewards(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var operations := no_operations;
    case action of [
    | Claim_strategy_rewards(params) -> {
        const asset = unwrap(s.assets[params.asset_id], Errors.asset_undefined);
        var fee_balances : fee_balances_t := unwrap(s.strategy_rewards[params.asset_id], Errors.asset_undefined);
        var balance_f := unwrap_or(fee_balances[Tezos.sender], 0n);
        const reward = balance_f / Constants.precision;
        require(reward > 0n, Errors.zero_fee_balance);
        fee_balances[Tezos.sender] := get_nat_or_fail(balance_f - reward * Constants.precision, Errors.not_nat);

        s.strategy_rewards[params.asset_id] := fee_balances;

        operations := wrap_transfer(
            Tezos.self_address,
            params.recipient,
            reward,
            asset.asset_type
          ) # operations;
      }
    | _ -> skip
    ]
  } with (operations, s)

function add_strategy(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Add_strategy(params) -> {
        require(Tezos.sender = s.strategist, Errors.not_strategist);
        const asset = unwrap(s.assets[params.asset_id], Errors.asset_undefined);
        require_none(s.strategies[params.asset_id], Errors.strategy_exists);

        s.strategies[params.asset_id] := record[
          asset = asset.asset_type;
          strategy_address = params.strategy_address;
          tvl = 0n;
          target_reserves_rate_f = params.target_reserves_rate_f;
          delta_f = params.delta_f;
        ];
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function update_strategy(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Update_strategy(params) -> {
        require(Tezos.sender = s.strategist, Errors.not_strategist);
        var strategy := unwrap(s.strategies[params.asset_id], Errors.strategy_undefined);
        strategy := strategy with record[
            target_reserves_rate_f = params.target_reserves_rate_f;
            delta_f = params.delta_f;
          ];
        s.strategies[params.asset_id] := strategy;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function revoke_strategy(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var return : return_t := case action of [
    | Revoke_strategy(params) -> block {
        require(Tezos.sender = s.strategist, Errors.not_strategist);
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
              then remove params.asset_id from map s.strategies
              else skip;
            } with (no_operations, s)

    | _ -> (no_operations, s)
    ]
  } with return

function harvest(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  case action of [
  | Harvest(asset_id ) -> block {
        require(Tezos.sender = s.strategist, Errors.not_strategist);
        const strategy = unwrap(s.strategies[asset_id], Errors.strategy_undefined);
    } with (list[get_harvest_op(strategy.strategy_address)], s)
  | _ -> (no_operations, s)
  ]

function handle_harvest(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    case action of [
    | Handle_harvest(params) -> {
        const asset_id = unwrap(s.asset_ids[params.asset], Errors.asset_undefined);
        const strategy = unwrap(s.strategies[asset_id], Errors.strategy_undefined);
        require(Tezos.sender = strategy.strategy_address, Errors.not_strategist);

        if params.amount > 0n
        then s.strategy_rewards := update_fee_balances(s.strategy_rewards, s.fish, s.management, params.amount, asset_id)
        else skip;
      }
    | _ -> skip
    ]
  } with (Constants.no_operations, s)

function maintain(
  const action          : action_t;
  var s                 : storage_t)
                        : return_t is
  block {
    var operations := no_operations;
    case action of [
    | Maintain(asset_id) -> {
        require(Tezos.sender = s.strategist, Errors.not_strategist);
        var asset := unwrap(s.assets[asset_id], Errors.asset_undefined);
        var strategy := unwrap(s.strategies[asset_id], Errors.strategy_undefined);

        require(asset.tvl > 0n, Errors.low_asset_liquidity);

        const current_rate_f = if strategy.tvl > 0n
          then strategy.tvl * Constants.precision / asset.tvl
          else 0n;

        if s.emergency_shutdown and strategy.tvl > 0n
        then {
            operations := get_divest_op(strategy.tvl, strategy.strategy_address) # operations;
            asset.virtual_balance := asset.virtual_balance + strategy.tvl;
            strategy.tvl := 0n;
          }
        else if abs(current_rate_f - strategy.target_reserves_rate_f) > strategy.delta_f
            or strategy.tvl = 0n
          then {
              const optimal_deposit = asset.tvl * strategy.target_reserves_rate_f / Constants.precision;
              const disbalance_amount = abs(strategy.tvl - optimal_deposit);
              if current_rate_f > strategy.target_reserves_rate_f
              then {
                  operations := get_divest_op(disbalance_amount, strategy.strategy_address) # operations;
                  asset.virtual_balance := asset.virtual_balance + disbalance_amount;
                  strategy.tvl := get_nat_or_fail(strategy.tvl - disbalance_amount, Errors.not_nat);
                }
              else if strategy.target_reserves_rate_f > current_rate_f
                then {
                    operations := list[
                        wrap_transfer(
                          Tezos.self_address,
                          strategy.strategy_address,
                          disbalance_amount,
                          asset.asset_type);
                        get_invest_op(disbalance_amount, strategy.strategy_address)];

                    asset.virtual_balance := get_nat_or_fail(asset.virtual_balance - disbalance_amount, Errors.not_nat);
                    strategy.tvl := strategy.tvl + disbalance_amount;
                } else failwith(Errors.no_rebalancing_needed);
            }
          else failwith(Errors.no_rebalancing_needed);
        s.assets[asset_id] := asset;
        s.strategies[asset_id] := strategy;
      }
    | _ -> skip
    ]
  } with (operations, s)
