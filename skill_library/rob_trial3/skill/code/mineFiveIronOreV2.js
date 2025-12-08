// main function to mine at least 5 iron ore (raw iron)
async function mineFiveIronOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- 1. equip a suitable pickaxe ----------
  const pickaxeNames = ["diamond_pickaxe", "netherite_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
  let pickaxeItem = null;
  for (const name of pickaxeNames) {
    const id = mcData.itemsByName[name].id;
    const it = bot.inventory.findInventoryItem(id);
    if (it) {
      pickaxeItem = it;
      break;
    }
  }
  if (!pickaxeItem) {
    await bot.chat("❌ No pickaxe found in inventory – cannot mine iron.");
    return;
  }
  await bot.equip(pickaxeItem, "hand");
  await bot.chat(`Equipped ${pickaxeItem.name} for mining.`);

  // ---------- helper to count raw iron ----------
  const rawIronId = mcData.itemsByName["raw_iron"] ? mcData.itemsByName["raw_iron"].id : null; // older versions drop iron_ore directly (treated as block, not item)
  const getRawIronCount = () => rawIronId ? bot.inventory.count(rawIronId) : 0;

  // ---------- 2‑4. locate and mine until we have 5 raw iron ----------
  const neededTotal = 5;
  while (getRawIronCount() < neededTotal) {
    const stillNeeded = neededTotal - getRawIronCount();
    // try to find ore nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName["iron_ore"].id,
      maxDistance: 32
    });

    // if not found, explore randomly until we see one (max 60 s per attempt)
    if (!oreBlock) {
      await bot.chat("No iron ore nearby – exploring...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName["iron_ore"].id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Exploration failed to locate iron ore.");
        return;
      }
      oreBlock = bot.findBlock({
        matching: mcData.blocksByName["iron_ore"].id,
        maxDistance: 32
      });
    }

    // move close enough to the ore (within 2 blocks) before mining
    await bot.pathfinder.goto(new GoalNear(oreBlock.position.x, oreBlock.position.y, oreBlock.position.z, 2));

    // mine the required amount (may mine more if multiple ores are close)
    await bot.chat(`Mining up to ${stillNeeded} iron ore block(s)...`);
    await mineBlock(bot, "iron_ore", stillNeeded);

    // short pause to let the inventory update
    await bot.waitForTicks(10);
  }

  // ---------- 5. final report ----------
  const finalCount = getRawIronCount();
  await bot.chat(`✅ Finished mining. Collected ${finalCount} raw iron (need ${neededTotal}).`);
}

// ---------- random direction helper (components -1,0,1, not all zero) ----------

// ---------- random direction helper (components -1,0,1, not all zero) ----------
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}