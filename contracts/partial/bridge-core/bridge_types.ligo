type round_t     			  is [@layout:comb]record[
	end_time         				: timestamp;
	ttl_round        				: timestamp;
	relays_keys      				: set(key);
	validate_quorum  				: nat;
]

type storage_t   				is [@layout:comb]record[
	owner           				: address;
	pending_owner           : option(address);
	round_submitter 				: address;
  rounds          				: big_map(nat, round_t);
	round_count     				: nat;
	ttl_round       				: nat;
	banned_relays  					: big_map(key, bool);
	paused                  : bool;
	metadata                : metadata_t;
]

type return_t           is list (operation) * storage_t

type force_new_round_t  is [@layout:comb]record[
	end_time         				: timestamp;
	relays_keys      				: set(key);
	validate_quorum  				: nat;
]

type parameter_t        is
| Set_owner               of address
| Confirm_owner           of unit
| Set_round_submitter     of address
| Set_round_ttl           of nat
| Toggle_pause_bridge     of unit
| Toggle_ban_relay        of key
| Update_metadata         of metadata_t
| Force_round_relay       of force_new_round_t