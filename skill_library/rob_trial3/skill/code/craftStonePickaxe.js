// -----------------------------------------------------------------------------
// Helper: pick a random direction vector with components -1, 0, or 1 (not all 0)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// Helper: find a free spot (air block) above a solid block within radius r

// Helper: find a free spot (air block) above a solid block within radius r
async function findFreePlacementSpot(bot, radius = 3) {
  const botPos = bot.entity.position.floored();
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const solidPos = botPos.offset(dx, dy, dz);
        const solidBlock = bot.blockAt(solidPos);
        if (!solidBlock || solidBlock.name === "air") continue; // need solid
        const abovePos = solidPos.offset(0, 1, 0);
        const aboveBlock = bot.blockAt(abovePos);
        if (aboveBlock && aboveBlock.name === "air") {
          // also ensure the block above the air is not a non‑replaceable block (e.g., water)
          const aboveAbove = bot.blockAt(abovePos.offset(0, 1, 0));
          if (aboveAbove && aboveAbove.name !== "air") {
            // still fine – we only need the placement block to be air
          }
          return abovePos; // suitable spot
        }
      }
    }
  }
  return null; // none found
}

// -----------------------------------------------------------------------------
// Main function: craft a stone pickaxe

// -----------------------------------------------------------------------------
// Main function: craft a stone pickaxe
async function craftStonePickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // 1️⃣ Already have a stone pickaxe?
  const stonePickaxeId = mcData.itemsByName["stone_pickaxe"].id;
  if (bot.inventory.findInventoryItem(stonePickaxeId)) {
    await bot.chat("I already have a stone pickaxe.");
    return;
  }

  // 2️⃣ Ensure required materials ------------------------------------------------
  const cobId = mcData.itemsByName["cobblestone"].id;
  const stickId = mcData.itemsByName["stick"].id;

  // --- Cobblestone (need 3) ----------------------------------------------------
  let cobCount = bot.inventory.count(cobId);
  if (cobCount < 3) {
    const need = 3 - cobCount;
    await bot.chat(`Need ${need} more cobblestone. Mining stone...`);
    await mineBlock(bot, "stone", need);
    cobCount = bot.inventory.count(cobId);
  } else {
    await bot.chat(`Cobblestone OK: ${cobCount}/3`);
  }

  // --- Sticks (need 2) ---------------------------------------------------------
  let stickCount = bot.inventory.count(stickId);
  if (stickCount < 2) {
    const needSticks = 2 - stickCount;
    // each stick craft yields 4 sticks, consumes 2 planks
    const craftTimes = Math.ceil(needSticks / 4);
    const planksNeeded = craftTimes * 2;

    // ensure we have enough planks
    const plankId = mcData.itemsByName["oak_planks"].id;
    let plankCount = bot.inventory.count(plankId);
    if (plankCount < planksNeeded) {
      const missingPlanks = planksNeeded - plankCount;
      const logsNeeded = Math.ceil(missingPlanks / 4); // 1 log → 4 planks
      await bot.chat(`Need ${missingPlanks} planks → mining ${logsNeeded} oak log(s)...`);
      await mineBlock(bot, "oak_log", logsNeeded);
      await bot.chat(`Crafting ${logsNeeded} oak plank batch(es)...`);
      await craftItem(bot, "oak_planks", logsNeeded);
    }

    // ensure a crafting table is placed before crafting sticks
    await ensureCraftingTablePlaced(bot);
    await bot.chat(`Crafting ${needSticks} stick(s) (${craftTimes} craft operation(s))...`);
    await craftItem(bot, "stick", craftTimes);
    stickCount = bot.inventory.count(stickId);
  } else {
    await bot.chat(`Sticks OK: ${stickCount}/2`);
  }

  // 3️⃣ Ensure a placed crafting table ------------------------------------------------
  async function ensureCraftingTablePlaced(bot) {
    // Look for an already placed table
    const placed = bot.findBlock({
      matching: mcData.blocksByName["crafting_table"].id,
      maxDistance: 32
    });
    if (placed) {
      await bot.chat("Found a placed crafting table nearby.");
      await bot.pathfinder.goto(new GoalNear(placed.position.x, placed.position.y, placed.position.z, 1));
      return;
    }

    // No placed table – need to place one from inventory
    await bot.chat("Placing a crafting table...");

    // Find a free spot near the bot
    let placePos = await findFreePlacementSpot(bot, 3);
    // If not found, explore a bit and try again
    while (!placePos) {
      await bot.chat("No free spot nearby, exploring for a place...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(bot, 3);
        return p ? true : null;
      });
      if (found) placePos = findFreePlacementSpot(bot, 3);else break;
    }
    if (!placePos) {
      throw new Error("Could not find a free position to place a crafting table.");
    }

    // Place the table
    await placeItem(bot, "crafting_table", placePos);
    // Walk next to it
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    await bot.chat(`Crafting table placed at ${placePos}`);
  }
  await ensureCraftingTablePlaced(bot);

  // 4️⃣ Craft the stone pickaxe -------------------------------------------------
  await bot.chat("Crafting stone pickaxe...");
  await craftItem(bot, "stone_pickaxe", 1);
  await bot.chat("Stone pickaxe crafted!");

  // 5️⃣ Final verification ----------------------------------------------------
  if (bot.inventory.findInventoryItem(stonePickaxeId)) {
    await bot.chat("✅ I now have a stone pickaxe.");
  } else {
    await bot.chat("❌ Failed to craft the stone pickaxe.");
  }
}