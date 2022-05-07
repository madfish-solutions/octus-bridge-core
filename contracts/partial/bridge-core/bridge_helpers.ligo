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
