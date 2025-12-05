// ------------------------------------------------------------
// Main function: place a chest near the bot if not already present
// ------------------------------------------------------------
async function placeChestNearby(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // 1️⃣  Check if a chest block already exists nearby (within 5 blocks)
  const existingChest = bot.findBlock({
    matching: mcData.blocksByName.chest.id,
    maxDistance: 5
  });
  if (existingChest) {
    bot.chat('✅ Chest is already placed nearby.');
    return;
  }

  // 2️⃣  Ensure we have a chest item in inventory
  const chestItem = bot.inventory.findInventoryItem(mcData.itemsByName.chest.id);
  if (!chestItem) {
    bot.chat('❌ I have no chest in my inventory to place.');
    return;
  }

  // Helper: find a suitable air block with at least one solid neighbour
  function findPlacementPosition() {
    const base = bot.entity.position.floored(); // integer block coordinates
    // search a small cube around the bot (including one block above)
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          const pos = base.offset(dx, dy, dz);
          const block = bot.blockAt(pos);
          if (!block || block.name !== 'air') continue; // must be air

          // check neighbours for a solid block (non‑air)
          const neighbours = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
          for (const n of neighbours) {
            const nb = bot.blockAt(pos.plus(n));
            if (nb && nb.name !== 'air') return pos;
          }
        }
      }
    }
    return null; // none found
  }

  // 3️⃣  Try to locate a placement position
  let placePos = findPlacementPosition();

  // 4️⃣  If not found, move a bit in a random horizontal direction and try again
  if (!placePos) {
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    bot.chat('🔎 No suitable spot nearby, moving a bit to look for space...');
    await exploreUntil(bot, randomDir, 60, () => null); // just walk a bit
    placePos = findPlacementPosition();
  }
  if (!placePos) {
    bot.chat('❌ Could not find a place to put the chest.');
    return;
  }

  // 5️⃣  Place the chest
  bot.chat(`📦 Placing chest at ${placePos.x}, ${placePos.y}, ${placePos.z}...`);
  try {
    await placeItem(bot, 'chest', placePos);
  } catch (err) {
    bot.chat(`❌ Failed to place chest: ${err.message}`);
    return;
  }

  // 6️⃣  Verify placement
  const placedChest = bot.blockAt(placePos);
  if (placedChest && placedChest.name === 'chest') {
    bot.chat('✅ Chest placed successfully!');
  } else {
    bot.chat('⚠️ Chest placement attempted but block not detected.');
  }
}