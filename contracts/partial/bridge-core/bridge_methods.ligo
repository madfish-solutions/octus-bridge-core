function set_round_relays(
  const params          : message_t;
  var s                 : storage_t)
                        : return_t is
  block {
    is_message_valid(params, s.rounds, s.last_round, s.banned_relays, s.paused);
    s.cache := cache(params.payload, s.cache);

    const payload = unwrap((Bytes.unpack(params.payload) : option(payload_t)), Errors.invalid_payload);
    require(
      s.configuration_address = payload.configuration_address and
      s.configuration_wid = payload.configuration_wid,
      Errors.wrong_event_configuration);

    const new_round = unwrap((Bytes.unpack(payload.event_data) : option(new_round_t)), Errors.invalid_new_round);
    require(new_round.round = s.last_round + 1n, Errors.wrong_round);

    const new_round = record[
        end_time = new_round.end_time;
        ttl      = new_round.end_time + int(s.ttl);
        relays   = new_round.relays;
        required_signatures = s.required_signatures;
    ];
    s.last_round := s.last_round + 1n;
    s.rounds[s.last_round] := new_round;

  } with (Constants.no_operations, s)
