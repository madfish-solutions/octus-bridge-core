#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/yupana-strategy/strategy_errors.ligo"
#include "../partial/fa2_types.ligo"
#include "../partial/yupana-strategy/strategy_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/fa2_helpers.ligo"
#include "../partial/yupana-strategy/strategy_helpers.ligo"
#include "../partial/yupana-strategy/strategy_methods.ligo"
#include "../partial/yupana-strategy/strategy_views.ligo"

type parameter_t        is
| Invest                  of nat
| Divest                  of nat
| Harvest                 of unit

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  | Invest(params)  -> invest(params, s)
  | Divest(params)  -> divest(params, s)
  | Harvest         -> harvest(s)
  ]