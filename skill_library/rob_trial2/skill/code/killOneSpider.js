// main function to kill one spider
async function killOneSpider(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- 1. Choose or craft a weapon ----------
  // Prefer swords, otherwise any pickaxe
  const weaponPriority = ['diamond_sword', 'netherite_sword', 'iron_sword', 'golden_sword', 'stone_sword', 'wooden_sword', 'diamond_pickaxe', 'netherite_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
  let weaponItem = null;
  for (const name of weaponPriority) {
    const info = mcData.itemsByName[name];
    const stack = bot.inventory.findInventoryItem(info.id);
    if (stack) {
      weaponItem = stack;
      break;
    }
  }

  // If we still have no weapon, craft a wooden sword (2 planks + 1 stick)
  if (!weaponItem) {
    const plankInfo = mcData.itemsByName.oak_planks;
    const stickInfo = mcData.itemsByName.stick;
    const plankStack = bot.inventory.findInventoryItem(plankInfo.id);
    const stickStack = bot.inventory.findInventoryItem(stickInfo.id);
    if (plankStack && plankStack.count >= 2 && stickStack && stickStack.count >= 1) {
      // Need a crafting table – we have one in inventory
      let tableBlock = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 32
      });
      if (!tableBlock) {
        const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
        if (!tableItem) {
          await bot.chat('❌ No crafting table to craft a sword.');
          return;
        }
        const placePos = bot.entity.position.offset(1, 0, 0);
        await bot.chat('Placing crafting table for sword...');
        await placeItem(bot, 'crafting_table', placePos);
        await bot.waitForTicks(5);
        tableBlock = bot.findBlock({
          matching: mcData.blocksByName.crafting_table.id,
          maxDistance: 32
        });
        if (!tableBlock) {
          await bot.chat('❌ Failed to place crafting table.');
          return;
        }
      }
      await bot.chat('Crafting a wooden sword...');
      await craftItem(bot, 'wooden_sword', 1);
      await bot.waitForTicks(5);
      weaponItem = bot.inventory.findInventoryItem(mcData.itemsByName.wooden_sword.id);
      if (!weaponItem) {
        await bot.chat('❌ Could not craft a wooden sword.');
        return;
      }
    } else {
      await bot.chat('❌ Not enough materials to craft a weapon.');
      return;
    }
  }

  // Equip the weapon
  await bot.equip(weaponItem, 'hand');
  await bot.chat(`Equipped ${weaponItem.name} for combat.`);

  // ---------- 2. Locate a spider ----------
  const findSpider = () => {
    return bot.nearestEntity(e => e.name === 'spider' && e.position.distanceTo(bot.entity.position) < 32);
  };
  let spider = findSpider();
  if (!spider) {
    // random exploration directions (horizontal only)
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];
    await bot.chat('Exploring for a spider...');
    spider = await exploreUntil(bot, randomDir, 60, () => findSpider());
    if (!spider) {
      await bot.chat('❌ No spider found after exploring.');
      return;
    }
  }

  // ---------- 3. Kill the spider ----------
  await bot.chat(`Spider located at ${spider.position}. Attacking...`);
  await killMob(bot, 'spider', 300);
  await bot.waitForTicks(10); // give a short pause for the combat to finish

  // ---------- 4. Verify ----------
  const remaining = findSpider();
  if (!remaining) {
    await bot.chat('✅ Successfully killed the spider!');
  } else {
    await bot.chat('❌ Spider still alive or another one appeared.');
  }
}