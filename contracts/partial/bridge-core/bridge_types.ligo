type round_t            is [@layout:comb] record[
  end_time                : timestamp;
  ttl                     : timestamp;
  relays                  : set(key);
  required_signatures     : nat;
]

type rounds_t           is big_map(nat, round_t)

type banned_relays_t    is big_map(key, bool)

type storage_t          is [@layout:comb] record[
  owner                   : address;
  pending_owner           : option(address);
  round_submitter         : address;
  configuration_wid       : int;
  configuration_address   : nat;
  rounds                  : rounds_t;
  round_count             : nat;
  initial_round           : nat;
  ttl                     : nat;
  required_signatures     : nat;
  banned_relays           : banned_relays_t;
  paused                  : bool;
  metadata                : metadata_t;
]

type return_t           is list (operation) * storage_t

type new_round_t        is [@layout:comb] record[
  end_time                : timestamp;
  relays                  : set(key);
]

type validate_t         is message_t
