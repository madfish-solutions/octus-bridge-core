[@view] function validate_message(
  const params          : validate_t;
  const s               : storage_t)
                        : message_status_t is
  check_message(params, s.rounds, s.round_count, s.banned_relays, s.paused)