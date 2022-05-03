function call_owner(
  const action          : parameter_t;
  const s               : storage_t)
                        : storage_t is
  block {
    require(Tezos.sender = s.owner, Errors.not_owner);
  } with case action of [
    | Set_owner(params)            -> set_owner(params, s)
    | Set_round_submitter(params)  -> set_round_submitter(params, s)
    | Set_round_ttl(params)        -> set_round_ttl(params, s)
    | Toggle_pause_bridge(_)       -> toggle_pause_bridge(s)
    | Toggle_ban_relay(params)     -> toggle_ban_relay(params, s)
    | Update_metadata(params)      -> update_metadata(params, s)
    | _                            -> s
  ]