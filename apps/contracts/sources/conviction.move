#[allow(duplicate_alias)]
module vidrune::conviction {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use std::string::String;
    use std::option::{Self, Option};
    // Error codes
    const E_EMPTY_PROOF: u64 = 2002;
    const E_CONVICTION_ALREADY_GROUPED: u64 = 2003;

    /// Conviction challenge (shared object)
    public struct Conviction has key, store {
        id: UID,
        video_id: ID,                     // VideoIndex object ID
        challenger: address,
        walrus_blob_id: String,           // Walrus storage for {fact, proof, metadata}
        created_at: u64,                  // Timestamp in ms
        grouped_market_id: Option<ID>,    // Set when market is created
    }

    /// Conviction registry (tracks all convictions)
    public struct ConvictionRegistry has key {
        id: UID,
        conviction_count: u64,
    }

    /// One-time witness for module initialization
    public struct CONVICTION has drop {}

    // ======== Initialization ========

    /// Initialize registry
    fun init(_witness: CONVICTION, ctx: &mut TxContext) {
        let registry = ConvictionRegistry {
            id: object::new(ctx),
            conviction_count: 0,
        };
        transfer::share_object(registry);
    }

    // ======== Public Entry Functions ========

    /// Submit conviction (no stake required in MVP)
    public fun submit_conviction(
        registry: &mut ConvictionRegistry,
        video_id: ID,
        walrus_blob_id: String,  // Points to {fact, proof} JSON on Walrus
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate walrus blob ID is not empty
        assert!(!std::string::is_empty(&walrus_blob_id), E_EMPTY_PROOF);

        let conviction = Conviction {
            id: object::new(ctx),
            video_id,
            challenger: tx_context::sender(ctx),
            walrus_blob_id,
            created_at: clock::timestamp_ms(clock),
            grouped_market_id: option::none(),
        };

        registry.conviction_count = registry.conviction_count + 1;
        transfer::share_object(conviction);
    }

    /// Link conviction to market (called by prediction_market module)
    public fun set_market_id(
        conviction: &mut Conviction,
        market_id: ID,
        _ctx: &mut TxContext
    ) {
        // TODO: Add authorization (only prediction_market module can call)
        assert!(option::is_none(&conviction.grouped_market_id), E_CONVICTION_ALREADY_GROUPED);
        conviction.grouped_market_id = option::some(market_id);
    }

    // ======== Query Functions ========

    /// Get video ID this conviction challenges
    public fun get_video_id(conviction: &Conviction): ID {
        conviction.video_id
    }

    /// Get challenger address
    public fun get_challenger(conviction: &Conviction): address {
        conviction.challenger
    }

    /// Get Walrus blob ID (contains fact + proof)
    public fun get_walrus_blob_id(conviction: &Conviction): String {
        conviction.walrus_blob_id
    }

    /// Get creation timestamp
    public fun get_created_at(conviction: &Conviction): u64 {
        conviction.created_at
    }

    /// Get associated market ID (if grouped)
    public fun get_market_id(conviction: &Conviction): Option<ID> {
        conviction.grouped_market_id
    }

    /// Check if conviction is grouped into a market
    public fun is_grouped(conviction: &Conviction): bool {
        option::is_some(&conviction.grouped_market_id)
    }

    /// Get total conviction count
    public fun get_conviction_count(registry: &ConvictionRegistry): u64 {
        registry.conviction_count
    }
}
