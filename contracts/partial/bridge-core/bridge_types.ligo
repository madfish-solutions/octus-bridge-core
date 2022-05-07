type round_t     			  is [@layout:comb] record[
	end_time         				: timestamp;
	ttl        			      	: timestamp;
	relays      				    : set(key);
	required_signatures  	  : nat;
]

type storage_t   				is [@layout:comb] record[
	owner           				: address;
	pending_owner           : option(address);
	round_submitter 				: address;
  rounds          				: big_map(nat, round_t);
	round_count     				: nat;
	initial_round           : nat;
	ttl             				: nat;
	banned_relays  					: big_map(key, bool);
	paused                  : bool;
	metadata                : metadata_t;
]

type return_t           is list (operation) * storage_t

type force_new_round_t  is [@layout:comb] record[
	end_time         				: timestamp;
	relays      				    : set(key);
	required_signatures  		: nat;
]

type signatures_t       is map(key, signature)

type validate_t         is [@layout:comb] record[
	payload         				: bytes;
	signatures              : signatures_t;
]