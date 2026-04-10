/**
 * EXPLORE state handler - wander around
 */
export class ExploreStateHandler {
    handle(input, playerPos, context) {
        context.moveTowardWaypoint(input, playerPos);
        // Walk, don't sprint while exploring
    }
}
