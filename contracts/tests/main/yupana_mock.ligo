#include "../../partial/common_types.ligo"
#include "../../partial/common_constants.ligo"
#include "../partial/yupana-mock/yupana_errors.ligo"
#include "../../partial/fa2_types.ligo"
#include "../partial/FA2/FA2Types.ligo"
#include "../../partial/common_helpers.ligo"
#include "../partial/yupana-mock/yupana_types.ligo"
#include "../partial/yupana-mock/yupana_helpers.ligo"
#include "../partial/yupana-mock/yupana_methods.ligo"
#include "../partial/yupana-mock/yupana_views.ligo"

type parameter_t        is
| Mint                    of asset_params_t
| Redeem                  of asset_params_t
| AddMarket               of newMarketParams
| Borrow                  of asset_dl_params_t
| Repay                   of asset_params_t
| UpdateInterest          of nat

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  | Mint(params)    -> mint(params, s)
  | Redeem(params)  -> redeem(params, s)
  | AddMarket(params) -> addMarket(params, s)
  | Borrow(params) -> borrow(params, s)
  | Repay(params) -> repay(params, s)
  | UpdateInterest(params) -> updateInterest(params, s)
  ]