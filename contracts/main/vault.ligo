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
| Toggle_pause_vault      of unit
| Toggle_pause_asset      of asset_id_t
| Toggle_ban_asset        of asset_standard_t
| Update_metadata         of metadata_t
| Delegate_tez            of option(key_hash)
| Claim_baker_rewards     of address
| Claim_fee               of claim_fee_t
| Confirm_owner           of unit

| Deposit                 of deposit_t
| Deposit_with_bounty     of deposit_with_bounty_t
| Withdraw                of message_t
| Set_bounty              of set_bounty_t
| Cancel_withdrawal       of cancel_pending_withdrawal_t

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
  | Toggle_pause_vault              -> toggle_pause_vault(s)
  | Toggle_pause_asset(params)      -> toggle_pause_asset(params, s)
  | Toggle_ban_asset(params)        -> toggle_ban_asset(params, s)
  | Update_metadata(params)         -> update_metadata(params, s)
  | Delegate_tez(params)            -> delegate_tez(params, s)
  | Claim_baker_rewards(params)     -> claim_baker_rewards(params, s)
  | Claim_fee(params)               -> claim_fee(params, s)
  | Confirm_owner                   -> confirm_owner(s)

  | Deposit(params)                 -> deposit(params, s)
  | Deposit_with_bounty(params)     -> deposit_with_bounty(params, s)
  | Withdraw(params)                -> withdraw(params, s)
  | Set_bounty(params)              -> set_bounty(params, s)
  | Cancel_withdrawal(params)       -> cancel_pending_withdrawal(params, s)

  | Default                         -> default(s)

  ]