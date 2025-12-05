// main function to eat one cooked porkchop
async function eatOneCookedPorkchop(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // Helper to count items in inventory
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // 1️⃣ Find cooked porkchop in inventory
  const porkId = mcData.itemsByName.cooked_porkchop?.id;
  if (!porkId) {
    bot.chat('❌ No cooked porkchop item defined in this version.');
    return;
  }
  let porkItem = bot.inventory.findInventoryItem(porkId);
  // 2️⃣ If not in inventory, try to get it from the nearest chest
  if (!porkItem) {
    bot.chat('🔎 No cooked porkchop in inventory, searching nearby chests...');
    const chestBlock = bot.findBlock({
      matching: mcData.blocksByName.chest.id,
      maxDistance: 32
    });
    if (!chestBlock) {
      bot.chat('❌ No chest nearby to withdraw a cooked porkchop.');
      return;
    }
    // Open chest, withdraw one porkchop, then close
    const chest = await bot.openContainer(chestBlock);
    const chestItem = chest.findContainerItem(porkId);
    if (!chestItem) {
      await chest.close();
      bot.chat('❌ Chest does not contain a cooked porkchop.');
      return;
    }
    await chest.withdraw(chestItem.type, null, 1);
    await chest.close();
    // Refresh reference after withdrawal
    porkItem = bot.inventory.findInventoryItem(porkId);
    if (!porkItem) {
      bot.chat('❌ Failed to retrieve cooked porkchop from chest.');
      return;
    }
    bot.chat('✅ Retrieved cooked porkchop from chest.');
  }

  // 3️⃣ Equip the porkchop to the hand
  try {
    await bot.equip(porkItem, 'hand');
  } catch (err) {
    bot.chat(`❌ Could not equip cooked porkchop: ${err.message}`);
    return;
  }

  // 4️⃣ Eat it
  try {
    await bot.consume();
    bot.chat(`🍖 Ate a cooked porkchop. Hunger is now ${bot.food}/20.`);
  } catch (err) {
    bot.chat(`❌ Failed to eat cooked porkchop: ${err.message}`);
  }
}