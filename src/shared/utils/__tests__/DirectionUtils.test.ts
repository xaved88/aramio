import { calculateDirectionFromVector } from '../DirectionUtils';

describe('DirectionUtils', () => {
    describe('calculateDirectionFromVector', () => {
        it('should return 0 degrees for upward movement', () => {
            const direction = calculateDirectionFromVector(0, -1);
            expect(direction).toBeCloseTo(0, 5);
        });

        it('should return 90 degrees for rightward movement', () => {
            const direction = calculateDirectionFromVector(1, 0);
            expect(direction).toBeCloseTo(90, 5);
        });

        it('should return 180 degrees for downward movement', () => {
            const direction = calculateDirectionFromVector(0, 1);
            expect(direction).toBeCloseTo(180, 5);
        });

        it('should return 270 degrees for leftward movement', () => {
            const direction = calculateDirectionFromVector(-1, 0);
            expect(direction).toBeCloseTo(270, 5);
        });

        it('should return 45 degrees for diagonal up-right movement', () => {
            const direction = calculateDirectionFromVector(1, -1);
            expect(direction).toBeCloseTo(45, 5);
        });

        it('should return 135 degrees for diagonal down-right movement', () => {
            const direction = calculateDirectionFromVector(1, 1);
            expect(direction).toBeCloseTo(135, 5);
        });

        it('should return 225 degrees for diagonal down-left movement', () => {
            const direction = calculateDirectionFromVector(-1, 1);
            expect(direction).toBeCloseTo(225, 5);
        });

        it('should return 315 degrees for diagonal up-left movement', () => {
            const direction = calculateDirectionFromVector(-1, -1);
            expect(direction).toBeCloseTo(315, 5);
        });

        it('should handle different magnitudes correctly', () => {
            // Direction should be the same regardless of vector magnitude
            const direction1 = calculateDirectionFromVector(2, 0);
            const direction2 = calculateDirectionFromVector(10, 0);
            expect(direction1).toBeCloseTo(direction2, 5);
        });
    });
});

