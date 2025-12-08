// Helper: pick a random direction vector (components -1,0,1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// Helper: ensure a placed crafting table is nearby

// Helper: ensure a placed crafting table is nearby
async function ensurePlacedCraftingTable(bot) {
  const tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (tableBlock) {
    await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));
    await bot.chat("Found a placed crafting table.");
    return;
  }

  // No placed table – place one from inventory
  await bot.chat("Placing a crafting table...");
  // Find a free air block above a solid block within radius 3
  const freePos = await findFreePlacementSpot(bot, 3);
  if (!freePos) throw new Error("No place to put a crafting table.");
  await placeItem(bot, "crafting_table", freePos);
  await bot.pathfinder.goto(new GoalNear(freePos.x, freePos.y, freePos.z, 1));
  await bot.chat(`Crafting table placed at ${freePos}`);
}

// Helper: ensure we have at least `count` cobblestone, mining stone if needed

// Helper: ensure we have at least `count` cobblestone, mining stone if needed
async function ensureCobblestone(bot, count) {
  const cobId = mcData.itemsByName.cobblestone.id;
  let have = bot.inventory.count(cobId);
  if (have >= count) {
    await bot.chat(`Cobblestone OK: ${have}/${count}`);
    return;
  }
  const need = count - have;
  await bot.chat(`Need ${need} more cobblestone, mining stone...`);
  await mineBlock(bot, "stone", need);
  await bot.chat(`Mined ${need} stone → cobblestone.`);
}

// Helper: ensure a furnace is placed (crafts it if necessary)

// Helper: ensure a furnace is placed (crafts it if necessary)
async function ensurePlacedFurnace(bot) {
  const furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (furnaceBlock) {
    await bot.pathfinder.goto(new GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 1));
    await bot.chat("Found a placed furnace.");
    return furnaceBlock;
  }

  // Need to craft a furnace
  await bot.chat("Crafting a furnace...");
  // Ensure we have 8 cobblestone
  await ensureCobblestone(bot, 8);
  // Ensure crafting table is placed (required for crafting)
  await ensurePlacedCraftingTable(bot);
  // Craft furnace (1)
  await craftItem(bot, "furnace", 1);
  await bot.chat("Furnace crafted.");

  // Place the furnace
  const placePos = await findFreePlacementSpot(bot, 3);
  if (!placePos) throw new Error("No free spot to place furnace.");
  await placeItem(bot, "furnace", placePos);
  await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
  await bot.chat(`Furnace placed at ${placePos}`);
  return bot.blockAt(placePos);
}

// Helper: ensure we have enough oak planks for fuel (1 plank per smelt)

// Helper: ensure we have enough oak planks for fuel (1 plank per smelt)
async function ensureFuelPlanks(bot, needed) {
  const plankId = mcData.itemsByName.oak_planks.id;
  let have = bot.inventory.count(plankId);
  if (have >= needed) {
    await bot.chat(`Fuel planks OK: ${have}/${needed}`);
    return;
  }
  const missing = needed - have;
  await bot.chat(`Need ${missing} more oak planks for fuel.`);
  // Ensure we have enough logs
  const logId = mcData.itemsByName.oak_log.id;
  let logs = bot.inventory.count(logId);
  const logsNeeded = Math.ceil(missing / 4); // 1 log → 4 planks
  if (logs < logsNeeded) {
    const toMine = logsNeeded - logs;
    await bot.chat(`Mining ${toMine} oak log(s) for planks...`);
    await mineBlock(bot, "oak_log", toMine);
  }
  // Craft the missing planks
  const craftTimes = Math.ceil(missing / 4);
  await ensurePlacedCraftingTable(bot);
  await bot.chat(`Crafting ${missing} oak planks (${craftTimes} batch(es))...`);
  await craftItem(bot, "oak_planks", craftTimes);
}

// Main function

// Main function
async function mineThreeCopperOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  await bot.chat("=== Starting task: mine 3 copper ore ===");

  // 1) Ensure we have a stone pickaxe (required for copper)
  const stonePickId = mcData.itemsByName.stone_pickaxe.id;
  if (!bot.inventory.findInventoryItem(stonePickId)) {
    await bot.chat("No stone pickaxe – cannot mine copper. Task aborted.");
    return;
  }

  // 2) Ensure a furnace exists for later smelting
  const furnaceBlock = await ensurePlacedFurnace(bot);

  // 3) Locate copper ore; explore if not nearby
  let copperBlock = bot.findBlock({
    matching: mcData.blocksByName.copper_ore.id,
    maxDistance: 32
  });
  if (!copperBlock) {
    await bot.chat("Copper ore not nearby, exploring...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.copper_ore.id,
        maxDistance: 32
      });
      return blk ? true : null;
    });
    if (!found) {
      await bot.chat("❌ Could not find copper ore after exploring.");
      return;
    }
    copperBlock = bot.findBlock({
      matching: mcData.blocksByName.copper_ore.id,
      maxDistance: 32
    });
  }
  await bot.chat("Copper ore located, beginning mining...");

  // 4) Mine three copper ore blocks
  await mineBlock(bot, "copper_ore", 3);
  await bot.chat("Mined 3 copper ore blocks.");

  // 5) Ensure we have enough fuel (oak planks) for smelting 3 raw copper
  await ensureFuelPlanks(bot, 3);

  // 6) Smelt the raw copper into copper ingots
  await bot.chat("Smelting raw copper into copper ingots...");
  await smeltItem(bot, "raw_copper", "oak_planks", 3);
  await bot.chat("Smelting complete.");

  // 7) Final verification
  const copperIngotId = mcData.itemsByName.copper_ingot.id;
  const ingotCount = bot.inventory.count(copperIngotId);
  if (ingotCount >= 3) {
    await bot.chat(`✅ Task finished: ${ingotCount} copper ingot(s) in inventory.`);
  } else {
    await bot.chat(`❌ Task finished but only ${ingotCount} copper ingot(s) obtained.`);
  }
}