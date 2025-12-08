// main function to equip an iron chestplate (crafting if necessary)
async function equipIronChestplate(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const {
    Vec3
  } = require('vec3');

  // ----- helpers -------------------------------------------------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let v;
    do {
      v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (v.x === 0 && v.y === 0 && v.z === 0);
    return v;
  }
  async function findFreePlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const solidPos = botPos.offset(dx, dy, dz);
          const solidBlock = bot.blockAt(solidPos);
          if (!solidBlock || solidBlock.name === 'air') continue;
          const abovePos = solidPos.offset(0, 1, 0);
          const aboveBlock = bot.blockAt(abovePos);
          if (aboveBlock && aboveBlock.name === 'air') return abovePos;
        }
      }
    }
    return null;
  }
  // --------------------------------------------------------------

  // 1️⃣ Already equipped?
  const equipped = bot.inventory.slots.find(s => s && s.type === 'armor' && s.slot === 2 // slot 2 = chest armor
  );
  if (equipped && equipped.name === 'iron_chestplate') {
    await bot.chat('✅ Iron chestplate is already equipped.');
    return;
  }

  // 2️⃣ Chestplate in inventory?
  const chestplateId = mcData.itemsByName['iron_chestplate'].id;
  let chestplateItem = bot.inventory.findInventoryItem(chestplateId);
  if (chestplateItem) {
    await bot.equip(chestplateItem, 'torso');
    await bot.chat('✅ Iron chestplate equipped from inventory.');
    return;
  }

  // 3️⃣ Need to craft – ensure 8 iron ingots
  const ironIngotId = mcData.itemsByName['iron_ingot'].id;
  const rawIronId = mcData.itemsByName['raw_iron'].id;
  const oakPlankId = mcData.itemsByName['oak_planks'].id;
  const oakLogId = mcData.itemsByName['oak_log'].id;
  const neededIngot = 8;
  let ironCount = bot.inventory.count(ironIngotId);
  if (ironCount < neededIngot) {
    const needIngots = neededIngot - ironCount;
    await bot.chat(`🔨 Need ${needIngots} more iron ingot(s).`);

    // 3a) Ensure enough raw iron
    let rawIronCount = bot.inventory.count(rawIronId);
    const needRaw = needIngots - rawIronCount;
    if (needRaw > 0) {
      await bot.chat(`⛏️ Mining ${needRaw} iron ore block(s) for raw iron...`);
      let mined = 0;
      while (mined < needRaw) {
        let ore = bot.findBlock({
          matching: mcData.blocksByName['iron_ore'].id,
          maxDistance: 32
        });
        if (!ore) {
          await bot.chat('🚶‍♂️ Exploring for iron ore...');
          const found = await exploreUntil(bot, randomDirection(), 60, () => {
            const blk = bot.findBlock({
              matching: mcData.blocksByName['iron_ore'].id,
              maxDistance: 32
            });
            return blk ? true : null;
          });
          if (!found) {
            await bot.chat('❌ Could not locate iron ore after exploring.');
            return;
          }
          continue; // try again after exploration
        }
        await mineBlock(bot, 'iron_ore', 1);
        mined++;
      }
    }

    // 3b) Ensure a furnace is placed
    const furnaceBlockId = mcData.blocksByName['furnace'].id;
    let furnaceBlock = bot.findBlock({
      matching: furnaceBlockId,
      maxDistance: 32
    });
    if (!furnaceBlock) {
      await bot.chat('🪵 No furnace placed – placing one.');
      const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName['furnace'].id);
      if (!furnaceItem) {
        await bot.chat('❌ No furnace item in inventory.');
        return;
      }
      const placePos = await findFreePlacementSpot(3);
      if (!placePos) {
        await bot.chat('❌ Could not find a free spot for the furnace.');
        return;
      }
      await placeItem(bot, 'furnace', placePos);
      furnaceBlock = bot.blockAt(placePos);
      await bot.chat(`✅ Furnace placed at ${placePos}`);
    }

    // 3c) Ensure enough fuel (oak planks)
    let plankCount = bot.inventory.count(oakPlankId);
    if (plankCount < needIngots) {
      const missingPlanks = needIngots - plankCount;
      const logCount = bot.inventory.count(oakLogId);
      if (logCount > 0) {
        const logsNeeded = Math.ceil(missingPlanks / 4);
        await bot.chat(`🪵 Crafting ${logsNeeded} oak log(s) into planks...`);
        await craftItem(bot, 'oak_planks', logsNeeded);
        plankCount = bot.inventory.count(oakPlankId);
      }
    }

    // 3d) Smelt raw iron into ingots
    const toSmelt = neededIngot - ironCount;
    await bot.chat(`🔥 Smelting ${toSmelt} raw iron into ingots...`);
    for (let i = 0; i < toSmelt; i++) {
      await smeltItem(bot, 'raw_iron', 'oak_planks', 1);
    }
    ironCount = bot.inventory.count(ironIngotId);
    await bot.chat(`✅ Iron ingots now: ${ironCount}`);
  }

  // 4️⃣ Ensure a crafting table is placed
  const tableBlockId = mcData.blocksByName['crafting_table'].id;
  let tableBlock = bot.findBlock({
    matching: tableBlockId,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🪵 No crafting table nearby – placing one.');
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName['crafting_table'].id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return;
    }
    const placePos = await findFreePlacementSpot(3);
    if (!placePos) {
      await bot.chat('❌ Could not find a free spot for the crafting table.');
      return;
    }
    await placeItem(bot, 'crafting_table', placePos);
    tableBlock = bot.blockAt(placePos);
    await bot.chat(`✅ Crafting table placed at ${placePos}`);
  }

  // 5️⃣ Craft the iron chestplate
  await bot.chat('🛠️ Crafting iron chestplate...');
  try {
    await craftItem(bot, 'iron_chestplate', 1);
    await bot.chat('✅ Iron chestplate crafted.');
  } catch (err) {
    await bot.chat(`❌ Failed to craft iron chestplate: ${err.message}`);
    return;
  }

  // 6️⃣ Equip the chestplate
  chestplateItem = bot.inventory.findInventoryItem(chestplateId);
  if (!chestplateItem) {
    await bot.chat('❌ Chestplate not found after crafting.');
    return;
  }
  try {
    await bot.equip(chestplateItem, 'torso');
    await bot.chat('🛡️ Iron chestplate equipped successfully!');
  } catch (err) {
    await bot.chat(`❌ Could not equip chestplate: ${err.message}`);
  }
}