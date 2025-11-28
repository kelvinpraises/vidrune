#[allow(duplicate_alias)]
module vidrune::prediction_market {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::vec_set::{Self, VecSet};
    use std::string::String;
    use std::option::{Self, Option};
    use vidrune::points::{Self, PointsRegistry};

    // Constants
    const MARKET_DURATION_MS: u64 = 2700000; // 45 minutes
    const POINTS_PER_CORRECT_VOTE: u64 = 5; // Points for voting on winning side

    // Error codes
    const E_MARKET_RESOLVED: u64 = 3001;
    const E_ALREADY_VOTED: u64 = 3002;
    const E_MARKET_NOT_ENDED: u64 = 3003;
    const E_ALREADY_RESOLVED: u64 = 3004;

    /// Simple YES/NO market (shared object)
    public struct PredictionMarket has key {
        id: UID,
        video_id: ID,
        conviction_ids: vector<ID>,       // Convictions that seeded this market
        question: String,                 // e.g., "Are tags incomplete?"

        // Simple vote tracking (no money)
        yes_voters: VecSet<address>,      // Set of addresses who voted YES
        no_voters: VecSet<address>,       // Set of addresses who voted NO
        yes_count: u64,
        no_count: u64,

        // Market lifecycle
        created_at: u64,
        end_time: u64,                    // 48 hours from creation
        resolved: bool,
        winning_side: Option<bool>,       // Some(true)=YES wins, Some(false)=NO wins
    }

    /// Market registry
    public struct MarketRegistry has key {
        id: UID,
        market_count: u64,
    }

    /// One-time witness for module initialization
    public struct PREDICTION_MARKET has drop {}

    // ======== Initialization ========

    /// Initialize registry
    fun init(_witness: PREDICTION_MARKET, ctx: &mut TxContext) {
        let registry = MarketRegistry {
            id: object::new(ctx),
            market_count: 0,
        };
        transfer::share_object(registry);
    }

    // ======== Public Entry Functions ========

    /// Create market (called by TEE/client after conviction period)
    public fun create_market(
        registry: &mut MarketRegistry,
        video_id: ID,
        conviction_ids: vector<ID>,
        question: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);

        let market = PredictionMarket {
            id: object::new(ctx),
            video_id,
            conviction_ids,
            question,
            yes_voters: vec_set::empty(),
            no_voters: vec_set::empty(),
            yes_count: 0,
            no_count: 0,
            created_at: now,
            end_time: now + MARKET_DURATION_MS,
            resolved: false,
            winning_side: option::none(),
        };

        registry.market_count = registry.market_count + 1;
        transfer::share_object(market);
    }

    /// Vote YES (no cost, points awarded to winners at resolution)
    public fun vote_yes(
        market: &mut PredictionMarket,
        ctx: &mut TxContext
    ) {
        let voter = tx_context::sender(ctx);

        // Validations
        assert!(!market.resolved, E_MARKET_RESOLVED);
        assert!(!vec_set::contains(&market.yes_voters, &voter), E_ALREADY_VOTED);
        assert!(!vec_set::contains(&market.no_voters, &voter), E_ALREADY_VOTED);

        // Record vote
        vec_set::insert(&mut market.yes_voters, voter);
        market.yes_count = market.yes_count + 1;
    }

    /// Vote NO (no cost, points awarded to winners at resolution)
    public fun vote_no(
        market: &mut PredictionMarket,
        ctx: &mut TxContext
    ) {
        let voter = tx_context::sender(ctx);

        // Validations
        assert!(!market.resolved, E_MARKET_RESOLVED);
        assert!(!vec_set::contains(&market.yes_voters, &voter), E_ALREADY_VOTED);
        assert!(!vec_set::contains(&market.no_voters, &voter), E_ALREADY_VOTED);

        // Record vote
        vec_set::insert(&mut market.no_voters, voter);
        market.no_count = market.no_count + 1;
    }

    /// Resolve market (called by TEE or admin)
    public fun resolve_market(
        market: &mut PredictionMarket,
        points_registry: &mut PointsRegistry,
        winning_side: bool, // true=YES, false=NO
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let now = clock::timestamp_ms(clock);

        // Validations
        assert!(!market.resolved, E_ALREADY_RESOLVED);
        assert!(now >= market.end_time, E_MARKET_NOT_ENDED);
        // TODO: Add authorization (only TEE can call)

        market.resolved = true;
        market.winning_side = option::some(winning_side);

        // Award points to winners
        let winners = if (winning_side) {
            vec_set::keys(&market.yes_voters)
        } else {
            vec_set::keys(&market.no_voters)
        };

        // Iterate through winners and award points
        let winner_count = winners.length();
        let mut i = 0;
        while (i < winner_count) {
            let winner = *winners.borrow(i);
            points::award_points(points_registry, winner, POINTS_PER_CORRECT_VOTE);
            i = i + 1;
        };
    }

    // ======== Query Functions ========

    /// Get market question
    public fun get_question(market: &PredictionMarket): String {
        market.question
    }

    /// Get vote counts
    public fun get_vote_counts(market: &PredictionMarket): (u64, u64) {
        (market.yes_count, market.no_count)
    }

    /// Get vote percentages (scaled by 100, e.g., 6543 = 65.43%)
    public fun get_vote_percentages(market: &PredictionMarket): (u64, u64) {
        let total = market.yes_count + market.no_count;
        if (total == 0) {
            return (5000, 5000) // 50/50 if no votes
        };

        let yes_pct = (market.yes_count * 10000) / total;
        let no_pct = 10000 - yes_pct;
        (yes_pct, no_pct)
    }

    /// Check if address has voted
    public fun has_voted(market: &PredictionMarket, user: address): bool {
        vec_set::contains(&market.yes_voters, &user) || vec_set::contains(&market.no_voters, &user)
    }

    /// Get user's vote (if any)
    public fun get_user_vote(market: &PredictionMarket, user: address): Option<bool> {
        if (vec_set::contains(&market.yes_voters, &user)) {
            option::some(true)
        } else if (vec_set::contains(&market.no_voters, &user)) {
            option::some(false)
        } else {
            option::none()
        }
    }

    /// Check if market is resolved
    public fun is_resolved(market: &PredictionMarket): bool {
        market.resolved
    }

    /// Get winning side
    public fun get_winning_side(market: &PredictionMarket): Option<bool> {
        market.winning_side
    }

    /// Get market end time
    public fun get_end_time(market: &PredictionMarket): u64 {
        market.end_time
    }

    /// Get video ID
    public fun get_video_id(market: &PredictionMarket): ID {
        market.video_id
    }

    /// Get total market count
    public fun get_market_count(registry: &MarketRegistry): u64 {
        registry.market_count
    }
}
