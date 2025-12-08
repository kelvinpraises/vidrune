#[allow(duplicate_alias)]
module vidrune::points {
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::{TxContext};

    /// Global points registry (singleton, shared)
    public struct PointsRegistry has key {
        id: UID,
        /// Mapping: user address => points
        points: Table<address, u64>,
    }

    /// Initialize global points registry (called once on publish)
    fun init(ctx: &mut TxContext) {
        let registry = PointsRegistry {
            id: object::new(ctx),
            points: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Award points to a user
    public fun award_points(registry: &mut PointsRegistry, user: address, amount: u64) {
        if (table::contains(&registry.points, user)) {
            let current = table::borrow_mut(&mut registry.points, user);
            *current = *current + amount;
        } else {
            table::add(&mut registry.points, user, amount);
        }
    }

    /// Get user's points (returns 0 if user not found)
    public fun get_points(registry: &PointsRegistry, user: address): u64 {
        if (table::contains(&registry.points, user)) {
            *table::borrow(&registry.points, user)
        } else {
            0
        }
    }

    /// Check if user has points record
    public fun has_points(registry: &PointsRegistry, user: address): bool {
        table::contains(&registry.points, user)
    }
}
