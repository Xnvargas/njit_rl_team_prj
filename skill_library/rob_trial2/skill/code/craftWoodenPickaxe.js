// main function: craft one wooden pickaxe using a crafting table
async function craftWoodenPickaxe(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const inv = bot.inventory.findInventoryItem(info.id);
    return inv ? inv.count : 0;
  };

  // Find a solid block (not air, not leaves) within 32 blocks
  const findSolidBlock = () => {
    return bot.findBlock({
      matching: block => {
        if (!block) return false;
        // ignore air and leaves
        if (block.name === 'air') return false;
        if (block.name.includes('leaves')) return false;
        // solid blocks have a boundingBox of "block"
        return block.boundingBox === 'block';
      },
      maxDistance: 32
    });
  };

  // ---------- 1. ensure a crafting table is placed ----------
  // we already have a crafting_table item in inventory (see critique)
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('Placing a crafting table...');
    // find a solid reference block
    const refBlock = findSolidBlock();
    if (!refBlock) {
      await bot.chat('❌ No suitable block found to place the crafting table.');
      return;
    }
    // choose an adjacent air position (simple +1 on X)
    const placePos = refBlock.position.offset(1, 0, 0);
    // make sure the target position is air
    const targetBlock = bot.blockAt(placePos);
    if (targetBlock && targetBlock.name !== 'air') {
      // try a different offset if occupied
      const alternatives = [new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      let placed = false;
      for (const off of alternatives) {
        const pos = refBlock.position.offset(off.x, off.y, off.z);
        const blk = bot.blockAt(pos);
        if (blk && blk.name === 'air') {
          await placeItem(bot, 'crafting_table', pos);
          placed = true;
          break;
        }
      }
      if (!placed) {
        await bot.chat('❌ Could not find a free spot next to the reference block.');
        return;
      }
    } else {
      await placeItem(bot, 'crafting_table', placePos);
    }
    await bot.waitForTicks(5); // let the block appear
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Failed to place the crafting table.');
      return;
    }
    await bot.chat('✅ Crafting table placed.');
  } else {
    await bot.chat('✅ Crafting table already present.');
  }

  // ---------- 2. ensure we have at least 3 oak planks ----------
  const neededPlanks = 3;
  if (countItem('oak_planks') < neededPlanks) {
    const missingPlanks = neededPlanks - countItem('oak_planks');
    const logsNeeded = Math.ceil(missingPlanks / 4);
    await bot.chat(`Mining ${logsNeeded} oak log(s) to obtain planks...`);
    await mineBlock(bot, 'oak_log', logsNeeded);
    await bot.waitForTicks(5);

    // craft the missing planks (requires the table we just placed)
    const planksToCraft = Math.ceil(missingPlanks / 4);
    await bot.chat(`Crafting ${planksToCraft * 4} oak planks...`);
    await craftItem(bot, 'oak_planks', planksToCraft);
    await bot.waitForTicks(5);
  }

  // ---------- 3. ensure we have at least 2 sticks ----------
  const neededSticks = 2;
  if (countItem('stick') < neededSticks) {
    await bot.chat('Crafting sticks...');
    // one recipe gives 4 sticks
    await craftItem(bot, 'stick', 1);
    await bot.waitForTicks(5);
  }

  // ---------- 4. craft the wooden pickaxe ----------
  await bot.chat('Crafting a wooden pickaxe...');
  await craftItem(bot, 'wooden_pickaxe', 1);
  await bot.waitForTicks(5);

  // ---------- 5. final verification ----------
  if (countItem('wooden_pickaxe') >= 1) {
    await bot.chat('✅ Successfully crafted a wooden pickaxe!');
  } else {
    await bot.chat('❌ Crafting failed – wooden pickaxe not found in inventory.');
  }
}