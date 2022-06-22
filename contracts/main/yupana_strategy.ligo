#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/yupana-strategy/strategy_errors.ligo"
#include "../partial/fa2_types.ligo"
#include "../partial/yupana-strategy/strategy_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/fa2_helpers.ligo"
#include "../partial/yupana-strategy/strategy_helpers.ligo"
#include "../partial/yupana-strategy/strategy_methods.ligo"
#include "../partial/yupana-strategy/strategy_admin_methods.ligo"
#include "../partial/yupana-strategy/strategy_views.ligo"
#include "../partial/common_methods.ligo"

type parameter_t        is
| Set_owner               of address
| Confirm_owner           of unit
| Invest                  of nat
| Divest                  of nat
| Harvest                 of contract(harvest_response_t)
| Update_operator         of bool

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  | Set_owner(params) -> set_owner(params, s)
  | Confirm_owner(_)  -> confirm_owner(s)
  | Invest(params)    -> invest(params, s)
  | Divest(params)    -> divest(params, s)
  | Harvest(params)   -> harvest(params, s)
  | Update_operator(params) -> update_operator(params, s)
  ]