// Main function: mine enough iron ore and smelt to have at least 8 iron ingots
async function mineEightIronIngot(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const Vec3 = require('vec3').Vec3;

  // ----- helper: random direction vector (components -1,0,1, not all zero) -----
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // ----- helper: find a free air block directly above a solid block -----
  async function findPlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const solidPos = botPos.offset(dx, dy, dz);
          const solidBlock = bot.blockAt(solidPos);
          if (!solidBlock || solidBlock.name === 'air') continue; // need solid ground
          const abovePos = solidPos.offset(0, 1, 0);
          const aboveBlock = bot.blockAt(abovePos);
          if (aboveBlock && aboveBlock.name === 'air') return abovePos;
        }
      }
    }
    return null;
  }

  // ----- 1️⃣ check current iron ingots -----
  const ironIngotId = mcData.itemsByName.iron_ingot.id;
  let ironIngots = bot.inventory.count(ironIngotId);
  if (ironIngots >= 8) {
    await bot.chat(`✅ I already have ${ironIngots} iron ingots. Task complete.`);
    return;
  }
  await bot.chat(`🔎 I have ${ironIngots} iron ingots, need ${8 - ironIngots} more.`);

  // ----- 2️⃣ ensure a pickaxe that can mine iron ore (stone or better) -----
  const pickaxeNames = ['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'];
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
    await bot.chat('❌ No suitable pickaxe found. Cannot mine iron ore.');
    return;
  }
  await bot.equip(pickaxeItem, 'hand');
  await bot.chat(`Equipped ${pickaxeItem.name} for mining.`);

  // ----- 3️⃣ ensure a furnace block is placed -----
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    await bot.chat('No furnace found, placing one...');
    // need a furnace item in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      await bot.chat('❌ No furnace item in inventory to place.');
      return;
    }
    // find a free spot
    let placePos = await findPlacementSpot(3);
    while (!placePos) {
      await bot.chat('Exploring for a free spot to place furnace...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findPlacementSpot(3);
        return p ? true : null;
      });
      if (found) placePos = await findPlacementSpot(3);else break;
    }
    if (!placePos) {
      await bot.chat('❌ Could not locate a suitable placement spot for the furnace.');
      return;
    }
    await placeItem(bot, 'furnace', placePos);
    furnaceBlock = bot.blockAt(placePos);
    await bot.chat(`Furnace placed at ${placePos}.`);
  } else {
    await bot.chat(`Found existing furnace at ${furnaceBlock.position}.`);
  }

  // ----- 4️⃣ mine needed iron ore -----
  const neededIngots = 8 - ironIngots;
  // each iron ore gives 1 raw_iron, which smelts to 1 iron_ingot
  const neededOre = neededIngots;
  await bot.chat(`Mining ${neededOre} iron ore block(s)...`);

  // try to find ore nearby first
  let oreBlock = bot.findBlock({
    matching: mcData.blocksByName.iron_ore.id,
    maxDistance: 32
  });
  if (!oreBlock) {
    await bot.chat('Iron ore not nearby, exploring...');
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      });
      return blk ? true : null;
    });
    if (!found) {
      await bot.chat('❌ Could not locate any iron ore.');
      return;
    }
    oreBlock = bot.findBlock({
      matching: mcData.blocksByName.iron_ore.id,
      maxDistance: 32
    });
  }

  // Mine the required amount (mineBlock will stop early if not enough blocks)
  await mineBlock(bot, 'iron_ore', neededOre);
  await bot.chat(`Finished mining iron ore.`);

  // ----- 5️⃣ smelt the raw iron -----
  // ensure we have enough fuel (coal); one coal smelts 8 items, we need at most neededIngots
  const coalId = mcData.itemsByName.coal.id;
  const coalCount = bot.inventory.count(coalId);
  if (coalCount === 0) {
    await bot.chat('❌ No coal for fuel. Cannot smelt.');
    return;
  }
  await bot.chat(`Smelting ${neededOre} raw iron using coal...`);
  await smeltItem(bot, 'raw_iron', 'coal', neededOre);
  await bot.chat('Smelting complete.');

  // ----- 6️⃣ final report -----
  ironIngots = bot.inventory.count(ironIngotId);
  if (ironIngots >= 8) {
    await bot.chat(`✅ Success! I now have ${ironIngots} iron ingots.`);
  } else {
    await bot.chat(`❌ Finished but only have ${ironIngots} iron ingots.`);
  }
}