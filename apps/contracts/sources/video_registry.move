#[allow(duplicate_alias, unused_const)]
module vidrune::video_registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use std::string::String;
    use vidrune::points::{Self, PointsRegistry};

    // Constants
    const CONVICTION_PERIOD_MS: u64 = 900000; // 15 minutes
    const POINTS_PER_INDEX: u64 = 10; // Points awarded per successful index

    // Video status enum values
    const STATUS_PENDING: u8 = 0;
    const STATUS_ACTIVE_MARKET: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;

    /// Video index metadata (shared object)
    public struct VideoIndex has key, store {
        id: UID,
        walrus_blob_id: String,          // Walrus storage ID for video
        manifest_blob_id: String,         // Walrus storage ID for manifest.json
        indexer: address,                 // Who uploaded it
        upload_time: u64,                 // Timestamp in ms
        conviction_period_end: u64,       // upload_time + 30 minutes
        status: u8,                       // 0=pending, 1=active_market, 2=resolved
    }

    /// Registry object (singleton, shared)
    public struct VideoRegistry has key {
        id: UID,
        video_count: u64,
    }

    /// One-time witness for module initialization
    public struct VIDEO_REGISTRY has drop {}

    // ======== Initialization ========

    /// Initialize registry (called once on publish)
    fun init(_witness: VIDEO_REGISTRY, ctx: &mut TxContext) {
        let registry = VideoRegistry {
            id: object::new(ctx),
            video_count: 0,
        };
        transfer::share_object(registry);
    }

    // ======== Public Entry Functions ========

    /// Submit a new video index
    public fun submit_video(
        registry: &mut VideoRegistry,
        points_registry: &mut PointsRegistry,
        walrus_blob_id: String,
        manifest_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let indexer = tx_context::sender(ctx);
        let upload_time = clock::timestamp_ms(clock);

        let video = VideoIndex {
            id: object::new(ctx),
            walrus_blob_id,
            manifest_blob_id,
            indexer,
            upload_time,
            conviction_period_end: upload_time + CONVICTION_PERIOD_MS,
            status: STATUS_PENDING,
        };

        // Award points to indexer
        points::award_points(points_registry, indexer, POINTS_PER_INDEX);

        registry.video_count = registry.video_count + 1;
        transfer::share_object(video);
    }

    /// Update video status (callable by market contract)
    public fun update_status(
        video: &mut VideoIndex,
        new_status: u8,
        _ctx: &mut TxContext
    ) {
        // TODO: Add authorization check (only prediction_market module can call)
        video.status = new_status;
    }

    // ======== Query Functions ========

    /// Get video status
    public fun get_status(video: &VideoIndex): u8 {
        video.status
    }

    /// Get video indexer
    public fun get_indexer(video: &VideoIndex): address {
        video.indexer
    }

    /// Get video upload time
    public fun get_upload_time(video: &VideoIndex): u64 {
        video.upload_time
    }

    /// Get conviction period end time
    public fun get_conviction_period_end(video: &VideoIndex): u64 {
        video.conviction_period_end
    }

    /// Get Walrus blob IDs
    public fun get_walrus_blob_id(video: &VideoIndex): String {
        video.walrus_blob_id
    }

    public fun get_manifest_blob_id(video: &VideoIndex): String {
        video.manifest_blob_id
    }

    /// Get total video count
    public fun get_video_count(registry: &VideoRegistry): u64 {
        registry.video_count
    }

    /// Check if conviction period is active
    public fun is_conviction_period_active(video: &VideoIndex, clock: &Clock): bool {
        let now = clock::timestamp_ms(clock);
        now < video.conviction_period_end && video.status == STATUS_PENDING
    }
}
