/**

 * Short gameplay hints shown on the respawn overlay when there are no level rewards to pick.
 * Mix of HowToPlay / tutorial alignment plus mechanics from GameConfig + updateGame + RewardManager,

 */

export const RESPAWN_TIPS: readonly string[] = [
    'You only earn xp when you are near an enemy that dies.',
    'An enemy inside your attack radius is auto-attacked - stay in range to keep dealing damage.',
    'You can choose a class when you reach level 3.',
    'Last hit on a minion or hero grants bonus xp on top of your usual share.',
    'If you damaged an enemy shortly before it dies, you still get kill xp even when you are out of xp range.',
    'Killing a much higher-level hero pays bonus catch-up xp to everyone who gets credit.',
    'Each level-up boosts your stats, raises max health, and heals you by that health gain (up to the new max).',
    'After a few seconds without taking damage, you slowly heal a percentage of your max health.',
    'Logan goes \"meow meow meow\".',
    'Hold your attack button to aim your Class Ability before releasing to fire.',
    'Hold \'Tab\' to see some stats about the match!',
    'Hold \'Shift\' to open a Damage Summary.',
    'Right-click toggles mouse-follow; WASD or right-click again to disable.',
    'Low on health? Backing off to heal is often better than dying again.',


    // Class-specific tips
    'The Thorndive\'s ability does not reflect damage from other abilities.',
    'For a short time after landing, the Thorndive gains extra armor.',
    'When in rage, the Mercenary\'s auto-attack radius shrinks sharply and only hits enemy heroes — not minions or structures.',
    'The Hookshot\'s hook can pass through allies, but an enemy structure will intercept the hook.',
    'The Pyromancer\'s zone damage and \'Burn\' both scale with Ability Power.',
    'The recoil from a Sniper\'s shot can create distance or help reposition.',

];


