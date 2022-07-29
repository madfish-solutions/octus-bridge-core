[@inline] function call_vault(
  const action          : action_t;
  var s                 : full_storage_t)
                        : full_return_t is
  block {
    const id : nat = case action of [
      | Set_owner(_)               -> 0n
      | Set_bridge(_)              -> 1n
      | Set_management(_)          -> 2n
      | Set_fish(_)                -> 3n
      | Set_guardian(_)            -> 4n
      | Set_deposit_limit(_)       -> 5n
      | Set_fees(_)                -> 6n
      | Set_asset_deposit_fee(_)   -> 7n
      | Set_asset_withdraw_fee(_)  -> 8n
      | Set_native_config(_)       -> 9n
      | Set_alien_config(_)        -> 10n
      | Toggle_ban_asset(_)        -> 11n
      | Toggle_emergency_shutdown(_) -> 12n
      | Update_metadata(_)         -> 13n
      | Delegate_tez(_)            -> 14n
      | Claim_baker_rewards(_)     -> 15n
      | Claim_fee(_)               -> 16n
      | Claim_strategy_rewards(_)  -> 17n
      | Confirm_owner(_)           -> 18n
      | Add_strategy(_)            -> 19n
      | Update_strategy(_)         -> 20n
      | Revoke_strategy(_)         -> 21n
      | Handle_harvest(_)          -> 22n
      | Maintain(_)                -> 23n
      | Harvest(_)                 -> 24n

      | Deposit(_)                 -> 25n
      | Deposit_with_bounty(_)     -> 26n
      | Withdraw(_)                -> 27n
      | Set_bounty(_)              -> 28n
      | Cancel_withdrawal(_)       -> 29n

      | Default(_)                 -> 30n
    ];

    const lambda_bytes : bytes = unwrap(s.vault_lambdas[id], Errors.func_not_set);

    const res : return_t =
      case (Bytes.unpack(lambda_bytes) : option(vault_func_t)) of [
      | Some(func) -> func(action, s.storage)
      | None    -> failwith(Errors.not_unpack_lambda)
      ];

    s.storage := res.1;
  } with (res.0, s)

[@inline] function setup_func(
  const params          : setup_func_t;
  var s                 : full_storage_t)
                        : full_return_t is
  block {
    require(params.index <= vault_methods_max_index, Errors.wrong_index);
    case s.vault_lambdas[params.index] of [
    | Some(_) -> failwith(Errors.already_set)
    | None    -> s.vault_lambdas[params.index] := params.func
    ]
  } with (Constants.no_operations, s)

