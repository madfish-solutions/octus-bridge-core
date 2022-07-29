#include "../partial/wrapped-token/token_errors.ligo"
#include "../partial/fa2_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/common_types.ligo"
#include "../partial/wrapped-token/token_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/wrapped-token/token_errors.ligo"
#include "../partial/wrapped-token/token_admin_methods.ligo"
#include "../partial/wrapped-token/token_supply_methods.ligo"
#include "../partial/wrapped-token/token_fa2_methods.ligo"
#include "../partial/wrapped-token/token_views.ligo"
#include "../partial/common_methods.ligo"

type action_t           is
| Set_owner               of address
| Set_vault               of address
| Create_token            of new_token_t
| Update_token_metadata   of token_metadata_t
| Update_metadata         of metadata_t
| Mint                    of mint_params_t
| Burn                    of burn_params_t
| Confirm_owner           of unit
| Transfer                of transfer_params_t
| Update_operators        of update_operator_params_t
| Balance_of              of balance_params_t

function main(
  const action          : action_t;
  const s               : storage_t)
                        : return_t is
  case action of [
  | Set_owner(params)             -> common_set_owner(params, s)
  | Set_vault(params)             -> set_vault(params, s)
  | Create_token(params)          -> create_token(params, s)
  | Update_token_metadata(params) -> update_token_metadata(params, s)
  | Update_metadata(params)       -> common_update_metadata(params, s)
  | Mint(params)                  -> mint(params, s)
  | Burn(params)                  -> burn(params, s)

  | Confirm_owner                 -> common_confirm_owner(s)

  | Transfer(params)              -> (Constants.no_operations, transfer(s, params))
  | Update_operators(params)      -> (Constants.no_operations, update_operators(s, params))
  | Balance_of(params)            -> (get_balance_of(s, params), s)
  ]
