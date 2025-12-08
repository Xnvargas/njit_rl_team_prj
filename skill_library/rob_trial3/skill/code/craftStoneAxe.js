// main function to craft one stone axe
async function craftStoneAxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // Helper: pick a random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // Helper: find a free air spot above a solid block within a radius
  async function findFreePlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const solidPos = botPos.offset(dx, dy, dz);
          const solidBlock = bot.blockAt(solidPos);
          if (!solidBlock || solidBlock.name === "air") continue; // need solid ground
          const abovePos = solidPos.offset(0, 1, 0);
          const aboveBlock = bot.blockAt(abovePos);
          if (aboveBlock && aboveBlock.name === "air") return abovePos;
        }
      }
    }
    return null;
  }

  // 1️⃣ Already have a stone axe?
  const axeId = mcData.itemsByName["stone_axe"].id;
  if (bot.inventory.findInventoryItem(axeId)) {
    await bot.chat("I already have a stone axe.");
    return;
  }

  // 2️⃣ Ensure we have enough cobblestone (≥3) and sticks (≥2)
  const cobId = mcData.itemsByName["cobblestone"].id;
  const stickId = mcData.itemsByName["stick"].id;
  let cobCount = bot.inventory.count(cobId);
  let stickCount = bot.inventory.count(stickId);
  if (cobCount < 3) {
    const need = 3 - cobCount;
    await bot.chat(`Need ${need} more cobblestone, mining stone...`);
    await mineBlock(bot, "stone", need);
    cobCount = bot.inventory.count(cobId);
  } else {
    await bot.chat(`Cobblestone OK: ${cobCount}/3`);
  }
  if (stickCount < 2) {
    const need = 2 - stickCount;
    // each stick craft yields 4 sticks, consumes 2 planks
    const craftTimes = Math.ceil(need / 4);
    const planksNeeded = craftTimes * 2;

    // ensure planks
    const plankId = mcData.itemsByName["oak_planks"].id;
    let plankCount = bot.inventory.count(plankId);
    if (plankCount < planksNeeded) {
      const logsNeeded = Math.ceil((planksNeeded - plankCount) / 4);
      await bot.chat(`Need ${planksNeeded - plankCount} planks, mining ${logsNeeded} oak log(s)...`);
      await mineBlock(bot, "oak_log", logsNeeded);
      await craftItem(bot, "oak_planks", logsNeeded);
    }

    // ensure a crafting table is placed before crafting sticks
    await ensureCraftingTablePlaced();
    await bot.chat(`Crafting ${need} stick(s) (${craftTimes} craft operation(s))...`);
    await craftItem(bot, "stick", craftTimes);
    stickCount = bot.inventory.count(stickId);
  } else {
    await bot.chat(`Sticks OK: ${stickCount}/2`);
  }

  // 3️⃣ Ensure a placed crafting table is nearby
  async function ensureCraftingTablePlaced() {
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
    const tableItemId = mcData.itemsByName["crafting_table"].id;
    if (!bot.inventory.findInventoryItem(tableItemId)) {
      await bot.chat("❌ No crafting table item in inventory, cannot place one.");
      throw new Error("Missing crafting table item");
    }

    // Find a free spot
    let spot = await findFreePlacementSpot(3);
    // If not found, explore a bit and retry
    while (!spot) {
      await bot.chat("No free spot nearby, exploring for a place...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(3);
        return p ? true : null;
      });
      if (found) spot = await findFreePlacementSpot(3);else break;
    }
    if (!spot) {
      await bot.chat("❌ Could not find a place to put a crafting table.");
      throw new Error("No placement spot");
    }
    await bot.chat(`Placing crafting table at ${spot}`);
    await placeItem(bot, "crafting_table", spot);
    // Move next to it
    await bot.pathfinder.goto(new GoalNear(spot.x, spot.y, spot.z, 1));
    await bot.chat("Crafting table placed and bot is nearby.");
  }
  await ensureCraftingTablePlaced();

  // 4️⃣ Craft the stone axe
  await bot.chat("Crafting stone axe...");
  await craftItem(bot, "stone_axe", 1);
  await bot.chat("Stone axe crafted.");

  // 5️⃣ Verify result
  if (bot.inventory.findInventoryItem(axeId)) {
    await bot.chat("✅ I now have a stone axe.");
  } else {
    await bot.chat("❌ Failed to craft the stone axe.");
  }
}