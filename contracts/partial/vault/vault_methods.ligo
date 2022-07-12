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
      | Toggle_pause_asset(_)      -> 11n
      | Toggle_ban_asset(_)        -> 12n
      | Toggle_emergency_shutdown(_) -> 13n
      | Update_metadata(_)         -> 14n
      | Delegate_tez(_)            -> 15n
      | Claim_baker_rewards(_)     -> 16n
      | Claim_fee(_)               -> 17n
      | Claim_strategy_rewards(_)  -> 18n
      | Confirm_owner(_)           -> 19n
      | Add_strategy(_)            -> 20n
      | Update_strategy(_)         -> 21n
      | Revoke_strategy(_)         -> 22n
      | Handle_harvest(_)          -> 23n
      | Maintain(_)                -> 24n
      | Harvest(_)                 -> 25n

      | Deposit(_)                 -> 26n
      | Deposit_with_bounty(_)     -> 27n
      | Withdraw(_)                -> 28n
      | Set_bounty(_)              -> 29n
      | Cancel_withdrawal(_)       -> 30n

      | Default(_)                 -> 31n
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
    | Some(_) -> failwith(Errors.func_seted)
    | None    -> s.vault_lambdas[params.index] := params.func
    ]
  } with (Constants.no_operations, s)

