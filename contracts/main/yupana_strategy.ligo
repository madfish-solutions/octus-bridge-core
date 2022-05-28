#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/yupana-strategy/strategy_errors.ligo"
#include "../partial/fa2_types.ligo"
#include "../partial/yupana-strategy/strategy_types.ligo"
#include "../partial/common_helpers.ligo"
#include "../partial/yupana-strategy/strategy_helpers.ligo"
#include "../partial/yupana-strategy/strategy_methods.ligo"

type parameter_t        is
| Invest                  of invest_t
| Handle_balance          of list (balance_of_response_t)

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  | Invest(params)         -> invest(params, s)
  | Handle_balance(params) -> handle_balance(params, s)

  ]