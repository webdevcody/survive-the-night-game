import { Entity } from "@/entities/entity";
import Shape, { Rectangle } from "@/util/shape";
export declare class QuadTree {
    private shapes;
    private capacity;
    private boundary;
    private divided;
    private northeast?;
    private northwest?;
    private southeast?;
    private southwest?;
    constructor(boundary: Rectangle, capacity?: number);
    add(shape: Shape, entity: Entity): boolean;
    private subdivide;
    query(range: Shape, found?: Set<Entity>): Set<Entity>;
    clear(): void;
}
export default QuadTree;
