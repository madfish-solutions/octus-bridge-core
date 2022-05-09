[@view] function validate_message(
  const params          : validate_t;
  const s               : storage_t)
                        : bool is
  block {
    const round = unwrap(s.rounds[params.round], Errors.round_undefined);
    require(round.ttl_round > Tezos.now, Errors.signatures_outdated);
    require(Map.size(params.signatures) >= round.validate_quorum, Errors.not_enough_signatures);

    var valid_signatures := 0n;
    for pk -> sign in map params.signatures {
      if round.relays_keys contains pk and
         Crypto.check(pk, sign, params.payload)
      then valid_signatures := valid_signatures + 1n
      else skip;
    }
  } with valid_signatures >= round.validate_quorum
