// Main function to equip an iron chestplate
async function equipIronChestplate(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const ironChestplateInfo = mcData.itemsByName.iron_chestplate;

  // Helper to send a chat message
  const say = msg => bot.chat(msg);

  // 1. Look for iron chestplate in inventory
  let chestplateItem = bot.inventory.findInventoryItem(ironChestplateInfo.id);
  if (!chestplateItem) {
    // Optional: try to get it from the nearest chest (fallback)
    say('Iron chestplate not in inventory, searching nearby chest...');
    // Find the closest chest block within 32 blocks
    const chestBlock = bot.findBlock({
      matching: mcData.blocksByName.chest.id,
      maxDistance: 32
    });
    if (!chestBlock) {
      say('❌ No chest found nearby to retrieve iron chestplate.');
      return;
    }

    // Move to the chest and open it
    await bot.pathfinder.goto(new GoalLookAtBlock(chestBlock.position, bot.world));
    const chest = await bot.openContainer(chestBlock);
    const stack = chest.findContainerItem(ironChestplateInfo.id);
    if (!stack) {
      await chest.close();
      say('❌ Chest does not contain an iron chestplate.');
      return;
    }

    // Withdraw one chestplate
    await chest.withdraw(stack.type, null, 1);
    await chest.close();
    // Refresh reference after withdrawal
    chestplateItem = bot.inventory.findInventoryItem(ironChestplateInfo.id);
    if (!chestplateItem) {
      say('❌ Failed to retrieve iron chestplate from chest.');
      return;
    }
    say('✅ Retrieved iron chestplate from chest.');
  }

  // 2. Equip the chestplate
  try {
    await bot.equip(chestplateItem, 'torso');
    say('✅ Iron chestplate equipped!');
  } catch (err) {
    say(`❌ Failed to equip iron chestplate: ${err.message}`);
  }
}