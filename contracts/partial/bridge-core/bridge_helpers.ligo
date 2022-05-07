function calculate_signatures(
  const params         : validate_t;
  const relays         : set(key);
  const banned_relays  : big_map(key, bool))
                       : nat is
  block {
    var valid_signatures := 0n;
    for pk -> sign in map params.signatures {
      if not unwrap_or(banned_relays[pk], False)
      then if relays contains pk and
          Crypto.check(pk, sign, params.payload)
        then valid_signatures := valid_signatures + 1n
        else skip;
    }
  } with valid_signatures

function is_message_valid(
  const params          : message_t)
                        : unit is
  case unwrap(
    (Tezos.call_view("validate_message", params, Tezos.self_address) : option(message_status_t)),
    Errors.validate_message_404
    ) of [
  | Round_greater_last_round      -> failwith(Errors.round_greater_last_round)
  | Round_less_initial_round      -> failwith(Errors.round_less_initial_round)
  | Not_enough_correct_signatures -> failwith(Errors.not_enough_signatures)
  | Round_outdated                -> failwith(Errors.round_outdated)
  | Bridge_paused                 -> failwith(Errors.bridge_paused)
  | Invalid_payload               -> failwith(Errors.invalid_payload)
  | Message_valid                 -> unit
  ]