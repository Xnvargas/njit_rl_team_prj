// main function to craft one iron boot pair
async function craftIronBoots(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- 1. Ensure we have at least 4 iron ingots ----------
  const ironIngotId = mcData.itemsByName["iron_ingot"].id;
  let ironCount = bot.inventory.count(ironIngotId);
  if (ironCount < 4) {
    await bot.chat(`I only have ${ironCount} iron ingot(s). Smelting raw iron...`);
    // smelt raw_iron one by one until we have 4 ingots
    while (ironCount < 4) {
      const rawIronId = mcData.itemsByName["raw_iron"].id;
      const coalId = mcData.itemsByName["coal"].id;

      // check we have raw iron and coal
      if (!bot.inventory.findInventoryItem(rawIronId) || !bot.inventory.findInventoryItem(coalId)) {
        await bot.chat("❌ Not enough raw iron or coal to smelt more ingots.");
        return;
      }
      await smeltItem(bot, "raw_iron", "coal", 1);
      ironCount = bot.inventory.count(ironIngotId);
      await bot.chat(`Smelted 1 iron ingot. Total now: ${ironCount}`);
    }
  } else {
    await bot.chat(`I have ${ironCount} iron ingots – enough for boots.`);
  }

  // ---------- 2. Ensure a placed crafting table ----------
  const tableBlockId = mcData.blocksByName["crafting_table"].id;
  let tableBlock = bot.findBlock({
    matching: tableBlockId,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat("No placed crafting table nearby – will place one.");

    // make sure we have a crafting table item
    const tableItemId = mcData.itemsByName["crafting_table"].id;
    const tableItem = bot.inventory.findInventoryItem(tableItemId);
    if (!tableItem) {
      await bot.chat("❌ I don't have a crafting table item to place.");
      return;
    }

    // find a free air block directly above a solid block within 3 blocks radius
    const botPos = bot.entity.position.floored();
    let placePos = null;
    for (let dx = -2; dx <= 2 && !placePos; dx++) {
      for (let dy = -1; dy <= 2 && !placePos; dy++) {
        for (let dz = -2; dz <= 2 && !placePos; dz++) {
          const solidPos = botPos.offset(dx, dy, dz);
          const solidBlock = bot.blockAt(solidPos);
          if (!solidBlock || solidBlock.name === "air") continue; // need solid ground
          const abovePos = solidPos.offset(0, 1, 0);
          const aboveBlock = bot.blockAt(abovePos);
          if (aboveBlock && aboveBlock.name === "air") {
            placePos = abovePos;
          }
        }
      }
    }

    // if still not found, explore a bit and try again
    if (!placePos) {
      await bot.chat("Exploring for a suitable spot to place the crafting table...");
      const randomDirection = () => {
        const choices = [-1, 0, 1];
        let v;
        do {
          v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
        } while (v.x === 0 && v.y === 0 && v.z === 0);
        return v;
      };
      await exploreUntil(bot, randomDirection(), 60, () => {
        const p = (() => {
          const botPos2 = bot.entity.position.floored();
          for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -1; dy <= 2; dy++) {
              for (let dz = -2; dz <= 2; dz++) {
                const solidPos = botPos2.offset(dx, dy, dz);
                const solidBlock = bot.blockAt(solidPos);
                if (!solidBlock || solidBlock.name === "air") continue;
                const abovePos = solidPos.offset(0, 1, 0);
                const aboveBlock = bot.blockAt(abovePos);
                if (aboveBlock && aboveBlock.name === "air") return abovePos;
              }
            }
          }
          return null;
        })();
        return p ? true : null;
      });
      // try to locate again after exploration
      const botPos2 = bot.entity.position.floored();
      outer: for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -1; dy <= 2; dy++) {
          for (let dz = -2; dz <= 2; dz++) {
            const solidPos = botPos2.offset(dx, dy, dz);
            const solidBlock = bot.blockAt(solidPos);
            if (!solidBlock || solidBlock.name === "air") continue;
            const abovePos = solidPos.offset(0, 1, 0);
            const aboveBlock = bot.blockAt(abovePos);
            if (aboveBlock && aboveBlock.name === "air") {
              placePos = abovePos;
              break outer;
            }
          }
        }
      }
    }
    if (!placePos) {
      await bot.chat("❌ Could not find a free spot to place a crafting table.");
      return;
    }
    await placeItem(bot, "crafting_table", placePos);
    await bot.chat(`Placed crafting table at ${placePos}`);
    // update reference
    tableBlock = bot.blockAt(placePos);
  } else {
    await bot.chat(`Found a placed crafting table at ${tableBlock.position}`);
  }

  // move next to the table (within 1 block) – ensures the crafting UI can be opened
  await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

  // ---------- 3. Craft the iron boots ----------
  await bot.chat("Crafting iron boots...");
  try {
    await craftItem(bot, "iron_boots", 1);
    await bot.chat("✅ Iron boots crafted!");
  } catch (err) {
    await bot.chat(`❌ Failed to craft iron boots: ${err.message}`);
    return;
  }

  // ---------- 4. Verify ----------
  const bootsId = mcData.itemsByName["iron_boots"].id;
  const boots = bot.inventory.findInventoryItem(bootsId);
  if (boots) {
    await bot.chat("🛡️ Iron boots are now in my inventory.");
  } else {
    await bot.chat("⚠️ Something went wrong – boots not found in inventory.");
  }
}