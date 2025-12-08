// main function: ensure the bot has at least one lightning rod
async function ensureLightningRod(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  // Random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let v;
    do {
      v = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (v.x === 0 && v.y === 0 && v.z === 0);
    return v;
  }

  // Find an air block directly above a solid block within a radius
  async function findFreePlacementSpot(radius = 3) {
    const botPos = bot.entity.position.floored();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -1; dy <= radius; dy++) {
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

  // ---------- step 1: already have a lightning rod? ----------
  const rodId = mcData.itemsByName['lightning_rod'].id;
  if (bot.inventory.findInventoryItem(rodId)) {
    await bot.chat('✅ I already have a lightning rod.');
    return;
  }

  // ---------- step 2: obtain at least 3 copper ingots ----------
  const copperIngotId = mcData.itemsByName['copper_ingot'].id;
  const rawCopperId = mcData.itemsByName['raw_copper'].id;
  const coalId = mcData.itemsByName['coal'].id;
  const neededIngot = 3;
  while (bot.inventory.count(copperIngotId) < neededIngot) {
    // locate copper ore
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName['copper_ore'].id,
      maxDistance: 32
    });

    // explore if none found
    if (!oreBlock) {
      await bot.chat('🔎 No copper ore nearby, exploring...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName['copper_ore'].id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not locate copper ore after exploring.');
        return;
      }
      oreBlock = bot.findBlock({
        matching: mcData.blocksByName['copper_ore'].id,
        maxDistance: 32
      });
    }

    // mine the ore (one block per loop is enough)
    await bot.chat('⛏️ Mining copper ore...');
    await mineBlock(bot, 'copper_ore', 1);

    // ensure we have coal for smelting
    if (!bot.inventory.findInventoryItem(coalId)) {
      await bot.chat('❌ No coal left for smelting.');
      return;
    }

    // smelt raw copper into an ingot
    await bot.chat('🔥 Smelting raw copper...');
    await smeltItem(bot, 'raw_copper', 'coal', 1);
    await bot.chat(`📦 Copper ingots: ${bot.inventory.count(copperIngotId)}/${neededIngot}`);
  }

  // ---------- step 3: ensure a placed crafting table ----------
  const tableBlockId = mcData.blocksByName['crafting_table'].id;
  let tableBlock = bot.findBlock({
    matching: tableBlockId,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🪵 No crafting table nearby, placing one.');

    // need a crafting table item
    const tableItemId = mcData.itemsByName['crafting_table'].id;
    const tableItem = bot.inventory.findInventoryItem(tableItemId);
    if (!tableItem) {
      await bot.chat('❌ I do not have a crafting table item to place.');
      return;
    }

    // find a free spot (or explore for one)
    let spot = await findFreePlacementSpot(3);
    if (!spot) {
      await bot.chat('🔍 Exploring for a free spot to place the table...');
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const p = findFreePlacementSpot(3);
        return p ? true : null;
      });
      if (!found) {
        await bot.chat('❌ Could not find a suitable spot for the crafting table.');
        return;
      }
      spot = await findFreePlacementSpot(3);
    }
    await placeItem(bot, 'crafting_table', spot);
    await bot.chat(`✅ Placed crafting table at ${spot}`);
    tableBlock = bot.blockAt(spot);
  } else {
    await bot.chat(`✅ Found existing crafting table at ${tableBlock.position}`);
  }

  // move next to the table (within 1 block) so we can open the UI
  await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

  // ---------- step 4: craft the lightning rod ----------
  await bot.chat('🛠️ Crafting lightning rod...');
  try {
    await craftItem(bot, 'lightning_rod', 1);
    await bot.chat('✅ Lightning rod crafted!');
  } catch (err) {
    await bot.chat(`❌ Failed to craft lightning rod: ${err.message}`);
    return;
  }

  // ---------- step 5: final verification ----------
  if (bot.inventory.findInventoryItem(rodId)) {
    await bot.chat('🪄 I now have a lightning rod in my inventory.');
  } else {
    await bot.chat('⚠️ Something went wrong – lightning rod not found.');
  }
}