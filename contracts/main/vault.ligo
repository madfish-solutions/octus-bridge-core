#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/vault/vault_errors.ligo"
#include "../partial/vault/vault_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/common_methods.ligo"
#include "../partial/fa2_types.ligo"
#include "../partial/fa2_helpers.ligo"
#include "../partial/vault/vault_helpers.ligo"
#include "../partial/vault/vault_admin_methods.ligo"
#include "../partial/vault/vault_methods.ligo"

type parameter_t        is
| Set_owner               of address
| Set_bridge              of address
| Set_management          of address
| Set_fish                of address
| Set_guardian            of address
| Set_deposit_limit       of set_deposit_limit_t
| Set_fees                of vault_fees_t
| Set_asset_deposit_fee   of fee_per_asset_t
| Set_asset_withdraw_fee  of fee_per_asset_t
| Set_native_config       of config_t
| Set_aliens_config       of config_t
| Toggle_pause_asset      of asset_id_t
| Toggle_ban_asset        of asset_with_unit_t
| Toggle_emergency_shutdown of unit
| Update_metadata         of metadata_t
| Delegate_tez            of option(key_hash)
| Claim_baker_rewards     of address
| Claim_fee               of claim_fee_t
| Claim_strategy_rewards  of claim_fee_t
| Confirm_owner           of unit
| Add_strategy            of add_strategy_t
| Update_strategy         of update_strategy_t
| Revoke_strategy         of revoke_strategy_t
| Handle_harvest          of harvest_response_t
| Maintain                of asset_with_unit_t
| Harvest                 of asset_with_unit_t

| Deposit                 of deposit_t
| Withdraw                of message_t

| Default                 of unit

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  (* Admin methods *)
  | Set_owner(params)               -> set_owner(params, s)
  | Set_bridge(params)              -> set_bridge(params, s)
  | Set_management(params)          -> set_management(params, s)
  | Set_fish(params)                -> set_fish(params, s)
  | Set_guardian(params)            -> set_guardian(params, s)
  | Set_deposit_limit(params)       -> set_deposit_limit(params, s)
  | Set_fees(params)                -> set_fees(params, s)
  | Set_asset_deposit_fee(params)   -> set_asset_deposit_fee(params, s)
  | Set_asset_withdraw_fee(params)  -> set_asset_withdraw_fee(params, s)
  | Set_native_config(params)       -> set_native_config(params, s)
  | Set_aliens_config(params)       -> set_aliens_config(params, s)
  | Toggle_pause_asset(params)      -> toggle_pause_asset(params, s)
  | Toggle_ban_asset(params)        -> toggle_ban_asset(params, s)
  | Toggle_emergency_shutdown       -> toggle_emergency_shutdown(s)
  | Update_metadata(params)         -> update_metadata(params, s)
  | Delegate_tez(params)            -> delegate_tez(params, s)
  | Claim_baker_rewards(params)     -> claim_baker_rewards(params, s)
  | Claim_fee(params)               -> claim_fee(params, s)
  | Claim_strategy_rewards(params)  -> claim_strategy_rewards(params, s)
  | Confirm_owner                   -> confirm_owner(s)
  | Add_strategy(params)            -> add_strategy(params, s)
  | Update_strategy(params)         -> update_strategy(params, s)
  | Revoke_strategy(params)         -> revoke_strategy(params, s)
  | Handle_harvest(params)          -> handle_harvest(params, s)
  | Maintain(params)                -> maintain(params, s)
  | Harvest(params)                 -> harvest(params, s)

  | Deposit(params)                 -> deposit(params, s)
  | Withdraw(params)                -> withdraw(params, s)

  | Default                         -> default(s)

  ]