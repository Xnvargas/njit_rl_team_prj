// main function: craft a single bow, placing a crafting table if needed
async function craftBow(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper: count items in inventory -----
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ----- helper: find any solid block (not air, not leaves) -----
  const findSolidBlock = () => {
    return bot.findBlock({
      matching: b => b && b.boundingBox === 'block' && b.name !== 'air',
      maxDistance: 32
    });
  };

  // ----- 1. Material check -----
  const neededSticks = 3;
  const neededStrings = 3;
  if (countItem('stick') < neededSticks) {
    await bot.chat(`❌ Not enough sticks (need ${neededSticks}, have ${countItem('stick')}).`);
    return;
  }
  if (countItem('string') < neededStrings) {
    await bot.chat(`❌ Not enough strings (need ${neededStrings}, have ${countItem('string')}).`);
    return;
  }
  await bot.chat('✅ Materials check passed (sticks & strings).');

  // ----- 2. Ensure a crafting table is placed -----
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    await bot.chat('🛠️ No crafting table nearby – attempting to place one...');
    // we must have a crafting table item in inventory
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat('❌ No crafting table item in inventory.');
      return;
    }

    // try up to three different positions (move a bit if needed)
    const maxPlacementAttempts = 3;
    let placed = false;
    for (let attempt = 0; attempt < maxPlacementAttempts && !placed; attempt++) {
      // find a solid reference block near us
      const reference = findSolidBlock();
      if (!reference) {
        await bot.chat('❌ Could not find a solid block to anchor the table.');
        return;
      }

      // all six possible neighbour offsets
      const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      for (const off of offsets) {
        const targetPos = reference.position.offset(off.x, off.y, off.z);
        const targetBlock = bot.blockAt(targetPos);
        if (targetBlock && targetBlock.name === 'air') {
          await bot.chat(`📍 Placing crafting table at ${targetPos}`);
          await placeItem(bot, 'crafting_table', targetPos);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // move a short random distance and try again
        const dirs = [new Vec3(5, 0, 0), new Vec3(-5, 0, 0), new Vec3(0, 0, 5), new Vec3(0, 0, -5)];
        const randDir = dirs[Math.floor(Math.random() * dirs.length)];
        const newPos = bot.entity.position.plus(randDir);
        await bot.chat('🚶‍♂️ Exploring a bit to find space for the table...');
        await bot.pathfinder.goto(new GoalNear(newPos.x, newPos.y, newPos.z, 2));
        await bot.waitForTicks(10);
      }
    }
    if (!placed) {
      await bot.chat('❌ Failed to find a free spot to place the crafting table.');
      return;
    }

    // give the world a moment to register the new block
    await bot.waitForTicks(5);
    tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat('❌ Unexpected: crafting table still not detected.');
      return;
    }
    await bot.chat('✅ Crafting table placed successfully.');
  } else {
    await bot.chat('✅ Crafting table already present.');
  }

  // ----- 3. Craft the bow -----
  await bot.chat('🪓 Crafting a bow...');
  await craftItem(bot, 'bow', 1);
  await bot.waitForTicks(5); // let inventory update

  // ----- 4. Verify result -----
  if (countItem('bow') >= 1) {
    await bot.chat('✅ Bow successfully crafted! You can now use it (don’t forget arrows).');
  } else {
    await bot.chat('❌ Crafting failed – bow not found in inventory.');
  }
}