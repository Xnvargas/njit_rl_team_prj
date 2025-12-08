// ------------------------------------------------------------
// Helper functions (local to this file)
// ------------------------------------------------------------
async function countItem(bot, name) {
  const mcData = require('minecraft-data')(bot.version);
  const itemInfo = mcData.itemsByName[name];
  if (!itemInfo) return 0;
  const invItem = bot.inventory.findInventoryItem(itemInfo.id);
  return invItem ? invItem.count : 0;
}

// Find the iron pickaxe in the inventory

// Find the iron pickaxe in the inventory
function getIronPickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const pickaxeInfo = mcData.itemsByName['iron_pickaxe'];
  return bot.inventory.findInventoryItem(pickaxeInfo.id);
}

// Return a random direction vector where each component is -1, 0 or 1 (not all zero)

// Return a random direction vector where each component is -1, 0 or 1 (not all zero)
function randomDirection() {
  const dirs = [-1, 0, 1];
  let vec;
  do {
    vec = new (require('vec3').Vec3)(dirs[Math.floor(Math.random() * dirs.length)], 0, dirs[Math.floor(Math.random() * dirs.length)]);
  } while (vec.x === 0 && vec.z === 0);
  return vec;
}

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
async function mineFiveGoldOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // 1) Ensure we have an iron pickaxe
  const ironPickaxe = getIronPickaxe(bot);
  if (!ironPickaxe) {
    await bot.chat('❌ I do not have an iron pickaxe, cannot mine gold ore.');
    return;
  }

  // 2) Equip the iron pickaxe
  await bot.equip(ironPickaxe, 'hand');
  await bot.chat('✅ Iron pickaxe equipped.');

  // 3) Mine until we have 5 gold ore blocks
  const TARGET = 5;
  let attempts = 0;
  const MAX_ATTEMPTS = 5; // safety guard

  while ((await countItem(bot, 'gold_ore')) < TARGET && attempts < MAX_ATTEMPTS) {
    attempts++;

    // Try to find a gold ore block nearby
    let goldBlock = bot.findBlock({
      matching: mcData.blocksByName['gold_ore'].id,
      maxDistance: 32
    });

    // If none found, explore in a random direction until we see one
    if (!goldBlock) {
      const dir = randomDirection();
      await bot.chat(`🔎 Exploring for gold ore (attempt ${attempts})...`);
      goldBlock = await exploreUntil(bot, dir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName['gold_ore'].id,
          maxDistance: 32
        });
      });
    }

    // After exploration, if we still have no gold ore, give up this attempt
    if (!goldBlock) {
      await bot.chat('❌ Could not locate any gold ore this round.');
      continue;
    }

    // Determine how many more we need
    const have = await countItem(bot, 'gold_ore');
    const need = TARGET - have;

    // Mine the required amount (mineBlock will collect up to `need` blocks)
    await bot.chat(`⛏️ Mining ${need} gold ore block(s)...`);
    await mineBlock(bot, 'gold_ore', need);

    // Small pause for inventory to update
    await bot.waitForTicks(10);
  }

  // 4) Final verification
  const finalCount = await countItem(bot, 'gold_ore');
  if (finalCount >= TARGET) {
    await bot.chat(`✅ Success! I now have ${finalCount} gold ore blocks.`);
  } else {
    await bot.chat(`❌ Failed to collect ${TARGET} gold ore. I only have ${finalCount}.`);
  }
}