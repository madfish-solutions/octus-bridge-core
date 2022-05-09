#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/vault/vault_errors.ligo"
#include "../partial/vault/vault_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/common_methods.ligo"
#include "../partial/vault/vault_admin_methods.ligo"

type parameter_t        is
| Set_owner               of address
| Set_bridge              of address
| Set_management          of address
| Set_fish                of address
| Set_guardian            of address
| Set_baker               of key_hash
| Set_deposit_limit       of nat
| Set_fees                of fees_t
| Toggle_pause_vault      of unit
| Toggle_pause_asset      of asset_id_t
| Toggle_ban_asset        of asset_standard_t
| Update_metadata         of metadata_t
| Confirm_owner           of unit

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  (* Admin methods *)
  | Set_owner(params)             -> set_owner(params, s)
  | Set_bridge(params)            -> set_bridge(params, s)
  | Set_management(params)        -> set_management(params, s)
  | Set_fish(params)              -> set_fish(params, s)
  | Set_guardian(params)          -> set_guardian(params, s)
  | Set_baker(params)             -> set_baker(params, s)
  | Set_deposit_limit(params)     -> set_deposit_limit(params, s)
  | Set_fees(params)              -> set_fees(params, s)
  | Toggle_pause_vault            -> toggle_pause_vault(s)
  | Toggle_pause_asset(params)    -> toggle_pause_asset(params, s)
  | Toggle_ban_asset(params)      -> toggle_ban_asset(params, s)
  | Update_metadata(params)       -> update_metadata(params, s)
  | Confirm_owner                 -> confirm_owner(s)

  ]