function set_round_relays(
  const params          : message_t;
  var s                 : storage_t)
                        : return_t is
  block {
    is_message_valid(params, s.rounds, s.round_count, s.banned_relays, s.paused);

    const payload = unwrap((Bytes.unpack(params.payload) : option(payload_t)), Errors.invalid_payload);
    require(
      s.configuration_address = payload.configuration_address and
      s.configuration_wid = payload.configuration_wid,
      Errors.wrong_event_configuration);
    const new_round = unwrap((Bytes.unpack(payload.event_data) : option(new_round_t)), Errors.invalid_new_round);

    const new_round = record[
        end_time = new_round.end_time;
        ttl      = new_round.end_time + int(s.ttl);
        relays   = new_round.relays;
        required_signatures = s.required_signatures;
    ];
    s.rounds[s.round_count] := new_round;
    s.round_count := s.round_count + 1n;

  } with (Constants.no_operations, s)
