#include "../partial/common_types.ligo"
#include "../partial/common_constants.ligo"
#include "../partial/bridge-core/bridge_errors.ligo"
#include "../partial/bridge-core/bridge_types.ligo"
#include "../partial/common_helpers.ligo"

#include "../partial/bridge-core/bridge_admin_methods.ligo"


type parameter_t        is
| Set_owner               of address
| Set_round_submitter     of address
| Set_round_ttl           of nat
| Toggle_pause_bridge     of unit
| Toggle_ban_relay        of key
| Force_round_relay       of force_new_round_t

function main(
  const action             : parameter_t;
  const s                  : storage_t)
                           : return_t is
  case action of [
  (* Admin methods *)
  | Set_owner(params)            -> set_owner(params, s)
  | Set_round_submitter(params)  -> set_round_submitter(params, s)
  | Set_round_ttl(params)        -> set_round_ttl(params, s)
  | Toggle_pause_bridge(_)       -> toggle_pause_bridge(s)
  | Toggle_ban_relay(params)     -> toggle_ban_relay(params, s)
  | Force_round_relay(params)    -> force_round_relay(params, s)
  ]