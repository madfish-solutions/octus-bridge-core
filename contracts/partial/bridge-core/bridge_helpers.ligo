function calculate_signatures(
  const params         : validate_t;
  const relays         : set(key);
  const banned_relays  : big_map(key, bool))
                       : nat is
  block {
    var valid_signatures := 0n;
    for pk -> sign in map params.signatures {
      if not unwrap_or(banned_relays[pk], False)
        and relays contains pk
        and Crypto.check(pk, sign, params.payload)
        then valid_signatures := valid_signatures + 1n
        else skip;
    }
  } with valid_signatures

function check_message(
  const params          : validate_t;
  const rounds          : rounds_t;
  const last_round      : nat;
  const banned_relays   : banned_relays_t;
  const paused          : bool)
                        : message_status_t is
  if paused
  then Bridge_paused(unit)
  else
    case (Bytes.unpack(params.payload) : option(payload_t)) of [
    | None -> Invalid_payload(unit)
    | Some(payload) ->
      case rounds[payload.round] of [
      | None ->
        if payload.round > last_round
        then Round_greater_last_round(unit)
        else Round_less_initial_round(unit)
      | Some(round) ->
        if round.ttl < Tezos.get_now()
        then Round_outdated(unit)
        else
            if calculate_signatures(params, round.relays, banned_relays) < round.required_signatures
            then Not_enough_correct_signatures(unit)
            else Message_valid(unit)
        ]
    ]

function is_message_valid(
  const params          : message_t;
  const rounds          : rounds_t;
  const last_round      : nat;
  const banned_relays   : banned_relays_t;
  const paused          : bool)
                        : unit is
  case check_message(params, rounds, last_round, banned_relays, paused) of [
  | Round_greater_last_round      -> failwith(Errors.round_greater_last_round)
  | Round_less_initial_round      -> failwith(Errors.round_less_initial_round)
  | Not_enough_correct_signatures -> failwith(Errors.not_enough_signatures)
  | Round_outdated                -> failwith(Errors.round_outdated)
  | Bridge_paused                 -> failwith(Errors.bridge_paused)
  | Invalid_payload               -> failwith(Errors.invalid_payload)
  | Message_valid                 -> unit
  ]

function cache(
  const payload        : bytes;
  var payload_cache    : cache_t)
                       : cache_t is
  block {
    const payload_hash : bytes = Crypto.keccak(payload);
    require(not(unwrap_or(payload_cache[payload_hash], False)), Errors.payload_already_seen);
    payload_cache[payload_hash] := True
  } with payload_cache