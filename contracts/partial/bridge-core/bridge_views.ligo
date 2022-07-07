[@view] function validate_message(
  const params          : validate_t;
  const s               : storage_t)
                        : message_status_t is
  check_message(params, s.rounds, s.last_round, s.banned_relays, s.paused)

[@view] function is_banned(
  const relay_key       : key;
  const s               : storage_t)
                        : bool is
  unwrap_or(s.banned_relays[relay_key], False)

[@view] function is_relay(
  const params          : is_relay_t;
  const s               : storage_t)
                        : bool is
  case s.rounds[params.round] of [
  | Some(round) -> round.relays contains params.relay_key
  | None -> False
  ]

[@view] function is_round_rotten(
  const round_id        : nat;
  const s               : storage_t)
                        : bool is
  case s.rounds[round_id] of [
  | Some(round) -> Tezos.get_now() > round.ttl
  | None -> True
  ]

[@view] function decode_everscale_event(
  const payload         : bytes;
  const _s              : storage_t)
                        : payload_t is
  case (Bytes.unpack(payload) : option(payload_t)) of [
  | None -> failwith(Errors.invalid_payload)
  | Some(decoded_payload) -> decoded_payload
  ]

[@view] function decode_round_relays_event_data(
  const payload         : bytes;
  const s               : storage_t)
                        : decoded_round_relays_event_data_t is
  block {
    const decoded_payload = unwrap((Bytes.unpack(payload) : option(payload_t)), Errors.invalid_payload);
    const round = unwrap(s.rounds[decoded_payload.round], Errors.round_undefined);
  } with record[
      round = decoded_payload.round;
      relays = round.relays;
      round_end = round.end_time;
  ]