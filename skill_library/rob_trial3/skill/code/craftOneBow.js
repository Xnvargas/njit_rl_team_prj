// main function to craft a single bow
async function craftOneBow(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // 1️⃣ Check if we already have a bow
  const bowId = mcData.itemsByName["bow"].id;
  if (bot.inventory.findInventoryItem(bowId)) {
    await bot.chat("✅ I already have a bow.");
    return;
  }

  // 2️⃣ Verify we have enough sticks and strings
  const stickId = mcData.itemsByName["stick"].id;
  const stringId = mcData.itemsByName["string"].id;
  const neededSticks = 3;
  const neededStrings = 3;
  const haveSticks = bot.inventory.count(stickId);
  const haveStrings = bot.inventory.count(stringId);
  if (haveSticks < neededSticks || haveStrings < neededStrings) {
    await bot.chat(`❌ Missing materials: ${neededSticks - haveSticks} stick(s), ${neededStrings - haveStrings} string(s).`);
    return;
  }

  // 3️⃣ Find an already placed crafting table
  const tableBlockId = mcData.blocksByName["crafting_table"].id;
  let tableBlock = bot.findBlock({
    matching: tableBlockId,
    maxDistance: 32
  });

  // 4️⃣ If none, place one
  if (!tableBlock) {
    await bot.chat("🔨 No crafting table placed nearby – placing one.");

    // Ensure we have a crafting table item
    const tableItemId = mcData.itemsByName["crafting_table"].id;
    const tableItem = bot.inventory.findInventoryItem(tableItemId);
    if (!tableItem) {
      await bot.chat("❌ I don't have a crafting table item to place.");
      return;
    }

    // Helper: find a free air block directly above a solid block within a radius
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
    let placePos = await findFreePlacementSpot();
    if (!placePos) {
      await bot.chat("⚠️ Could not find a free spot nearby, exploring for one.");
      const found = await exploreUntil(bot, new Vec3(1, 0, 1), 60, () => {
        const p = findFreePlacementSpot();
        return p ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Failed to locate a placement spot for the crafting table.");
        return;
      }
      placePos = await findFreePlacementSpot();
    }
    await placeItem(bot, "crafting_table", placePos);
    tableBlock = bot.blockAt(placePos);
    await bot.chat(`✅ Placed crafting table at ${placePos}`);
  } else {
    await bot.chat(`✅ Found placed crafting table at ${tableBlock.position}`);
  }

  // 5️⃣ Move next to the crafting table
  await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

  // 6️⃣ Craft the bow
  await bot.chat("🛠️ Crafting a bow...");
  try {
    await craftItem(bot, "bow", 1);
    await bot.chat("✅ Bow crafted successfully!");
  } catch (err) {
    await bot.chat(`❌ Failed to craft bow: ${err.message}`);
    return;
  }

  // 7️⃣ Final verification
  if (bot.inventory.findInventoryItem(bowId)) {
    await bot.chat("✅ I now have a bow in my inventory.");
  } else {
    await bot.chat("❌ Bow not found after crafting.");
  }
}