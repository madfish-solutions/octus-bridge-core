[@view] function validate_message(
  const params          : validate_t;
  const s               : storage_t)
                        : message_status_t is
  if s.paused
  then Bridge_paused(unit)
  else case (Bytes.unpack(params.payload) : option(payload_t)) of [
    | None -> Invalid_payload(unit)
    | Some(payload) ->
      case s.rounds[payload.round] of [
      | None ->
        if payload.round > abs(s.round_count - 1n)
        then Round_greater_last_round(unit)
        else Round_less_initial_round(unit)
      | Some(round) ->
        if round.ttl < Tezos.now
        then Round_outdated(unit)
        else if Map.size(params.signatures) < round.required_signatures
          then Not_enough_correct_signatures(unit)
          else block {
            var valid_signatures := 0n;
            for pk -> sign in map params.signatures {
              if not unwrap_or(s.banned_relays[pk], False)
              then if round.relays contains pk and
                  Crypto.check(pk, sign, params.payload)
                then valid_signatures := valid_signatures + 1n
                else skip;
            }
          } with if valid_signatures < round.required_signatures
              then Not_enough_correct_signatures(unit)
              else Message_valid(unit)
        ]
    ]

