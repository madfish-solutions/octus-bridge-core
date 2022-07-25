type round_t            is [@layout:comb] record[
  end_time                : timestamp;
  ttl                     : timestamp;
  relays                  : set(key);
  required_signatures     : nat;
]

type rounds_t           is big_map(nat, round_t)

type banned_relays_t    is big_map(key, bool)

type cache_t            is big_map(bytes, bool)

type storage_t          is [@layout:comb] record[
  owner                   : address;
  pending_owner           : option(address);
  round_submitter         : address;
  configuration_wid       : int;
  configuration_address   : nat;
  rounds                  : rounds_t;
  last_round              : nat;
  initial_round           : nat;
  ttl                     : nat;
  min_required_signatures : nat;
  banned_relays           : banned_relays_t;
  paused                  : bool;
  cache                   : cache_t;
  metadata                : metadata_t;
]

type return_t           is list (operation) * storage_t

type force_round_t      is [@layout:comb] record[
  end_time                : timestamp;
  relays                  : set(key);
]

type new_round_t        is [@layout:comb] record[
  end_time                : timestamp;
  relays                  : set(key);
  round                   : nat;
]

type validate_t         is message_t

type is_relay_t         is [@layout:comb] record[
  round                   : nat;
  relay_key               : key;
]

type decoded_round_relays_event_data_t is [@layout:comb] record[
  round                   : nat;
  relays                  : set(key);
  round_end               : timestamp;
]