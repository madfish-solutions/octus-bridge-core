[@view] function validate_message(
  const params          : validate_t;
  const s               : storage_t)
                        : bool is
  block {
    var payload : option(payload_t) := Bytes.unpack(params.payload);
    payload := unwrap(payload, Errors.invalid_payload);

    const round = unwrap(s.rounds[payload.round], Errors.round_undefined);
    require(round.ttl > Tezos.now, Errors.signatures_outdated);
    require(Map.size(params.signatures) >= round.required_signatures, Errors.not_enough_signatures);

    var valid_signatures := 0n;
    for pk -> sign in map params.signatures {
      if round.relays contains pk and
        Crypto.check(pk, sign, params.payload)
      then valid_signatures := valid_signatures + 1n
      else skip;
    }
  } with valid_signatures >= round.required_signatures
